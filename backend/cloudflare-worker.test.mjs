import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes,pbkdf2Sync } from 'node:crypto';
import worker from './cloudflare-worker.mjs';
const ORIGIN='https://vip01live.github.io';
const REFERER='https://vip01live.github.io/matchpro/xcode/ops/internals/control-room/';
const PASSWORD='test-admin-password-123';
const salt=randomBytes(16);
const env={ALLOWED_ORIGIN:ORIGIN,ALLOWED_REFERER_PREFIX:REFERER,ADMIN_USERNAME:'admin',ADMIN_PASSWORD_SALT:salt.toString('base64'),ADMIN_PASSWORD_HASH:pbkdf2Sync(PASSWORD,salt,310000,32,'sha256').toString('base64'),SESSION_SECRET:'test-session-secret-at-least-32-characters-long',GITHUB_TOKEN:'test-github-token'};
function req(path,opts={}) {
  const headers=new Headers({Origin:opts.origin||ORIGIN,Referer:opts.referer||REFERER,'CF-Connecting-IP':opts.ip||'192.0.2.10'});
  if(opts.headers)new Headers(opts.headers).forEach((v,k)=>headers.set(k,v));
  const init={method:opts.method||'GET',headers};
  if(opts.body!==undefined){headers.set('Content-Type','application/json');init.body=JSON.stringify(opts.body);}
  return new Request('https://worker.test'+path,init);
}
test('rejects a request from an unapproved Origin',async()=>{
 const r=await worker.fetch(req('/api/login',{method:'POST',origin:'https://attacker.example',body:{username:'admin',password:PASSWORD}}),env);
 assert.equal(r.status,403);
});
test('rejects invalid credentials without revealing the failing field',async()=>{
 const r=await worker.fetch(req('/api/login',{method:'POST',ip:'192.0.2.11',body:{username:'admin',password:'not-the-correct-password'}}),env);
 assert.equal(r.status,401);assert.match((await r.json()).message,/Օգտանունը կամ գաղտնաբառը սխալ է/);
});
test('issues a short-lived session and restricts the GitHub proxy to this repository',async()=>{
 const previous=globalThis.fetch;let urlSeen='',authSeen='';
 globalThis.fetch=async(url,init)=>{urlSeen=String(url);authSeen=new Headers(init.headers).get('Authorization')||'';return new Response(JSON.stringify({permissions:{push:true}}),{status:200,headers:{'Content-Type':'application/json'}});};
 try {
  const login=await worker.fetch(req('/api/login',{method:'POST',ip:'192.0.2.12',body:{username:'admin',password:PASSWORD}}),env);
  assert.equal(login.status,200);const data=await login.json();assert.ok(data.token);assert.equal(data.expiresIn,1800);
  const proxied=await worker.fetch(req('/api/github/repos/vip01live/matchpro',{headers:{Authorization:'Bearer '+data.token}}),env);
  assert.equal(proxied.status,200);assert.deepEqual(await proxied.json(),{permissions:{push:true}});
  assert.equal(urlSeen,'https://api.github.com/repos/vip01live/matchpro');assert.equal(authSeen,'Bearer test-github-token');
  const denied=await worker.fetch(req('/api/github/repos/other/repository',{headers:{Authorization:'Bearer '+data.token}}),env);
  assert.equal(denied.status,403);
 } finally {globalThis.fetch=previous;}
});
test('requires a valid session for every proxied request',async()=>{
 const r=await worker.fetch(req('/api/github/repos/vip01live/matchpro'),env);assert.equal(r.status,401);
});
