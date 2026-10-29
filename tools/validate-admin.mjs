import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(),errors=[];
const read=(name)=>fs.readFileSync(path.join(root,name),'utf8');
const check=(ok,message)=>{if(!ok)errors.push(message);};
const html=read('xcode/ops/internals/control-room/index.html');
const marker='<script>\n(function () {',start=html.indexOf(marker),end=html.indexOf('</script>',start);
check(start>=0&&end>start,'admin inline script boundaries are invalid');
if(start>=0&&end>start){
 const inline=html.slice(start+'<script>\n'.length,end),markup=html.slice(0,start);
 try{new Function(inline);}catch(e){errors.push('admin inline script syntax: '+e.message);}
 const ids=[...markup.matchAll(/\bid=["']([^"']+)["']/g)].map(m=>m[1]);
 const duplicates=[...new Set(ids.filter((id,i)=>ids.indexOf(id)!==i))];
 check(!duplicates.length,'duplicate DOM IDs: '+duplicates.join(', '));
 const refs=[...inline.matchAll(/\$\(['"]([^'"]+)['"]\)/g)].map(m=>m[1]);
 const missing=[...new Set(refs.filter(id=>!ids.includes(id)))];
 check(!missing.length,'missing static DOM IDs: '+missing.join(', '));
 for(const view of ['dashboard','channels','ads','branding','content','maintenance','security'])check(markup.includes('data-view="'+view+'"'),'missing navigation view '+view);
 for(const id of ['dashboard-view','channels-view','security-panel','security-auth-status','site-settings-form','channel-form'])check(ids.includes(id),'missing required element '+id);
 const validLocal=(raw)=>{const v=String(raw||'').trim();if(!v||v.startsWith('#')||v.startsWith('//')||/^(?:https?:|data:|mailto:|tel:|javascript:|blob:)/i.test(v))return true;const target=v.split('#')[0].split('?')[0];return fs.existsSync(path.join(root,target.startsWith('/')?target.slice(1):target));};
 for(const m of markup.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/gi))check(validLocal(m[1]),'missing local admin asset '+m[1]);
 check(!inline.includes('data-view="info"'),'old single Settings view remains');
 check(inline.includes('allowedMediaFile')&&inline.includes('assetUrl'),'media validation or project path helper missing');
 check(inline.includes('ADMIN_API_BASE')&&inline.includes('/api/github'),'server-side API bridge missing');
  check(html.includes('src="/main/js/admin-cms.js"'),'CMS extension script is not included');
  check(fs.existsSync(path.join(root,'main/js/admin-cms.js')),'CMS extension script file missing');
  check(fs.existsSync(path.join(root,'main/js/cms-runtime.js')),'public CMS runtime file missing');
}
const redirect=read('main/js/player-click-redirect.js');
try{new Function(redirect);}catch(e){errors.push('player redirect syntax: '+e.message);}
check(redirect.includes("window.open(url, '_blank')"),'user-gesture new-tab open missing');
check(redirect.includes('showPopupFallback'),'popup-blocker fallback missing');
check(!redirect.includes('link.click()'),'old programmatic click remains');
const settings=JSON.parse(read('main/js/site-settings.json'));
check(settings.adblock&&settings.adblock.enabled===false,'AdBlock must be disabled by default');
check(read('main/js/admin-backend-config.js').includes('MATCHPRO_ADMIN_API_BASE'),'backend endpoint config missing');
const channelSource=read('main/js/channels.js');
const channels=JSON.parse(channelSource.replace(/^\s*window\.MATCHPRO_CHANNELS\s*=\s*/,'').replace(/;\s*$/,''));
for(const c of channels)if(c.iframeFile)check(fs.existsSync(path.join(root,'iframe',c.iframeFile)),'missing iframe for channel '+c.id);
if(errors.length){console.error('Admin validation failed: '+errors.length+' error(s)');for(const e of errors)console.error('::error::'+e);process.exit(1);}
console.log('MatchPro admin validation passed: syntax, DOM IDs, views, assets, media validation, redirect fallback and iframe references.');
