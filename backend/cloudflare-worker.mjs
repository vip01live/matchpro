const OWNER = 'vip01live';
const REPO = 'matchpro';
const REPO_PATH = '/repos/' + OWNER + '/' + REPO;
const SESSION_TTL_SECONDS = 1800;
const PASSWORD_ITERATIONS = 310000;
const encoder = new TextEncoder();
const failedLogins = new Map();

function fromB64(value) {
  const binary = atob(String(value || ''));
  const result = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) result[i] = binary.charCodeAt(i);
  return result;
}
function toB64Url(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'');
}
function fromB64Url(value) {
  let valuePadded = String(value || '').replace(/-/g,'+').replace(/_/g,'/');
  while (valuePadded.length % 4) valuePadded += '=';
  return fromB64(valuePadded);
}
function sameBytes(a,b) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a[i] ^ b[i];
  return mismatch === 0;
}
function cors(request, env, headers) {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigin = String(env.ALLOWED_ORIGIN || '').replace(/\/+$/,'');
  if (origin && origin === allowedOrigin) {
    headers.set('Access-Control-Allow-Origin',origin);
    headers.set('Access-Control-Allow-Methods','GET, POST, PATCH, OPTIONS');
    headers.set('Access-Control-Allow-Headers','Authorization, Content-Type, Accept, X-GitHub-Api-Version');
    headers.set('Access-Control-Max-Age','600');
    headers.set('Vary','Origin');
  }
  headers.set('Cache-Control','no-store');
  headers.set('X-Content-Type-Options','nosniff');
  headers.set('Referrer-Policy','no-referrer');
  return headers;
}
function json(request,env,value,status=200) {
  return new Response(JSON.stringify(value),{status,headers:cors(request,env,new Headers({'Content-Type':'application/json; charset=utf-8'}))});
}
function originAllowed(request,env) {
  const origin = request.headers.get('Origin') || '';
  const expected = String(env.ALLOWED_ORIGIN || '').replace(/\/+$/,'');
  if (!expected || origin !== expected) return false;
  const refererPrefix = String(env.ALLOWED_REFERER_PREFIX || '');
  const referer = request.headers.get('Referer') || '';
  if (refererPrefix && referer && !referer.startsWith(refererPrefix)) return false;
  return true;
}
function ipOf(request) { return request.headers.get('CF-Connecting-IP') || 'unknown'; }
function isBlocked(ip) { const item=failedLogins.get(ip);return !!(item && item.until>Date.now()); }
function failedAttempt(ip) {
  const now=Date.now(),item=failedLogins.get(ip)||{count:0,updated:now,until:0};
  if(now-item.updated>15*60*1000){item.count=0;item.until=0;}
  item.count++;item.updated=now;if(item.count>=5)item.until=now+15*60*1000;
  if(failedLogins.size>1000)for(const [key,value] of failedLogins)if(now-value.updated>30*60*1000)failedLogins.delete(key);
  failedLogins.set(ip,item);return item.until>now;
}
async function passwordMatches(password,env) {
  if(!env.ADMIN_PASSWORD_SALT||!env.ADMIN_PASSWORD_HASH)return false;
  const salt=fromB64(env.ADMIN_PASSWORD_SALT),expected=fromB64(env.ADMIN_PASSWORD_HASH);
  const material=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
  const result=await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:PASSWORD_ITERATIONS,hash:'SHA-256'},material,256);
  return sameBytes(new Uint8Array(result),expected);
}
async function signingKey(env) {
  const secret=String(env.SESSION_SECRET||'');
  if(secret.length<32)throw new Error('SESSION_SECRET missing or too short');
  return crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
}
async function createSession(username,env) {
  const audience=String(env.ALLOWED_ORIGIN||'').replace(/\/+$/,'');
  const body=toB64Url(encoder.encode(JSON.stringify({sub:username,aud:audience,exp:Math.floor(Date.now()/1000)+SESSION_TTL_SECONDS,jti:crypto.randomUUID()})));
  const signature=await crypto.subtle.sign('HMAC',await signingKey(env),encoder.encode(body));
  return body+'.'+toB64Url(new Uint8Array(signature));
}
async function readSession(request,env) {
  const match=(request.headers.get('Authorization')||'').match(/^Bearer\s+(.+)$/i);
  if(!match)return null;
  const parts=match[1].split('.');
  if(parts.length!==2)return null;
  try {
    const valid=await crypto.subtle.verify('HMAC',await signingKey(env),fromB64Url(parts[1]),encoder.encode(parts[0]));
    if(!valid)return null;
    const claim=JSON.parse(new TextDecoder().decode(fromB64Url(parts[0])));
    if(!claim||claim.sub!==env.ADMIN_USERNAME||claim.aud!==String(env.ALLOWED_ORIGIN||'').replace(/\/+$/,'')||!Number.isFinite(claim.exp)||claim.exp<=Math.floor(Date.now()/1000))return null;
    return claim;
  } catch(_){return null;}
}
function githubAllowed(method,path) {
  if(method==='GET'&&path===REPO_PATH)return true;
  if(method==='GET'&&path.startsWith(REPO_PATH+'/contents/'))return true;
  if(method==='GET'&&path===REPO_PATH+'/git/ref/heads/main')return true;
  if(method==='GET'&&/^\/repos\/vip01live\/matchpro\/git\/trees\/[0-9a-f]{40}$/i.test(path))return true;
  if(method==='GET'&&/^\/repos\/vip01live\/matchpro\/git\/commits\/[0-9a-f]{40}$/i.test(path))return true;
  if(method==='POST'&&[REPO_PATH+'/git/blobs',REPO_PATH+'/git/trees',REPO_PATH+'/git/commits'].includes(path))return true;
  if(method==='PATCH'&&path===REPO_PATH+'/git/refs/heads/main')return true;
  return false;
}
function ready(env) {
  return !!(env.ADMIN_USERNAME&&env.ADMIN_PASSWORD_SALT&&env.ADMIN_PASSWORD_HASH&&env.GITHUB_TOKEN&&env.SESSION_SECRET&&String(env.SESSION_SECRET).length>=32);
}
export default {
  async fetch(request,env) {
    const url=new URL(request.url);
    if(!originAllowed(request,env))return json(request,env,{message:'Origin-ը թույլատրված չէ։'},403);
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors(request,env,new Headers())});
    if(url.pathname==='/api/login') {
      if(request.method!=='POST')return json(request,env,{message:'Մեթոդը թույլատրված չէ։'},405);
      if(!ready(env))return json(request,env,{message:'Backend-ի secrets-ը լրացված չեն։'},503);
      const ip=ipOf(request);if(isBlocked(ip))return json(request,env,{message:'Շատ անհաջող փորձեր։ Փորձեք ավելի ուշ։'},429);
      let body;
      try{const raw=await request.text();if(raw.length>8192)return json(request,env,{message:'Մուտքի հարցումը չափազանց մեծ է։'},413);body=JSON.parse(raw);}catch(_){return json(request,env,{message:'Մուտքի տվյալների ձևաչափը սխալ է։'},400);}
      const username=String(body.username||''),password=String(body.password||'');
      let passwordOk=false;
      if(password.length>=12&&password.length<=1024)try{passwordOk=await passwordMatches(password,env);}catch(_){}
      if(username!==env.ADMIN_USERNAME||!passwordOk){const blocked=failedAttempt(ip);return json(request,env,{message:blocked?'Շատ անհաջող փորձեր։ Փորձեք 15 րոպեից։':'Օգտանունը կամ գաղտնաբառը սխալ է։'},blocked?429:401);}
      failedLogins.delete(ip);
      return json(request,env,{token:await createSession(username,env),expiresIn:SESSION_TTL_SECONDS},200);
    }
    if(!url.pathname.startsWith('/api/github/'))return json(request,env,{message:'Հասցեն չի գտնվել։'},404);
    if(!['GET','POST','PATCH'].includes(request.method))return json(request,env,{message:'API մեթոդը թույլատրված չէ։'},405);
    if(!await readSession(request,env))return json(request,env,{message:'Session-ը ժամկետանց է կամ անվավեր։ Կրկին մուտք գործեք։'},401);
    const path=url.pathname.slice('/api/github'.length);
    if(!githubAllowed(request.method,path))return json(request,env,{message:'Այս GitHub API գործողությունը չի թույլատրվում։'},403);
    const headers=new Headers({'Accept':'application/vnd.github+json','Authorization':'Bearer '+env.GITHUB_TOKEN,'X-GitHub-Api-Version':'2022-11-28','User-Agent':'MatchPro-Admin-Worker'});
    const type=request.headers.get('Content-Type');if(type)headers.set('Content-Type',type);
    const init={method:request.method,headers};
    if(request.method!=='GET')init.body=await request.arrayBuffer();
    try {
      const upstream=await fetch('https://api.github.com'+path+url.search,init);
      return new Response(upstream.body,{status:upstream.status,headers:cors(request,env,new Headers({'Content-Type':upstream.headers.get('Content-Type')||'application/json; charset=utf-8'}))});
    } catch(_) {return json(request,env,{message:'GitHub API-ին միանալ չհաջողվեց։ Փորձեք կրկին։'},502);}
  }
};
