const OWNER = 'vip01live';
const REPO = 'matchpro';
const REPO_PATH = '/repos/' + OWNER + '/' + REPO;
const SESSION_TTL_SECONDS = 1800;
const PASSWORD_ITERATIONS = 310000;
const MAX_AUDIT_EVENTS = 1000;
const MAX_MODERATORS = 100;
const encoder = new TextEncoder();
const failedLogins = new Map();
const DUMMY_SALT = 'bWF0Y2hwcm8tZHVtbXktc2FsdA==';
const DUMMY_HASH = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';

function fromB64(value) {
  const binary = atob(String(value || ''));
  const result = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) result[i] = binary.charCodeAt(i);
  return result;
}
function toB64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
function toB64Url(bytes) {
  return toB64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function fromB64Url(value) {
  let valuePadded = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  while (valuePadded.length % 4) valuePadded += '=';
  return fromB64(valuePadded);
}
function sameBytes(a, b) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a[i] ^ b[i];
  return mismatch === 0;
}
function responseHeaders(request, env, headers) {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigin = String(env.ALLOWED_ORIGIN || '').replace(/\/+$/, '');
  if (origin && origin === allowedOrigin) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept, X-GitHub-Api-Version');
    headers.set('Access-Control-Max-Age', '600');
    headers.set('Vary', 'Origin');
  }
  headers.set('Cache-Control', 'no-store');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'no-referrer');
  headers.set('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
  return headers;
}
function json(request, env, value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: responseHeaders(request, env, new Headers({ 'Content-Type': 'application/json; charset=utf-8' }))
  });
}
function originAllowed(request, env) {
  const origin = request.headers.get('Origin') || '';
  const expected = String(env.ALLOWED_ORIGIN || '').replace(/\/+$/, '');
  if (!expected || origin !== expected) return false;
  // CORS preflight requests may omit Referer; the authenticated follow-up must include it.
  if (request.method === 'OPTIONS') return true;
  const refererPrefix = String(env.ALLOWED_REFERER_PREFIX || '');
  const referer = request.headers.get('Referer') || '';
  return !!refererPrefix && !!referer && referer.startsWith(refererPrefix);
}
function ipOf(request) { return request.headers.get('CF-Connecting-IP') || 'unknown'; }
function isBlocked(ip) { const item = failedLogins.get(ip); return !!(item && item.until > Date.now()); }
function failedAttempt(ip) {
  const now = Date.now(), item = failedLogins.get(ip) || { count: 0, updated: now, until: 0 };
  if (now - item.updated > 15 * 60 * 1000) { item.count = 0; item.until = 0; }
  item.count++; item.updated = now; if (item.count >= 5) item.until = now + 15 * 60 * 1000;
  if (failedLogins.size > 1000) for (const [key, value] of failedLogins) if (now - value.updated > 30 * 60 * 1000) failedLogins.delete(key);
  failedLogins.set(ip, item); return item.until > now;
}
async function passwordMatches(password, saltValue, hashValue) {
  const salt = fromB64(saltValue), expected = fromB64(hashValue);
  if (salt.length < 16 || expected.length !== 32) return false;
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const result = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: PASSWORD_ITERATIONS, hash: 'SHA-256' }, material, 256);
  return sameBytes(new Uint8Array(result), expected);
}
async function passwordRecord(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const result = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: PASSWORD_ITERATIONS, hash: 'SHA-256' }, material, 256);
  return { passwordSalt: toB64(salt), passwordHash: toB64(new Uint8Array(result)) };
}
async function signingKey(env) {
  const secret = String(env.SESSION_SECRET || '');
  if (secret.length < 32) throw new Error('SESSION_SECRET missing or too short');
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
async function createSession(user, env) {
  const audience = String(env.ALLOWED_ORIGIN || '').replace(/\/+$/, '');
  const claims = {
    sub: user.username,
    role: user.role,
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    jti: crypto.randomUUID()
  };
  if (user.role === 'moderator') {
    claims.id = user.id;
    claims.ver = user.sessionVersion;
  }
  const body = toB64Url(encoder.encode(JSON.stringify(claims)));
  const signature = await crypto.subtle.sign('HMAC', await signingKey(env), encoder.encode(body));
  return body + '.' + toB64Url(new Uint8Array(signature));
}
function accountStub(env) {
  if (!env.ACCOUNT_STORE) throw new Error('ACCOUNT_STORE binding is not configured');
  return env.ACCOUNT_STORE.get(env.ACCOUNT_STORE.idFromName('matchpro-admin-accounts'));
}
async function accountRequest(env, path, method = 'GET', body) {
  const headers = new Headers({ Accept: 'application/json' });
  const init = { method, headers };
  if (body !== undefined) { headers.set('Content-Type', 'application/json'); init.body = JSON.stringify(body); }
  const response = await accountStub(env).fetch(new Request('https://account-store.internal' + path, init));
  let data = {};
  try { data = await response.json(); } catch (_) {}
  if (!response.ok) {
    const error = new Error(data.message || 'Account store request failed');
    error.status = response.status;
    throw error;
  }
  return data;
}
async function readSession(request, env) {
  const match = (request.headers.get('Authorization') || '').match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const parts = match[1].split('.');
  if (parts.length !== 2) return null;
  try {
    const valid = await crypto.subtle.verify('HMAC', await signingKey(env), fromB64Url(parts[1]), encoder.encode(parts[0]));
    if (!valid) return null;
    const claim = JSON.parse(new TextDecoder().decode(fromB64Url(parts[0])));
    if (!claim || claim.aud !== String(env.ALLOWED_ORIGIN || '').replace(/\/+$/, '') ||
        !Number.isFinite(claim.exp) || claim.exp <= Math.floor(Date.now() / 1000)) return null;
    if (claim.role === 'owner') {
      return claim.sub === String(env.ADMIN_USERNAME || '').trim().toLowerCase() ? claim : null;
    }
    if (claim.role !== 'moderator' || !claim.id || !Number.isInteger(claim.ver)) return null;
    const result = await accountRequest(env, '/moderators/' + encodeURIComponent(claim.id));
    const account = result.moderator;
    if (!account || !account.active || account.sessionVersion !== claim.ver || account.username !== claim.sub) return null;
    return claim;
  } catch (_) { return null; }
}
function githubAllowed(method, path) {
  if (method === 'GET' && path === REPO_PATH) return true;
  if (method === 'GET' && path.startsWith(REPO_PATH + '/contents/')) return true;
  if (method === 'GET' && path === REPO_PATH + '/git/ref/heads/main') return true;
  if (method === 'GET' && /^\/repos\/vip01live\/matchpro\/git\/commits\/[0-9a-f]{40}$/i.test(path)) return true;
  if (method === 'POST' && [REPO_PATH + '/git/blobs', REPO_PATH + '/git/trees', REPO_PATH + '/git/commits'].includes(path)) return true;
  if (method === 'PATCH' && path === REPO_PATH + '/git/refs/heads/main') return true;
  return false;
}
function ready(env) {
  return !!(env.ADMIN_USERNAME && env.ADMIN_PASSWORD_SALT && env.ADMIN_PASSWORD_HASH && env.GITHUB_TOKEN &&
    env.SESSION_SECRET && String(env.SESSION_SECRET).length >= 32 && env.ACCOUNT_STORE);
}
function validUsername(value) { return /^[a-z0-9][a-z0-9._-]{2,31}$/.test(value); }
function validDisplayName(value) { return value.length >= 1 && value.length <= 80 && !/[\r\n\u0000-\u001f]/.test(value); }
async function requestBody(request) {
  const raw = await request.text();
  if (raw.length > 8192) throw Object.assign(new Error('Հարցումը չափազանց մեծ է։'), { status: 413 });
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value;
  } catch (_) { throw Object.assign(new Error('Հարցման տվյալների ձևաչափը սխալ է։'), { status: 400 }); }
}
function userView(claim, moderator) {
  return { username: claim.sub, displayName: moderator ? moderator.displayName : 'Owner', role: claim.role };
}
async function logAudit(env, claim, action, resource, result = 'success') {
  await accountRequest(env, '/audit', 'POST', {
    actor: claim.sub,
    role: claim.role,
    action,
    resource,
    result,
    timestamp: new Date().toISOString()
  });
}
async function authenticatedUser(claim, env) {
  if (claim.role === 'owner') return userView(claim, null);
  const result = await accountRequest(env, '/moderators/' + encodeURIComponent(claim.id));
  return userView(claim, result.moderator);
}

function storeJson(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
}
function storeState(ctx, change) {
  return ctx.storage.transactionSync(function () {
    const state = ctx.storage.kv.get('matchpro-admin-state') || { moderators: [], audit: [] };
    if (!Array.isArray(state.moderators)) state.moderators = [];
    if (!Array.isArray(state.audit)) state.audit = [];
    const result = change(state);
    ctx.storage.kv.put('matchpro-admin-state', state);
    return result;
  });
}
function publicModerator(account) {
  if (!account) return null;
  return {
    id: account.id,
    username: account.username,
    displayName: account.displayName,
    active: !!account.active,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
    lastLoginAt: account.lastLoginAt || null
  };
}
function appendAudit(state, event) {
  state.audit.push({
    id: event.id || crypto.randomUUID(),
    actor: String(event.actor || '').slice(0, 32),
    role: event.role === 'owner' ? 'owner' : 'moderator',
    action: String(event.action || '').slice(0, 80),
    resource: String(event.resource || '').slice(0, 160),
    result: String(event.result || 'success').slice(0, 40),
    timestamp: event.timestamp || new Date().toISOString()
  });
  if (state.audit.length > MAX_AUDIT_EVENTS) state.audit.splice(0, state.audit.length - MAX_AUDIT_EVENTS);
}

export class AccountStore {
  constructor(ctx) { this.ctx = ctx; }

  async fetch(request) {
    const url = new URL(request.url), method = request.method;
    const parts = url.pathname.split('/').filter(Boolean).map(function (part) { try { return decodeURIComponent(part); } catch (_) { return ''; } });
    try {
      if (method === 'GET' && parts.length === 1 && parts[0] === 'moderators') {
        const moderators = storeState(this.ctx, state => state.moderators.map(publicModerator).sort((a, b) => a.username.localeCompare(b.username)));
        return storeJson({ moderators });
      }
      if (method === 'GET' && parts.length === 1 && parts[0] === 'moderator-lookup') {
        const username = String(url.searchParams.get('username') || '').toLowerCase();
        const moderator = storeState(this.ctx, state => state.moderators.find(item => item.username === username) || null);
        return storeJson({ moderator });
      }
      if (parts[0] === 'moderators' && parts.length === 2 && method === 'GET') {
        const moderator = storeState(this.ctx, state => state.moderators.find(item => item.id === parts[1]) || null);
        return moderator ? storeJson({ moderator }) : storeJson({ message: 'Հաշիվը չի գտնվել։' }, 404);
      }
      if (parts.length === 1 && parts[0] === 'moderators' && method === 'POST') {
        const body = await requestBody(request);
        const moderator = storeState(this.ctx, state => {
          if (state.moderators.length >= MAX_MODERATORS) return { error: 'limit' };
          if (state.moderators.some(item => item.username === body.username)) return { error: 'duplicate' };
          const now = new Date().toISOString();
          const account = {
            id: body.id,
            username: body.username,
            displayName: body.displayName,
            passwordSalt: body.passwordSalt,
            passwordHash: body.passwordHash,
            active: true,
            sessionVersion: 0,
            createdAt: now,
            updatedAt: now,
            lastLoginAt: null
          };
          state.moderators.push(account);
          appendAudit(state, { actor: body.actor, role: body.actorRole, action: 'moderator.create', resource: account.username });
          return publicModerator(account);
        });
        if (moderator && moderator.error === 'duplicate') return storeJson({ message: 'Այս օգտանունն արդեն օգտագործվում է։' }, 409);
        if (moderator && moderator.error === 'limit') return storeJson({ message: 'Մոդերատորների առավելագույն քանակը լրացել է։' }, 409);
        return storeJson({ moderator }, 201);
      }
      if (parts[0] === 'moderators' && parts.length === 2 && method === 'PATCH') {
        const body = await requestBody(request);
        const moderator = storeState(this.ctx, state => {
          const account = state.moderators.find(item => item.id === parts[1]);
          if (!account) return null;
          const changed = [];
          if (body.displayName !== undefined && body.displayName !== account.displayName) { account.displayName = body.displayName; changed.push('profile'); }
          if (body.active !== undefined && !!body.active !== !!account.active) { account.active = !!body.active; account.sessionVersion++; changed.push(account.active ? 'enable' : 'disable'); }
          if (body.passwordSalt && body.passwordHash) { account.passwordSalt = body.passwordSalt; account.passwordHash = body.passwordHash; account.sessionVersion++; changed.push('password-reset'); }
          if (changed.length) {
            account.updatedAt = new Date().toISOString();
            appendAudit(state, { actor: body.actor, role: body.actorRole, action: 'moderator.' + changed.join('+'), resource: account.username });
          }
          return publicModerator(account);
        });
        return moderator ? storeJson({ moderator }) : storeJson({ message: 'Հաշիվը չի գտնվել։' }, 404);
      }
      if (parts[0] === 'moderators' && parts.length === 3 && parts[2] === 'login' && method === 'POST') {
        const moderator = storeState(this.ctx, state => {
          const account = state.moderators.find(item => item.id === parts[1] && item.active);
          if (!account) return null;
          account.lastLoginAt = new Date().toISOString();
          appendAudit(state, { actor: account.username, role: 'moderator', action: 'login', resource: 'admin', result: 'success' });
          return account;
        });
        return moderator ? storeJson({ moderator }) : storeJson({ message: 'Հաշիվը ակտիվ չէ։' }, 401);
      }
      if (parts.length === 1 && parts[0] === 'audit' && method === 'GET') {
        const requested = Number(url.searchParams.get('limit') || 100);
        const limit = Number.isFinite(requested) ? Math.min(200, Math.max(1, Math.trunc(requested))) : 100;
        const events = storeState(this.ctx, state => state.audit.slice(-limit).reverse());
        return storeJson({ events });
      }
      if (parts.length === 1 && parts[0] === 'audit' && method === 'POST') {
        const body = await requestBody(request);
        storeState(this.ctx, state => { appendAudit(state, body); return true; });
        return storeJson({ ok: true }, 201);
      }
      return storeJson({ message: 'Հասցեն չի գտնվել։' }, 404);
    } catch (_) {
      return storeJson({ message: 'Հաշիվների տվյալները ժամանակավորապես հասանելի չեն։' }, 500);
    }
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!originAllowed(request, env)) return json(request, env, { message: 'Origin-ը թույլատրված չէ։' }, 403);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: responseHeaders(request, env, new Headers()) });

    if (url.pathname === '/api/login') {
      if (request.method !== 'POST') return json(request, env, { message: 'Մեթոդը թույլատրված չէ։' }, 405);
      if (!ready(env)) return json(request, env, { message: 'Backend-ի կարգավորումները լրացված չեն։' }, 503);
      const ip = ipOf(request);
      if (isBlocked(ip)) return json(request, env, { message: 'Շատ անհաջող փորձեր։ Փորձեք ավելի ուշ։' }, 429);
      let body;
      try { body = await requestBody(request); }
      catch (error) { return json(request, env, { message: error.message }, error.status || 400); }
      const username = String(body.username || '').trim().toLowerCase(), password = String(body.password || '');
      let user = null, passwordOk = false;
      if (password.length >= 12 && password.length <= 1024) {
        const ownerName = String(env.ADMIN_USERNAME || '').trim().toLowerCase();
        if (username === ownerName) {
          try { passwordOk = await passwordMatches(password, env.ADMIN_PASSWORD_SALT, env.ADMIN_PASSWORD_HASH); } catch (_) {}
          if (passwordOk) user = { username: ownerName, role: 'owner' };
        } else {
          let account = null;
          try { account = (await accountRequest(env, '/moderator-lookup?username=' + encodeURIComponent(username))).moderator; } catch (_) {}
          try { passwordOk = await passwordMatches(password, account && account.passwordSalt || DUMMY_SALT, account && account.passwordHash || DUMMY_HASH); } catch (_) {}
          if (account && account.active && passwordOk) {
            try {
              const updated = await accountRequest(env, '/moderators/' + encodeURIComponent(account.id) + '/login', 'POST', {});
              account = updated.moderator;
              user = { username: account.username, role: 'moderator', id: account.id, sessionVersion: account.sessionVersion, displayName: account.displayName };
            } catch (_) { user = null; }
          }
        }
      }
      if (!user) {
        const blocked = failedAttempt(ip);
        return json(request, env, { message: blocked ? 'Շատ անհաջող փորձեր։ Փորձեք 15 րոպեից։' : 'Օգտանունը կամ գաղտնաբառը սխալ է։' }, blocked ? 429 : 401);
      }
      failedLogins.delete(ip);
      if (user.role === 'owner') {
        try { await logAudit(env, { sub: user.username, role: 'owner' }, 'login', 'admin'); } catch (_) {}
      }
      const token = await createSession(user, env);
      return json(request, env, { token, expiresIn: SESSION_TTL_SECONDS, user: { username: user.username, displayName: user.displayName || (user.role === 'owner' ? 'Owner' : user.username), role: user.role } }, 200);
    }

    if (!url.pathname.startsWith('/api/')) return json(request, env, { message: 'Հասցեն չի գտնվել։' }, 404);
    if (!['GET', 'POST', 'PATCH'].includes(request.method)) return json(request, env, { message: 'API մեթոդը թույլատրված չէ։' }, 405);
    const claim = await readSession(request, env);
    if (!claim) return json(request, env, { message: 'Session-ը ժամկետանց է, անջատված կամ անվավեր։ Կրկին մուտք գործեք։' }, 401);

    if (url.pathname === '/api/session') {
      if (request.method !== 'GET') return json(request, env, { message: 'Մեթոդը թույլատրված չէ։' }, 405);
      return json(request, env, { user: await authenticatedUser(claim, env), expiresIn: Math.max(0, Math.floor(Number(claim.exp) - Date.now() / 1000)) });
    }
    if (url.pathname === '/api/moderators') {
      if (claim.role !== 'owner') return json(request, env, { message: 'Այս գործողությունը հասանելի է միայն կայքի հիմնական սեփականատիրոջը։' }, 403);
      if (request.method === 'GET') {
        try { return json(request, env, await accountRequest(env, '/moderators')); }
        catch (_) { return json(request, env, { message: 'Մոդերատորների ցանկը հասանելի չէ։' }, 503); }
      }
      if (request.method !== 'POST') return json(request, env, { message: 'Մեթոդը թույլատրված չէ։' }, 405);
      let body;
      try { body = await requestBody(request); } catch (error) { return json(request, env, { message: error.message }, error.status || 400); }
      const username = String(body.username || '').trim().toLowerCase();
      const displayName = String(body.displayName || '').trim();
      const password = String(body.password || '');
      if (!validUsername(username)) return json(request, env, { message: 'Օգտանունը պետք է լինի 3–32 նիշ և պարունակի միայն լատինատառ, թիվ, կետ, գծիկ կամ ընդգծում։' }, 400);
      if (username === String(env.ADMIN_USERNAME || '').trim().toLowerCase()) return json(request, env, { message: 'Այս օգտանունը պահված է հիմնական սեփականատիրոջ համար։' }, 409);
      if (!validDisplayName(displayName)) return json(request, env, { message: 'Ցուցադրվող անունը պետք է լինի 1–80 նիշ։' }, 400);
      if (password.length < 12 || password.length > 128) return json(request, env, { message: 'Գաղտնաբառը պետք է լինի 12–128 նիշ։' }, 400);
      try {
        const hash = await passwordRecord(password);
        const result = await accountRequest(env, '/moderators', 'POST', {
          id: crypto.randomUUID(), username, displayName, ...hash,
          actor: claim.sub, actorRole: claim.role
        });
        return json(request, env, result, 201);
      } catch (error) { return json(request, env, { message: error.message || 'Մոդերատոր ստեղծել չհաջողվեց։' }, error.status || 503); }
    }
    const moderatorMatch = url.pathname.match(/^\/api\/moderators\/([^/]+)$/);
    if (moderatorMatch) {
      if (claim.role !== 'owner') return json(request, env, { message: 'Այս գործողությունը հասանելի է միայն կայքի հիմնական սեփականատիրոջը։' }, 403);
      if (request.method !== 'PATCH') return json(request, env, { message: 'Մեթոդը թույլատրված չէ։' }, 405);
      let body;
      try { body = await requestBody(request); } catch (error) { return json(request, env, { message: error.message }, error.status || 400); }
      const patch = { actor: claim.sub, actorRole: claim.role };
      if (body.displayName !== undefined) {
        patch.displayName = String(body.displayName).trim();
        if (!validDisplayName(patch.displayName)) return json(request, env, { message: 'Ցուցադրվող անունը պետք է լինի 1–80 նիշ։' }, 400);
      }
      if (body.active !== undefined) {
        if (typeof body.active !== 'boolean') return json(request, env, { message: 'Հաշվի վիճակը սխալ է։' }, 400);
        patch.active = body.active;
      }
      if (body.password !== undefined && body.password !== '') {
        const password = String(body.password);
        if (password.length < 12 || password.length > 128) return json(request, env, { message: 'Գաղտնաբառը պետք է լինի 12–128 նիշ։' }, 400);
        Object.assign(patch, await passwordRecord(password));
      }
      if (Object.keys(patch).every(key => key === 'actor' || key === 'actorRole')) return json(request, env, { message: 'Փոփոխություն նշված չէ։' }, 400);
      try {
        return json(request, env, await accountRequest(env, '/moderators/' + encodeURIComponent(decodeURIComponent(moderatorMatch[1])), 'PATCH', patch));
      } catch (error) { return json(request, env, { message: error.message || 'Մոդերատորի տվյալները չթարմացվեցին։' }, error.status || 503); }
    }
    if (url.pathname === '/api/audit') {
      if (request.method !== 'GET') return json(request, env, { message: 'Մեթոդը թույլատրված չէ։' }, 405);
      if (claim.role !== 'owner') return json(request, env, { message: 'Գործողությունների պատմությունը հասանելի է միայն հիմնական սեփականատիրոջը։' }, 403);
      try { return json(request, env, await accountRequest(env, '/audit?limit=' + encodeURIComponent(url.searchParams.get('limit') || '100'))); }
      catch (_) { return json(request, env, { message: 'Գործողությունների պատմությունը հասանելի չէ։' }, 503); }
    }
    if (url.pathname.startsWith('/api/github/')) {
      if (!['GET', 'POST', 'PATCH'].includes(request.method)) return json(request, env, { message: 'API մեթոդը թույլատրված չէ։' }, 405);
      const path = url.pathname.slice('/api/github'.length);
      if (!githubAllowed(request.method, path)) return json(request, env, { message: 'Այս GitHub API գործողությունը չի թույլատրվում։' }, 403);
      const headers = new Headers({ Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + env.GITHUB_TOKEN, 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'MatchPro-Admin-Worker' });
      const type = request.headers.get('Content-Type'); if (type) headers.set('Content-Type', type);
      const auditAction = path === REPO_PATH + '/git/refs/heads/main' && request.method === 'PATCH' ? 'site.publish' : 'site.content.write';
      let auditResource = request.method + ' ' + path;
      if (path === REPO_PATH + '/git/trees' && request.method === 'POST') {
        try {
          const tree = (await request.clone().json()).tree;
          const paths = Array.isArray(tree) ? tree.map(item => String(item.path || '').slice(0, 100)).filter(Boolean).slice(0, 8) : [];
          if (paths.length) auditResource += ' [' + paths.join(', ') + ']';
        } catch (_) {}
      }
      auditResource = auditResource.slice(0, 160);
      const init = { method: request.method, headers };
      if (request.method !== 'GET') init.body = await request.arrayBuffer();
      try {
        const upstream = await fetch('https://api.github.com' + path + url.search, init);
        if (request.method !== 'GET') try { await logAudit(env, claim, auditAction, auditResource, upstream.ok ? 'success' : 'failed:' + upstream.status); } catch (_) {}
        return new Response(upstream.body, {
          status: upstream.status,
          headers: responseHeaders(request, env, new Headers({ 'Content-Type': upstream.headers.get('Content-Type') || 'application/json; charset=utf-8' }))
        });
      } catch (_) {
        if (request.method !== 'GET') try { await logAudit(env, claim, auditAction, auditResource, 'failed:upstream'); } catch (_) {}
        return json(request, env, { message: 'GitHub API-ին միանալ չհաջողվեց։ Փորձեք կրկին։' }, 502);
      }
    }
    return json(request, env, { message: 'Հասցեն չի գտնվել։' }, 404);
  }
};
