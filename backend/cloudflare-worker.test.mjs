import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, pbkdf2Sync } from 'node:crypto';
import worker, { AccountStore } from './cloudflare-worker.mjs';

const ORIGIN = 'https://vip01live.github.io';
const REFERER = 'https://vip01live.github.io/matchpro/xcode/ops/internals/control-room/';
const PASSWORD = 'test-admin-password-123';
const salt = randomBytes(16);
const values = new Map();
const storage = {
  kv: {
    get(key) { return values.get(key); },
    put(key, value) { values.set(key, structuredClone(value)); }
  },
  transactionSync(callback) { return callback(); }
};
const durableObject = new AccountStore({ storage });
const namespace = {
  idFromName(name) { return name; },
  get() { return { fetch(request) { return durableObject.fetch(request); } }; }
};
const env = {
  ALLOWED_ORIGIN: ORIGIN,
  ALLOWED_REFERER_PREFIX: REFERER,
  ADMIN_USERNAME: 'admin',
  ADMIN_PASSWORD_SALT: salt.toString('base64'),
  ADMIN_PASSWORD_HASH: pbkdf2Sync(PASSWORD, salt, 310000, 32, 'sha256').toString('base64'),
  SESSION_SECRET: 'test-session-secret-at-least-32-characters-long',
  GITHUB_TOKEN: 'test-github-token',
  ACCOUNT_STORE: namespace
};

function req(path, opts = {}) {
  const headers = new Headers({ Origin: opts.origin || ORIGIN, 'CF-Connecting-IP': opts.ip || '192.0.2.10' });
  if (!opts.omitReferer) headers.set('Referer', opts.referer === undefined ? REFERER : opts.referer);
  if (opts.headers) new Headers(opts.headers).forEach((v, k) => headers.set(k, v));
  const init = { method: opts.method || 'GET', headers };
  if (opts.body !== undefined) { headers.set('Content-Type', 'application/json'); init.body = JSON.stringify(opts.body); }
  return new Request('https://worker.test' + path, init);
}
async function login(username = 'admin', password = PASSWORD, ip = '192.0.2.20') {
  const response = await worker.fetch(req('/api/login', { method: 'POST', ip, body: { username, password } }), env);
  return { response, data: await response.json() };
}
async function createModerator(ownerToken, overrides = {}) {
  return worker.fetch(req('/api/moderators', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + ownerToken },
    body: { username: 'editor.one', displayName: 'Editor One', password: 'test-moderator-password-123', ...overrides }
  }), env);
}

test('rejects a request from an unapproved Origin', async () => {
  const r = await worker.fetch(req('/api/login', { method: 'POST', origin: 'https://attacker.example', body: { username: 'admin', password: PASSWORD } }), env);
  assert.equal(r.status, 403);
});

test('requires the control-room Referer even when the Origin matches GitHub Pages', async () => {
  const missing = await worker.fetch(req('/api/login', { method: 'POST', omitReferer: true, body: { username: 'admin', password: PASSWORD } }), env);
  const siblingPage = await worker.fetch(req('/api/login', { method: 'POST', referer: 'https://vip01live.github.io/other-project/', body: { username: 'admin', password: PASSWORD } }), env);
  const preflight = await worker.fetch(req('/api/github/repos/vip01live/matchpro/git/trees', { method: 'OPTIONS', omitReferer: true }), env);
  assert.equal(missing.status, 403);
  assert.equal(siblingPage.status, 403);
  assert.equal(preflight.status, 204);
});

test('rejects invalid credentials without revealing the failing field', async () => {
  const { response, data } = await login('admin', 'not-the-correct-password', '192.0.2.11');
  assert.equal(response.status, 401);
  assert.match(data.message, /Օգտանունը կամ գաղտնաբառը սխալ է/);
});

test('issues a short-lived owner session and restricts the GitHub proxy to this repository', async () => {
  const previous = globalThis.fetch;
  let urlSeen = '', authSeen = '';
  globalThis.fetch = async (url, init) => {
    urlSeen = String(url);
    authSeen = new Headers(init.headers).get('Authorization') || '';
    return new Response(JSON.stringify({ permissions: { push: true } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  try {
    const { response: loginResponse, data } = await login();
    assert.equal(loginResponse.status, 200);
    assert.ok(data.token);
    assert.equal(data.expiresIn, 1800);
    assert.equal(data.user.role, 'owner');
    const proxied = await worker.fetch(req('/api/github/repos/vip01live/matchpro', { headers: { Authorization: 'Bearer ' + data.token } }), env);
    assert.equal(proxied.status, 200);
    assert.deepEqual(await proxied.json(), { permissions: { push: true } });
    assert.equal(urlSeen, 'https://api.github.com/repos/vip01live/matchpro');
    assert.equal(authSeen, 'Bearer test-github-token');
    const denied = await worker.fetch(req('/api/github/repos/other/repository', { headers: { Authorization: 'Bearer ' + data.token } }), env);
    assert.equal(denied.status, 403);
  } finally { globalThis.fetch = previous; }
});

test('requires a valid session for every proxied request', async () => {
  const r = await worker.fetch(req('/api/github/repos/vip01live/matchpro'), env);
  assert.equal(r.status, 401);
});

test('records content-write operations and tree paths without logging payloads', async () => {
  const { data: owner } = await login('admin', PASSWORD, '192.0.2.25');
  const previous = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ sha: 'abc123' }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  try {
    const response = await worker.fetch(req('/api/github/repos/vip01live/matchpro/git/trees', {
      method: 'POST', headers: { Authorization: 'Bearer ' + owner.token },
      body: { tree: [{ path: 'main/js/site-settings.json', mode: '100644', type: 'blob', sha: 'abc123' }] }
    }), env);
    assert.equal(response.status, 201);
  } finally { globalThis.fetch = previous; }
  const audit = await worker.fetch(req('/api/audit?limit=20', { headers: { Authorization: 'Bearer ' + owner.token } }), env);
  const { events } = await audit.json();
  const write = events.find(event => event.action === 'site.content.write' && event.resource.includes('main/js/site-settings.json'));
  assert.ok(write);
  assert.equal(write.result, 'success');
});

test('owner creates moderators, moderators inherit site-management access, and only owner can manage accounts', async () => {
  const { data: owner } = await login('admin', PASSWORD, '192.0.2.30');
  const created = await createModerator(owner.token);
  assert.equal(created.status, 201);
  const { moderator } = await created.json();
  assert.equal(moderator.username, 'editor.one');
  assert.equal(moderator.active, true);
  assert.equal('passwordHash' in moderator, false);

  const { response: modLogin, data: mod } = await login('EDITOR.ONE', 'test-moderator-password-123', '192.0.2.31');
  assert.equal(modLogin.status, 200);
  assert.equal(mod.user.role, 'moderator');
  assert.equal(mod.user.displayName, 'Editor One');
  const denied = await worker.fetch(req('/api/moderators', { headers: { Authorization: 'Bearer ' + mod.token } }), env);
  assert.equal(denied.status, 403);

  const previous = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  try {
    const siteWrite = await worker.fetch(req('/api/github/repos/vip01live/matchpro', { headers: { Authorization: 'Bearer ' + mod.token } }), env);
    assert.equal(siteWrite.status, 200);
  } finally { globalThis.fetch = previous; }
});

test('disabling a moderator immediately revokes existing sessions and records activity', async () => {
  const { data: owner } = await login('admin', PASSWORD, '192.0.2.40');
  const created = await createModerator(owner.token, { username: 'editor.two', displayName: 'Editor Two' });
  const { moderator } = await created.json();
  const { data: mod } = await login('editor.two', 'test-moderator-password-123', '192.0.2.41');

  const disabled = await worker.fetch(req('/api/moderators/' + moderator.id, {
    method: 'PATCH', headers: { Authorization: 'Bearer ' + owner.token }, body: { active: false }
  }), env);
  assert.equal(disabled.status, 200);
  const denied = await worker.fetch(req('/api/github/repos/vip01live/matchpro', { headers: { Authorization: 'Bearer ' + mod.token } }), env);
  assert.equal(denied.status, 401);
  const disabledLogin = await login('editor.two', 'test-moderator-password-123', '192.0.2.42');
  assert.equal(disabledLogin.response.status, 401);

  const audit = await worker.fetch(req('/api/audit?limit=20', { headers: { Authorization: 'Bearer ' + owner.token } }), env);
  const { events } = await audit.json();
  assert.ok(events.some(event => event.action === 'moderator.disable' && event.resource === 'editor.two'));
  assert.ok(events.some(event => event.action === 'login' && event.actor === 'editor.two'));
});

test('validates moderator input and prevents use of the owner username', async () => {
  const { data: owner } = await login('admin', PASSWORD, '192.0.2.50');
  const shortPassword = await createModerator(owner.token, { username: 'valid.name', password: 'short' });
  assert.equal(shortPassword.status, 400);
  const ownerName = await createModerator(owner.token, { username: 'admin' });
  assert.equal(ownerName.status, 409);
  const list = await worker.fetch(req('/api/moderators', { headers: { Authorization: 'Bearer ' + owner.token } }), env);
  assert.equal(list.status, 200);
  const body = await list.json();
  assert.ok(body.moderators.length >= 2);
  assert.ok(body.moderators.every(account => !('passwordHash' in account) && !('passwordSalt' in account)));
});
