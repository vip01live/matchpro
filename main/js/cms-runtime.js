(function(){
'use strict';
if(window.MATCHPRO_CMS_RUNTIME_STARTED)return;
window.MATCHPRO_CMS_RUNTIME_STARTED=true;
var settings=null,scheduled=false;
var script=document.currentScript;
var settingsUrl=script?new URL('site-settings.json',script.src).href:new URL('/main/js/site-settings.json',location.origin).href;
function stored(key){try{return localStorage.getItem(key)||''}catch(_){return''}}
function language(){
 var q=(new URLSearchParams(location.search).get('lang')||'').toLowerCase();
 if(['hy','ru','en'].indexOf(q)>=0)return q;
 var file=(location.pathname.split('/').pop()||'').toLowerCase(),fileLang=file.match(/-(hy|ru|en)\.html?$/);
 if(fileLang)return fileLang[1];
 var s=stored('matchpro-language');if(['hy','ru','en'].indexOf(s)>=0)return s;
 var b=(navigator.language||'').toLowerCase();
 if(b.indexOf('hy')===0)return'hy';
 if(/^(ru|be|kk|ky|uz)(-|$)/.test(b))return'ru';
 var d=settings&&settings.identity&&settings.identity.defaultLanguage;
 return ['hy','ru','en'].indexOf(d)>=0?d:'en';
}
function upsertMeta(kind,name,value){
 var selector=kind==='property'?'meta[property="'+name+'"]':'meta[name="'+name+'"]';
 var found=document.head.querySelectorAll(selector),el=found[0];
 if(value===undefined||value===null||String(value)===''){
  for(var j=0;j<found.length;j++)found[j].remove();
  return;
 }
 if(!el){el=document.createElement('meta');el.setAttribute(kind,name);document.head.appendChild(el)}
 el.setAttribute('content',String(value));
 for(var i=1;i<found.length;i++)found[i].remove();
}
function upsertLink(rel,value,extra){
 if(!value)return;
 var selector='link[rel="'+rel+'"]'+(extra||''),found=document.head.querySelectorAll(selector),el=found[0];
 if(!el){el=document.createElement('link');el.rel=rel;if(extra){var m=extra.match(/hreflang="([^"]+)"/);if(m)el.hreflang=m[1]}document.head.appendChild(el)}
 if(el.getAttribute('href')!==value)el.setAttribute('href',value);
 for(var i=1;i<found.length;i++)found[i].remove();
}
function listChannels(){return Array.isArray(window.MATCHPRO_CHANNELS)?window.MATCHPRO_CHANNELS:[]}
function getPage(){
 var params=new URLSearchParams(location.search),id=params.get('id'),file=(location.pathname.split('/').pop()||'index.html').toLowerCase();
 if(id){var byId=listChannels().find(function(c){return String(c.id)===String(id)});return {key:'channel:'+id,channel:byId,home:false,file:file}}
 var byFile=listChannels().find(function(c){return String(c.file||'').toLowerCase()===file});
 if(byFile)return {key:'channel:'+byFile.id,channel:byFile,home:false,file:file};
 if(file===''||file==='index.html')return {key:'home',channel:null,home:true,file:'index.html'};
 return {key:'page:'+file,channel:null,home:false,file:file};
}
function channelDefaults(ch,l){
 if(!ch)return{};
 var s=l==='hy'?'Hy':l==='ru'?'Ru':'En';
 return {title:ch['title'+s]||ch.titleHy||ch.titleRu||ch.titleEn,description:ch['description'+s]||ch.descriptionHy||ch.descriptionRu||ch.descriptionEn,keywords:ch['keywords'+s]||ch.keywordsHy||ch.keywordsRu||ch.keywordsEn,h1:ch['name'+s]||ch.nameHy||ch.nameRu||ch.nameEn,ogTitle:ch['title'+s]||ch.titleHy,ogDescription:ch['description'+s]||ch.descriptionHy,ogType:'website',ogImage:ch.logo,twitterCard:'summary_large_image',twitterTitle:ch['title'+s]||ch.titleHy,twitterDescription:ch['description'+s]||ch.descriptionHy,twitterImage:ch.logo,robots:ch.published===false||ch.indexable===false?'noindex, nofollow':'index, follow'};
}
function state(){
 if(!settings)return null;
 var p=getPage(),l=language(),d={};
 if(p.home)d=Object.assign({},settings.home&&settings.home[l]||{});
 else if(p.channel)d=channelDefaults(p.channel,l);
 var saved=settings.seo&&settings.seo.pages&&settings.seo.pages[p.key]&&settings.seo.pages[p.key][l];
 if(saved)d=Object.assign(d,saved);
 if(p.home){d.h1=d.h1||d.intro||'';d.ogTitle=d.ogTitle||d.title;d.ogDescription=d.ogDescription||d.description;d.ogImage=d.ogImage||(settings.identity&&settings.identity.defaultOgImage);d.twitterCard=d.twitterCard||'summary_large_image';d.twitterTitle=d.twitterTitle||d.ogTitle||d.title;d.twitterDescription=d.twitterDescription||d.ogDescription||d.description;d.twitterImage=d.twitterImage||d.ogImage;d.twitterSite=d.twitterSite||(settings.identity&&settings.identity.twitterSite)}
 return {page:p,language:l,data:d,identity:settings.identity||{}};
}
function absUrl(value){
 var v=String(value||'').trim();if(!v)return'';
 if(/^https?:\/\//i.test(v))return v;
 var base=(settings&&settings.identity&&settings.identity.domain)||location.origin+'/';
 try{return new URL(v.replace(/^\/+/,''),base.replace(/\/?$/,'/')).href}catch(_){try{return new URL(v,location.href).href}catch(__){return''}}
}
function canonicalFor(s){
 var d=s.data,p=s.page,base=s.identity.domain||location.origin+'/';
 if(d.canonical){if(/^https?:\/\//i.test(d.canonical))return d.canonical;return absUrl(d.canonical)}
 if(p.key==='home')return base;
 if(p.key.indexOf('channel:')===0)return base.replace(/\/?$/,'/')+'?id='+encodeURIComponent(p.key.slice(8))+'&lang='+s.language;
 return base.replace(/\/?$/,'/')+p.file;
}
function applyMetadata(){
 var s=state();if(!s)return;
 var d=s.data,i=s.identity,p=s.page,l=s.language;
 var title=d.title||d.seoTitle;
 if(title&&document.title!==title)document.title=title;
 upsertMeta('name','description',d.description);
 upsertMeta('name','keywords',d.keywords);
 upsertMeta('name','robots',d.robots||(p.channel&&p.channel.indexable===false?'noindex, nofollow':'index, follow'));
 upsertMeta('name','googlebot',d.robots||(p.channel&&p.channel.indexable===false?'noindex, nofollow':'index, follow'));
 upsertMeta('name','theme-color',i.themeColor);
 var canonical=canonicalFor(s),ogTitle=d.ogTitle||title,ogDesc=d.ogDescription||d.description,ogImage=absUrl(d.ogImage||i.defaultOgImage);
 upsertLink('canonical',canonical);
 upsertMeta('property','og:title',ogTitle);
 upsertMeta('property','og:description',ogDesc);
 upsertMeta('property','og:type',d.ogType||'website');
 upsertMeta('property','og:url',canonical);
 upsertMeta('property','og:image',ogImage);
 upsertMeta('property','og:image:alt',d.ogImageAlt||d.twitterImageAlt);
 upsertMeta('property','og:site_name',i.name||'MatchPro');
 upsertMeta('property','og:locale',l==='hy'?'hy_AM':l==='ru'?'ru_RU':'en_US');
 upsertMeta('name','twitter:card',d.twitterCard||'summary_large_image');
 upsertMeta('name','twitter:title',d.twitterTitle||ogTitle);
 upsertMeta('name','twitter:description',d.twitterDescription||ogDesc);
 upsertMeta('name','twitter:image',absUrl(d.twitterImage||ogImage||i.defaultOgImage));
 upsertMeta('name','twitter:image:alt',d.twitterImageAlt||d.ogImageAlt);
 upsertMeta('name','twitter:site',d.twitterSite||i.twitterSite);
 upsertMeta('name','twitter:creator',d.twitterCreator);
 document.documentElement.lang=l;
 var domain=i.domain||location.origin+'/';
 if(p.key==='home'||p.key.indexOf('channel:')===0){
  ['hy','ru','en'].forEach(function(x){var suffix=p.key==='home'?'?lang='+x:'?id='+encodeURIComponent(p.key.slice(8))+'&lang='+x;upsertLink('alternate',domain.replace(/\/?$/,'/')+suffix,'[hreflang="'+x+'"]')});
 }
 var schema=document.getElementById('matchpro-cms-schema');
 if(!schema){schema=document.createElement('script');schema.id='matchpro-cms-schema';schema.type='application/ld+json';document.head.appendChild(schema)}
 schema.textContent=JSON.stringify({'@context':'https://schema.org','@type':'WebPage',name:title||i.name||'MatchPro',description:d.description||undefined,url:canonical,inLanguage:l,isPartOf:{'@type':'WebSite',name:i.name||'MatchPro',url:domain},primaryImageOfPage:ogImage?{'@type':'ImageObject',url:ogImage}:undefined});
}
function validHref(value){
 var v=String(value||'').trim();if(!v)return true;
 if(v.charAt(0)==='/'&&v.slice(0,2)!=='//'&&!/[\r\n]/.test(v))return true;
 try{return ['http:','https:','mailto:','tel:'].indexOf(new URL(v,location.href).protocol)>=0&&!/[\r\n]/.test(v)}catch(_){return false}
}
var ALLOWED_STYLE={color:1,backgroundColor:1,fontSize:1,fontWeight:1,textAlign:1,width:1,margin:1,padding:1,borderRadius:1,height:1};
function applyOverrides(){
 var s=state();if(!s)return;
 var all=settings.contentOverrides||{},allPage=all[s.page.key]||{},entries=allPage[s.language]||{};
 Object.keys(entries).forEach(function(selector){
  var el;try{el=document.querySelector(selector)}catch(_){return}if(!el)return;
  var v=entries[selector]||{};
  if(Object.prototype.hasOwnProperty.call(v,'text')&&el.children.length===0&&el.textContent!==String(v.text))el.textContent=String(v.text);
  if(el.tagName==='A'&&Object.prototype.hasOwnProperty.call(v,'href')&&validHref(v.href)){if(v.href)el.setAttribute('href',v.href);else el.removeAttribute('href')}
  if(el.tagName==='IMG'){
   if(v.src&&validHref(v.src)&&el.getAttribute('src')!==v.src)el.setAttribute('src',v.src);
   if(Object.prototype.hasOwnProperty.call(v,'alt')&&el.getAttribute('alt')!==String(v.alt))el.setAttribute('alt',String(v.alt));
  }
  if(Object.prototype.hasOwnProperty.call(v,'title')){if(v.title)el.setAttribute('title',String(v.title));else el.removeAttribute('title')}
  if(Object.prototype.hasOwnProperty.call(v,'hidden'))el.hidden=!!v.hidden;
  Object.keys(v.styles||{}).forEach(function(prop){
   if(!ALLOWED_STYLE[prop])return;var val=String(v.styles[prop]||'');
   if(/url\s*\(|expression\s*\(|javascript:/i.test(val))return;
   if(['fontSize','width','margin','padding','borderRadius','height'].indexOf(prop)>=0&&val&&!/^(auto|inherit|initial|unset|0|[0-9.]+(px|%|rem|em|vw|vh)|[0-9.]+(px|%|rem|em|vw|vh)(\s+[0-9.]+(px|%|rem|em|vw|vh)){1,3})$/i.test(val))return;
   if(val)el.style[prop]=val;else el.style[prop]='';
  });
 });
 if(s.page.key==='home'&&s.data.h1){
  var h=document.querySelector('.intro-text')||document.querySelector('main h1')||document.querySelector('h1');
  if(h&&h.children.length===0&&h.textContent!==s.data.h1)h.textContent=s.data.h1;
 }else if(s.page.key.indexOf('channel:')===0&&s.data.h1){
  var chh=document.querySelector('.channel-name span')||document.querySelector('.channel-name');
  if(chh&&chh.textContent!==s.data.h1)chh.textContent=s.data.h1;
 }else if(s.data.h1){
  var ph=document.querySelector('main h1')||document.querySelector('h1');
  if(ph&&ph.children.length===0&&ph.textContent!==s.data.h1)ph.textContent=s.data.h1;
 }
}
var lastRun='',timer=null;
function run(){timer=null;if(!settings)return;var key=location.pathname+location.search+'|'+language();applyMetadata();applyOverrides();lastRun=key}
function schedule(){if(timer)return;timer=setTimeout(run,80)}
function initObserver(){if(!document.body||window.MATCHPRO_CMS_OBSERVER)return;window.MATCHPRO_CMS_OBSERVER=true;var obs=new MutationObserver(function(records){if(records.some(function(r){return r.type==='childList'&&r.target!==document.head}))schedule()});obs.observe(document.body,{subtree:true,childList:true})}
fetch(settingsUrl,{cache:'no-cache'}).then(function(r){if(!r.ok)throw new Error('CMS settings request failed');return r.json()}).then(function(data){settings=data||{};run();initObserver();window.addEventListener('popstate',schedule);window.addEventListener('hashchange',schedule)}).catch(function(e){console.warn('MatchPro CMS runtime:',e.message)});
})();