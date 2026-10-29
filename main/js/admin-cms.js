(function(){
'use strict';
if(window.MATCHPRO_CMS_EXTENSION_STARTED)return;
window.MATCHPRO_CMS_EXTENSION_STARTED=true;
var api=null,root=null,settings=null,channels=[],pages=[],selectedElement=null,selectedSelector='',frameDoc=null,loading=false;
var $=function(id){return document.getElementById(id)};
var LANGS=[{id:'hy',label:'Հայերեն'},{id:'ru',label:'Русский'},{id:'en',label:'English'}];
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(ch){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])})}
function safeUrl(value,local){var v=String(value||'').trim();if(!v)return true;if(local&&v.charAt(0)==='/'&&v.slice(0,2)!=='//'&&!/[\r\n]/.test(v))return true;try{return ['http:','https:'].indexOf(new URL(v,location.href).protocol)>=0&&!/[\r\n]/.test(v)}catch(_){return false}}
function currentSettings(){return api&&api.getSettings()||settings||{}}
function currentChannels(){return api&&api.getChannels()||channels||[]}
function pageKey(p){return p.key}
function langValue(){return $('cms-seo-lang')?$('cms-seo-lang').value:'hy'}
function selectValue(id){return $(id)?$(id).value:'home'}
function channelForKey(key){if(key.indexOf('channel:')!==0)return null;return currentChannels().find(function(c){return String(c.id)===key.slice(8)})||null}
function homeUrl(lang){return root+'/?lang='+encodeURIComponent(lang||'hy')}
function channelUrl(id,lang){return root+'/?id='+encodeURIComponent(id)+'&lang='+encodeURIComponent(lang||'hy')}
function previewUrl(p,lang){if(p.key==='home')return homeUrl(lang);if(p.key.indexOf('channel:')===0)return channelUrl(p.key.slice(8),lang);return root+'/'+p.filename+'?lang='+encodeURIComponent(lang||'hy')}
function addNavViews(){
 var main=document.querySelector('#app-screen main');if(!main)return;
 var css=document.createElement('style');css.textContent='.cms-subnav{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px}.cms-card{background:linear-gradient(160deg,#121d29,#0f1721);border:1px solid #29364c;border-radius:18px;padding:18px;margin-bottom:16px}.cms-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 16px}.cms-grid>*{min-width:0}.cms-full{grid-column:1/-1}.cms-preview{background:#080e18;border:1px solid #29364c;border-radius:12px;padding:12px;white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.6 ui-monospace,Consolas,monospace;color:#c7d5e7;max-height:360px;overflow:auto}.cms-page-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(245px,1fr));gap:12px}.cms-page-item{background:#101a28;border:1px solid #2b3950;border-radius:14px;padding:15px;display:flex;flex-direction:column;gap:8px;min-width:0}.cms-page-item strong{overflow-wrap:anywhere}.cms-page-item small{color:#9aa8bd}.cms-two-col{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(280px,.85fr);gap:14px;align-items:start}.cms-frame-wrap{background:white;border:1px solid #2b3950;border-radius:14px;overflow:hidden;min-width:0}.cms-frame{display:block;width:100%;height:68vh;min-height:420px;border:0;background:white}.cms-editor-controls{background:#0c1421;border:1px solid #2b3950;border-radius:14px;padding:14px;min-width:0}.cms-editor-controls .field{margin-bottom:12px}.cms-selected{background:#141f31;border:1px solid #384665;border-radius:12px;padding:12px;margin-bottom:12px;overflow-wrap:anywhere}.cms-selected code{display:block;color:#aaa8ff;margin-top:5px;word-break:break-all}.cms-row-actions{display:flex;gap:8px;flex-wrap:wrap}.cms-warning{border:1px solid #6c5a36;background:#2a2315;color:#e9d6a5;border-radius:12px;padding:12px;margin-bottom:15px;font-size:12px}.cms-heading{display:flex;align-items:start;justify-content:space-between;gap:12px;margin-bottom:15px}.cms-heading h2{margin:0;font-size:24px}.cms-heading p{margin:4px 0;color:#9aa8bd}.cms-disabled{opacity:.55;pointer-events:none}@media(max-width:1000px){.cms-two-col{grid-template-columns:1fr}.cms-frame{height:52vh;min-height:330px}}@media(max-width:720px){.cms-grid{grid-template-columns:minmax(0,1fr)}.cms-full{grid-column:auto}.cms-heading{flex-direction:column}.cms-frame{min-height:300px;height:48vh}.cms-card{padding:12px}}';
 main.appendChild(css);
 var pages=document.createElement('section');pages.id='cms-pages-view';pages.className='hidden';pages.innerHTML='<div class="cms-heading"><div><h2>Էջերի կառավարում</h2><p>Բոլոր հայտնաբերված HTML էջերը, ալիքները և գլխավոր էջը՝ մեկ ցուցակում։</p></div><button type="button" class="btn outline" id="cms-refresh-pages">↻ Թարմացնել ցանկը</button></div><div class="cms-card"><input id="cms-page-search" class="search" type="search" placeholder="Փնտրել էջի անունով կամ ֆայլով..." style="width:100%;max-width:none"><div id="cms-page-list" class="cms-page-list" style="margin-top:14px"></div><div id="cms-pages-error" class="error"></div></div>';
 main.appendChild(pages);
 var seo=document.createElement('section');seo.id='cms-seo-view';seo.className='hidden';seo.innerHTML='<div class="cms-heading"><div><h2>SEO և HTML metadata</h2><p>Կառավարեք էջի title-ը, H1-ը, description-ը, canonical-ը, Open Graph-ը և twitter:card-ը։</p></div></div><form id="cms-seo-form" class="cms-card"><div class="cms-grid"><div class="field"><label for="cms-identity-name">Կայքի անունը</label><input id="cms-identity-name"></div><div class="field"><label for="cms-identity-tagline">Կայքի կարգախոսը</label><input id="cms-identity-tagline"></div><div class="field"><label for="cms-identity-domain">Հիմնական site URL</label><input id="cms-identity-domain" type="url"></div><div class="field"><label for="cms-default-language">Լռելյայն լեզու</label><select id="cms-default-language"><option value="hy">Հայերեն</option><option value="ru">Русский</option><option value="en">English</option></select></div><div class="field"><label for="cms-theme-color">theme-color</label><input id="cms-theme-color" type="color" value="#000000"></div><div class="field"><label for="cms-default-image">Default social image</label><input id="cms-default-image" placeholder="/media/share-image.png"></div><div class="field"><label for="cms-default-twitter-site">Default twitter:site</label><input id="cms-default-twitter-site" placeholder="@account"></div></div><hr style="border:0;border-top:1px solid var(--line);margin:20px 0"><div class="cms-grid"><div class="field"><label for="cms-seo-page">Էջ</label><select id="cms-seo-page"></select></div><div class="field"><label for="cms-seo-lang">Լեզու</label><select id="cms-seo-lang"><option value="hy">Հայերեն</option><option value="ru">Русский</option><option value="en">English</option></select></div><div class="field"><label for="cms-seo-title">HTML &lt;title&gt; / SEO title</label><input id="cms-seo-title"></div><div class="field"><label for="cms-seo-h1">Տեսանելի H1</label><input id="cms-seo-h1"></div><div class="field cms-full"><label for="cms-seo-description">meta name="description"</label><textarea id="cms-seo-description" rows="3"></textarea></div><div class="field cms-full"><label for="cms-seo-keywords">meta name="keywords"</label><input id="cms-seo-keywords"><small class="subtle-note">Meta keywords-ը Google-ի ranking factor չէ, սակայն դաշտը հասանելի է կառավարման համար։</small></div><div class="field"><label for="cms-seo-canonical">Canonical URL</label><input id="cms-seo-canonical" type="url"></div><div class="field"><label for="cms-seo-robots">meta name="robots"</label><select id="cms-seo-robots"><option>index, follow</option><option>index, follow, max-image-preview:large</option><option>noindex, nofollow</option><option>noindex, follow</option><option>index, nofollow</option></select></div></div><details class="connection-details" open><summary>Open Graph metadata</summary><div class="cms-grid" style="margin-top:14px"><div class="field"><label for="cms-og-title">og:title</label><input id="cms-og-title"></div><div class="field"><label for="cms-og-type">og:type</label><select id="cms-og-type"><option value="website">website</option><option value="article">article</option><option value="profile">profile</option></select></div><div class="field cms-full"><label for="cms-og-description">og:description</label><textarea id="cms-og-description" rows="2"></textarea></div><div class="field cms-full"><label for="cms-og-image">og:image</label><input id="cms-og-image" placeholder="/media/share-image.png"></div><div class="field cms-full"><label for="cms-og-image-alt">og:image:alt</label><input id="cms-og-image-alt"></div></div></details><details class="connection-details" open><summary>X / Twitter Card metadata</summary><div class="cms-grid" style="margin-top:14px"><div class="field"><label for="cms-twitter-card">meta name="twitter:card"</label><select id="cms-twitter-card"><option value="summary_large_image">summary_large_image</option><option value="summary">summary</option></select></div><div class="field"><label for="cms-twitter-site">twitter:site</label><input id="cms-twitter-site" placeholder="@account"></div><div class="field"><label for="cms-twitter-title">twitter:title</label><input id="cms-twitter-title"></div><div class="field"><label for="cms-twitter-image">twitter:image</label><input id="cms-twitter-image"></div><div class="field cms-full"><label for="cms-twitter-description">twitter:description</label><textarea id="cms-twitter-description" rows="2"></textarea></div><div class="field cms-full"><label for="cms-twitter-image-alt">twitter:image:alt</label><input id="cms-twitter-image-alt"></div><div class="field cms-full"><label for="cms-twitter-creator">twitter:creator</label><input id="cms-twitter-creator" placeholder="@creator"></div></div></details><details class="connection-details"><summary>Final metadata preview</summary><pre id="cms-seo-preview" class="cms-preview"></pre></details><div id="cms-seo-error" class="error"></div><div class="cms-row-actions" style="margin-top:16px"><button type="button" id="cms-seo-reload" class="btn outline">Վերաբեռնել տվյալները</button><button type="button" id="cms-seo-save" class="btn primary">Պահպանել SEO-ն</button></div><div class="subtle-note" style="margin-top:10px">Փոփոխությունը ստեղծում է commit։ SEO metadata-ն HTML-ում կգեներացվի GitHub Pages build-ի ընթացքում։</div></form>';
 main.appendChild(seo);
 var visual=document.createElement('section');visual.id='cms-visual-view';visual.className='hidden';visual.innerHTML='<div class="cms-heading"><div><h2>Վիզուալ էջի խմբագրիչ</h2><p>Սեղմեք որևէ տարրի վրա նախադիտման մեջ՝ դրա տեքստը, հղումը, նկարը կամ ոճը կառավարելու համար։</p></div><button type="button" id="cms-visual-reload" class="btn outline">↻ Թարմացնել նախադիտումը</button></div><div class="cms-card"><div class="cms-grid"><div class="field"><label for="cms-visual-page">Էջ</label><select id="cms-visual-page"></select></div><div class="field"><label for="cms-visual-lang">Լեզու</label><select id="cms-visual-lang"><option value="hy">Հայերեն</option><option value="ru">Русский</option><option value="en">English</option></select></div></div><div class="cms-warning">Արտաքին iframe-ների ներսի տարրերը չեն խմբագրվում։ Վիզուալ խմբագրիչը կառավարում է միայն MatchPro-ի նույն domain-ից բեռնվող էջի տարրերը։</div><div class="cms-two-col"><div class="cms-frame-wrap"><iframe id="cms-visual-frame" class="cms-frame" title="MatchPro visual editor preview"></iframe></div><div class="cms-editor-controls"><div class="cms-selected"><small>Ընտրված տարր</small><code id="cms-visual-selector">Ոչինչ ընտրված չէ</code><p id="cms-visual-note" class="subtle-note">Նախադիտման մեջ սեղմեք տարրի վրա։</p></div><div class="field"><label for="cms-visual-text">Տեքստ</label><textarea id="cms-visual-text" rows="3" disabled></textarea></div><div class="field"><label for="cms-visual-href">Link URL</label><input id="cms-visual-href" disabled></div><div class="field"><label for="cms-visual-src">Image URL</label><input id="cms-visual-src" disabled><input id="cms-visual-file" type="file" accept="image/png,image/jpeg,image/webp" disabled><small class="subtle-note">Հին նկարը կրկին չի վերբեռնվի։ Ֆայլի ընտրությամբ միայն նոր նկար է վերբեռնվում։</small></div><div class="field"><label for="cms-visual-alt">Alt text</label><input id="cms-visual-alt" disabled></div><div class="field"><label for="cms-visual-title-attr">Title attribute</label><input id="cms-visual-title-attr" disabled></div><label class="check-row"><input type="checkbox" id="cms-visual-hidden" disabled> Թաքցնել տարրը</label><div class="cms-grid"><div class="field"><label for="cms-visual-color">Text color</label><input type="color" id="cms-visual-color" value="#ffffff" disabled></div><div class="field"><label for="cms-visual-bg">Background</label><input type="color" id="cms-visual-bg" value="#000000" disabled></div><div class="field"><label for="cms-visual-size">Font size</label><input id="cms-visual-size" placeholder="16px" disabled></div><div class="field"><label for="cms-visual-weight">Font weight</label><select id="cms-visual-weight" disabled><option value="">Default</option><option value="400">400</option><option value="500">500</option><option value="600">600</option><option value="700">700</option><option value="800">800</option></select></div><div class="field"><label for="cms-visual-align">Text alignment</label><select id="cms-visual-align" disabled><option value="">Default</option><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></div><div class="field"><label for="cms-visual-width">Width</label><input id="cms-visual-width" placeholder="100% / 320px" disabled></div><div class="field"><label for="cms-visual-margin">Margin</label><input id="cms-visual-margin" placeholder="0 0 16px" disabled></div><div class="field"><label for="cms-visual-padding">Padding</label><input id="cms-visual-padding" placeholder="12px" disabled></div><div class="field"><label for="cms-visual-radius">Border radius</label><input id="cms-visual-radius" placeholder="12px" disabled></div></div><div class="cms-row-actions"><button class="btn outline" id="cms-visual-apply" type="button" disabled>Նախադիտել</button><button class="btn primary" id="cms-visual-save" type="button" disabled>Պահպանել տարրը</button></div><div id="cms-visual-error" class="error"></div></div></div></div></section>';
 main.appendChild(visual);
}
function readMeta(doc,sel,attr){var el=doc.querySelector(sel);return el?(attr?el.getAttribute(attr)||'':el.getAttribute('content')||''):''}
function resolveBase(){
 if(api&&api.baseUrl)return api.baseUrl.replace(/\/+$/,'');
 var path=location.pathname.indexOf('/matchpro/')>=0?'/matchpro':'';
 return location.origin+path;
}
async function loadPages(){
 if(!api)return;
 $('cms-pages-error').textContent='';
 try{
  var files=await api.listRoot(),list=[{key:'home',filename:'index.html',label:'Գլխավոր էջ',kind:'home'}],known={};
  currentChannels().forEach(function(c){var key='channel:'+String(c.id);list.push({key:key,filename:c.file||'',label:(c.nameHy||c.nameRu||c.nameEn||'Channel')+' · '+c.id,kind:'channel',channelId:String(c.id)});if(c.file)known[String(c.file).toLowerCase()]=true});
  if(Array.isArray(files))files.forEach(function(f){if(!f||f.type!=='file'||!/\.html?$/i.test(f.name)||/^(index|403|404|500)\.html?$/i.test(f.name)||known[String(f.name).toLowerCase()]||/^(app|iframe)\//i.test(f.path||''))return;list.push({key:'page:'+f.name,filename:f.name,label:f.name,kind:'page'})});
  pages=list;
  fillPageSelect('cms-seo-page');fillPageSelect('cms-visual-page');renderPageCards();
 }catch(e){$('cms-pages-error').textContent='Չհաջողվեց ստանալ էջերի ցանկը։ '+(e.message||'');pages=[{key:'home',filename:'index.html',label:'Գլխավոր էջ',kind:'home'}];fillPageSelect('cms-seo-page');fillPageSelect('cms-visual-page')}
}
function fillPageSelect(id){
 var s=$(id);if(!s)return;var old=s.value;s.innerHTML='';
 pages.forEach(function(p){var o=document.createElement('option');o.value=p.key;o.textContent=p.label;s.appendChild(o)});
 if(pages.some(function(p){return p.key===old}))s.value=old;
}
function renderPageCards(){
 var target=$('cms-page-list');if(!target)return;var q=($('cms-page-search').value||'').trim().toLowerCase();target.innerHTML='';
 pages.filter(function(p){return !q||(p.label+' '+p.filename+' '+p.key).toLowerCase().indexOf(q)>=0}).forEach(function(p){
  var card=document.createElement('article');card.className='cms-page-item';
  var label=document.createElement('strong');label.textContent=p.label;card.appendChild(label);
  var file=document.createElement('small');file.textContent=p.key==='home'?'Homepage metadata and content':(p.filename||p.key);card.appendChild(file);
  var action=document.createElement('div');action.className='cms-row-actions';
  var seo=document.createElement('button');seo.type='button';seo.className='btn outline small';seo.textContent='SEO / Meta';seo.addEventListener('click',function(){$('cms-seo-page').value=p.key;showCMSView('seo');loadSeoForm()});action.appendChild(seo);
  var vis=document.createElement('button');vis.type='button';vis.className='btn primary small';vis.textContent='Վիզուալ խմբագրում';vis.addEventListener('click',function(){$('cms-visual-page').value=p.key;showCMSView('visual');loadVisualFrame()});action.appendChild(vis);
  card.appendChild(action);target.appendChild(card);
 });
}
function showCMSView(view){
 if(api&&api.setView&&view!=='none')api.setView(view);
 var map={pages:'cms-pages-view',seo:'cms-seo-view',visual:'cms-visual-view'};
 Object.keys(map).forEach(function(k){$(map[k]).classList.toggle('hidden',k!==view)});
 document.querySelectorAll('[data-view]').forEach(function(b){b.classList.toggle('active',b.dataset.view===view)});
}
function mergedPageData(key,lang){
 var st=currentSettings(),h=st.home&&st.home[lang]||{},out={},ch=channelForKey(key),page=pages.find(function(p){return p.key===key});
 if(key==='home')out=Object.assign({},h);
 else if(ch){
  var s=lang==='hy'?'Hy':lang==='ru'?'Ru':'En';
  out={title:ch['title'+s]||ch.titleHy||ch.titleRu||ch.titleEn,description:ch['description'+s]||ch.descriptionHy||ch.descriptionRu||ch.descriptionEn,keywords:ch['keywords'+s]||ch.keywordsHy||ch.keywordsRu||ch.keywordsEn,h1:ch['name'+s]||ch.nameHy||ch.nameRu||ch.nameEn,ogTitle:ch['title'+s]||ch.titleHy,ogDescription:ch['description'+s]||ch.descriptionHy,ogType:'website',ogImage:ch.logo,twitterCard:'summary_large_image',twitterTitle:ch['title'+s]||ch.titleHy,twitterDescription:ch['description'+s]||ch.descriptionHy,twitterImage:ch.logo,robots:ch.indexable===false?'noindex, nofollow':'index, follow'};
 }else if(page&&page.filename){
  try{var doc=new DOMParser().parseFromString(api&&api.readTextFile? '':'','text/html')}catch(_){}
  out={};
 }
 var saved=st.seo&&st.seo.pages&&st.seo.pages[key]&&st.seo.pages[key][lang];
 if(saved)out=Object.assign(out,saved);
 if(key==='home'){
  out.h1=out.h1||out.intro||'';out.ogTitle=out.ogTitle||out.title||'';out.ogDescription=out.ogDescription||out.description||'';out.ogImage=out.ogImage||(st.identity&&st.identity.defaultOgImage)||'/media/share-image.png';out.ogType=out.ogType||'website';out.twitterCard=out.twitterCard||'summary_large_image';out.twitterTitle=out.twitterTitle||out.title||'';out.twitterDescription=out.twitterDescription||out.description||'';out.twitterImage=out.twitterImage||out.ogImage;out.twitterSite=out.twitterSite||(st.identity&&st.identity.twitterSite)||'';out.robots=out.robots||'index, follow';
 }
 return out;
}
async function loadPageFileMetadata(key,language){
 var p=pages.find(function(x){return x.key===key});if(!p||!p.filename||key==='home'||key.indexOf('channel:')===0)return {};
 try{
  var html=await api.readTextFile(p.filename),doc=new DOMParser().parseFromString(html,'text/html');
  return {title:doc.title||'',h1:(doc.querySelector('h1')||{}).textContent||'',description:readMeta(doc,'meta[name="description"]'),keywords:readMeta(doc,'meta[name="keywords"]'),canonical:readMeta(doc,'link[rel="canonical"]','href'),robots:readMeta(doc,'meta[name="robots"]')||'index, follow',ogTitle:readMeta(doc,'meta[property="og:title"]'),ogDescription:readMeta(doc,'meta[property="og:description"]'),ogType:readMeta(doc,'meta[property="og:type"]')||'website',ogImage:readMeta(doc,'meta[property="og:image"]'),ogImageAlt:readMeta(doc,'meta[property="og:image:alt"]'),twitterCard:readMeta(doc,'meta[name="twitter:card"]')||'summary_large_image',twitterTitle:readMeta(doc,'meta[name="twitter:title"]'),twitterDescription:readMeta(doc,'meta[name="twitter:description"]'),twitterImage:readMeta(doc,'meta[name="twitter:image"]'),twitterImageAlt:readMeta(doc,'meta[name="twitter:image:alt"]'),twitterSite:readMeta(doc,'meta[name="twitter:site"]'),twitterCreator:readMeta(doc,'meta[name="twitter:creator"]')}
 }catch(_){return {}}
}
function put(id,value){if($(id))$(id).value=value==null?'':String(value)}
function get(id){return $(id)?$(id).value.trim():''}
function fillIdentity(){
 var i=currentSettings().identity||{};
 put('cms-identity-name',i.name||'MatchPro');put('cms-identity-tagline',i.tagline||'');put('cms-identity-domain',i.domain||resolveBase()+'/');put('cms-default-language',i.defaultLanguage||'ru');put('cms-theme-color',i.themeColor||'#000000');put('cms-default-image',i.defaultOgImage||'/media/share-image.png');put('cms-default-twitter-site',i.twitterSite||'');
}
async function loadSeoForm(){
 if(!api)return;fillIdentity();var key=selectValue('cms-seo-page')||'home',lang=langValue();
 var data=mergedPageData(key,lang);
 if(key!=='home'&&key.indexOf('channel:')!==0)data=Object.assign(await loadPageFileMetadata(key,lang),data);
 var fields={'cms-seo-title':'title','cms-seo-h1':'h1','cms-seo-description':'description','cms-seo-keywords':'keywords','cms-seo-canonical':'canonical','cms-seo-robots':'robots','cms-og-title':'ogTitle','cms-og-description':'ogDescription','cms-og-type':'ogType','cms-og-image':'ogImage','cms-og-image-alt':'ogImageAlt','cms-twitter-card':'twitterCard','cms-twitter-title':'twitterTitle','cms-twitter-description':'twitterDescription','cms-twitter-image':'twitterImage','cms-twitter-image-alt':'twitterImageAlt','cms-twitter-site':'twitterSite','cms-twitter-creator':'twitterCreator'};
 Object.keys(fields).forEach(function(id){put(id,data[fields[id]])});
 if(!$('cms-seo-robots').value)$('cms-seo-robots').value='index, follow';
 if(!$('cms-og-type').value)$('cms-og-type').value='website';
 if(!$('cms-twitter-card').value)$('cms-twitter-card').value='summary_large_image';
 updateSeoPreview();
}
function updateSeoPreview(){
 var title=get('cms-seo-title'),desc=get('cms-seo-description'),keywords=get('cms-seo-keywords'),canonical=get('cms-seo-canonical'),robots=get('cms-seo-robots');
 var lines=[];function meta(name,value,kind){if(value)lines.push('<meta '+(kind||'name')+'="'+name+'" content="'+value.replace(/&/g,'&amp;').replace(/"/g,'&quot;')+'">')}
 if(title)lines.push('<title>'+esc(title)+'</title>');meta('description',desc);meta('keywords',keywords);meta('robots',robots);if(canonical)lines.push('<link rel="canonical" href="'+esc(canonical)+'">');
 meta('og:title',get('cms-og-title')||title,'property');meta('og:description',get('cms-og-description')||desc,'property');meta('og:type',get('cms-og-type')||'website','property');meta('og:image',get('cms-og-image')||get('cms-default-image'),'property');meta('og:image:alt',get('cms-og-image-alt'),'property');
 meta('twitter:card',get('cms-twitter-card')||'summary_large_image');meta('twitter:title',get('cms-twitter-title')||get('cms-og-title')||title);meta('twitter:description',get('cms-twitter-description')||get('cms-og-description')||desc);meta('twitter:image',get('cms-twitter-image')||get('cms-og-image')||get('cms-default-image'));meta('twitter:image:alt',get('cms-twitter-image-alt')||get('cms-og-image-alt'));meta('twitter:site',get('cms-twitter-site')||get('cms-default-twitter-site'));meta('twitter:creator',get('cms-twitter-creator'));
 $('cms-seo-preview').textContent=lines.join('\n');
}
async function saveSeo(){
 if(loading||!api)return;var err=$('cms-seo-error');err.textContent='';
 var domain=get('cms-identity-domain');
 if(domain&&!safeUrl(domain,false)){err.textContent='Հիմնական URL-ը պետք է լինի վավեր http(s) հասցե։';return}
 if(get('cms-seo-canonical')&&!safeUrl(get('cms-seo-canonical'),false)){err.textContent='Canonical-ը պետք է լինի վավեր http(s) URL։';return}
 for(var id of ['cms-default-image','cms-og-image','cms-twitter-image'])if(get(id)&&!safeUrl(get(id),true)){err.textContent='Նկարի URL-ը սխալ է՝ '+id;return}
 var key=selectValue('cms-seo-page')||'home',lang=langValue(),st=JSON.parse(JSON.stringify(currentSettings())),i=st.identity||{};
 st.identity=Object.assign({},i,{name:get('cms-identity-name')||'MatchPro',tagline:get('cms-identity-tagline'),domain:domain||resolveBase()+'/',defaultLanguage:get('cms-default-language')||'ru',themeColor:get('cms-theme-color')||'#000000',defaultOgImage:get('cms-default-image')||'/media/share-image.png',twitterSite:get('cms-default-twitter-site')});
 var values={title:get('cms-seo-title'),h1:get('cms-seo-h1'),description:get('cms-seo-description'),keywords:get('cms-seo-keywords'),canonical:get('cms-seo-canonical'),robots:get('cms-seo-robots')||'index, follow',ogTitle:get('cms-og-title'),ogDescription:get('cms-og-description'),ogType:get('cms-og-type')||'website',ogImage:get('cms-og-image'),ogImageAlt:get('cms-og-image-alt'),twitterCard:get('cms-twitter-card')||'summary_large_image',twitterTitle:get('cms-twitter-title'),twitterDescription:get('cms-twitter-description'),twitterImage:get('cms-twitter-image'),twitterImageAlt:get('cms-twitter-image-alt'),twitterSite:get('cms-twitter-site'),twitterCreator:get('cms-twitter-creator')};
 if(key==='home'){
  st.home=st.home||{};st.home[lang]=Object.assign({},st.home[lang]||{},values,{intro:values.h1});
 }else{
  st.seo=st.seo||{};st.seo.pages=st.seo.pages||{};st.seo.pages[key]=st.seo.pages[key]||{};st.seo.pages[key][lang]=values;
 }
 loading=true;$('cms-seo-save').disabled=true;$('cms-seo-save').textContent='Պահպանվում է…';
 try{await api.commitChanges({'main/js/site-settings.json':JSON.stringify(st,null,2)+'\n'},'Update MatchPro SEO and social metadata');settings=st;api.setSettings(st);api.notify('SEO/meta տվյալները պահպանվեցին։ Հրապարակված HTML-ը կթարմացվի GitHub Pages deploy-ից հետո։');updateSeoPreview()}
 catch(e){err.textContent=e.message||'Չհաջողվեց պահպանել SEO տվյալները։'}
 finally{loading=false;$('cms-seo-save').disabled=false;$('cms-seo-save').textContent='Պահպանել SEO-ն'}
}
function cssSelector(el){
 if(el.id)return '#'+el.id.replace(/([^a-zA-Z0-9_-])/g,'\\$1');
 var parts=[],n=el;
 while(n&&n.nodeType===1&&n!==n.ownerDocument.documentElement){var tag=n.tagName.toLowerCase();if(n.id){parts.unshift('#'+n.id.replace(/([^a-zA-Z0-9_-])/g,'\\$1'));break}var p=n.parentElement;if(p){var same=Array.prototype.filter.call(p.children,function(x){return x.tagName===n.tagName});if(same.length>1)tag+=':nth-of-type('+(Array.prototype.indexOf.call(same,n)+1)+')'}parts.unshift(tag);n=n.parentElement}
 return parts.join(' > ');
}
function visualEnabled(yes){['cms-visual-text','cms-visual-href','cms-visual-src','cms-visual-file','cms-visual-alt','cms-visual-title-attr','cms-visual-hidden','cms-visual-color','cms-visual-bg','cms-visual-size','cms-visual-weight','cms-visual-align','cms-visual-width','cms-visual-margin','cms-visual-padding','cms-visual-radius','cms-visual-apply','cms-visual-save'].forEach(function(id){if($(id))$(id).disabled=!yes})}
function savedOverride(key,lang,selector){var s=currentSettings(),a=s.contentOverrides||{},b=a[key]||{},c=b[lang]||{};return c[selector]||{}}
function loadVisualFrame(){
 var frame=$('cms-visual-frame');if(!frame)return;selectedElement=null;selectedSelector='';frameDoc=null;visualEnabled(false);
 $('cms-visual-selector').textContent='Ոչինչ ընտրված չէ';$('cms-visual-note').textContent='Սեղմեք նախադիտման տարրի վրա։';
 ['cms-visual-text','cms-visual-href','cms-visual-src','cms-visual-alt','cms-visual-title-attr','cms-visual-size','cms-visual-weight','cms-visual-align','cms-visual-width','cms-visual-margin','cms-visual-padding','cms-visual-radius'].forEach(function(id){if($(id))$(id).value=''});
 frame.src=previewUrl(pages.find(function(p){return p.key===selectValue('cms-visual-page')})||pages[0],selectValue('cms-visual-lang')||'hy');
}
function selectElement(el){
 if(!el||!el.tagName)return;var tag=el.tagName.toLowerCase();if(['html','head','body','script','style','meta','link','svg','path'].indexOf(tag)>=0)return;
 selectedElement=el;selectedSelector=cssSelector(el);var key=selectValue('cms-visual-page'),lang=selectValue('cms-visual-lang'),saved=savedOverride(key,lang,selectedSelector),style=saved.styles||{};
 $('cms-visual-selector').textContent=selectedSelector;$('cms-visual-note').textContent=tag.toUpperCase()+(el.id?' · #'+el.id:'')+(el.children.length?' · ունի ներքին տարրեր':'');
 $('cms-visual-text').value=el.children.length?'':el.textContent||'';$('cms-visual-text').disabled=el.children.length>0;
 $('cms-visual-href').value=tag==='a'?el.getAttribute('href')||'':'';$('cms-visual-src').value=tag==='img'?el.getAttribute('src')||'':'';$('cms-visual-alt').value=tag==='img'?el.getAttribute('alt')||'':'';
 $('cms-visual-title-attr').value=el.getAttribute('title')||'';$('cms-visual-hidden').checked=!!el.hidden;
 $('cms-visual-color').value=/^#[0-9a-f]{6}$/i.test(style.color||'')?style.color:'#ffffff';$('cms-visual-bg').value=/^#[0-9a-f]{6}$/i.test(style.backgroundColor||'')?style.backgroundColor:'#000000';
 $('cms-visual-size').value=style.fontSize||'';$('cms-visual-weight').value=style.fontWeight||'';$('cms-visual-align').value=style.textAlign||'';$('cms-visual-width').value=style.width||'';$('cms-visual-margin').value=style.margin||'';$('cms-visual-padding').value=style.padding||'';$('cms-visual-radius').value=style.borderRadius||'';
 visualEnabled(true);$('cms-visual-text').disabled=el.children.length>0;el.style.outline='2px solid #8d8bff';
}
function lengthOk(value){return !value||/^(auto|inherit|initial|unset|0|[0-9.]+(px|%|rem|em|vw|vh)|[0-9.]+(px|%|rem|em|vw|vh)(\s+[0-9.]+(px|%|rem|em|vw|vh)){1,3})$/i.test(value)}
function visualValue(){
 var el=selectedElement,tag=el.tagName.toLowerCase(),v={};
 if(el.children.length===0)v.text=$('cms-visual-text').value;
 if(tag==='a')v.href=$('cms-visual-href').value.trim();
 if(tag==='img'){v.src=$('cms-visual-src').value.trim();v.alt=$('cms-visual-alt').value}
 v.title=$('cms-visual-title-attr').value;v.hidden=$('cms-visual-hidden').checked;
 var styles={},old=(savedOverride(selectValue('cms-visual-page'),selectValue('cms-visual-lang'),selectedSelector).styles)||{};
 [['color','cms-visual-color','#ffffff'],['backgroundColor','cms-visual-bg','#000000']].forEach(function(p){if($(p[1]).value!==p[2])styles[p[0]]=$(p[1]).value;else if(old[p[0]])styles[p[0]]=''});
 [['fontSize','cms-visual-size'],['width','cms-visual-width'],['margin','cms-visual-margin'],['padding','cms-visual-padding'],['borderRadius','cms-visual-radius']].forEach(function(p){var val=$(p[1]).value.trim();if(val&&!lengthOk(val))throw new Error('CSS չափի արժեքը սխալ է։');if(val)styles[p[0]]=val;else if(old[p[0]])styles[p[0]]=''});
 ['fontWeight','textAlign'].forEach(function(p){var id=p==='fontWeight'?'cms-visual-weight':'cms-visual-align',val=$(id).value;if(val)styles[p]=val;else if(old[p])styles[p]=''});
 v.styles=styles;return v;
}
function applyVisual(){
 if(!selectedElement)return;try{var el=selectedElement,v=visualValue();
 if(v.href!==undefined){if(v.href&&!safeUrl(v.href,true))throw new Error('Հղումը պետք է լինի http(s) կամ տեղական URL։');if(v.href)el.setAttribute('href',v.href);else el.removeAttribute('href')}
 if(v.src!==undefined){if(v.src&&!safeUrl(v.src,true))throw new Error('Նկարի URL-ը սխալ է։');if(v.src)el.setAttribute('src',v.src);else el.removeAttribute('src')}
 if(v.alt!==undefined)el.setAttribute('alt',v.alt);if(v.text!==undefined&&el.children.length===0)el.textContent=v.text;
 if(v.title)el.setAttribute('title',v.title);else el.removeAttribute('title');el.hidden=v.hidden;
 Object.keys(v.styles).forEach(function(p){if(v.styles[p])el.style[p]=v.styles[p];else el.style[p]=''});$('cms-visual-error').textContent=''
 }catch(e){$('cms-visual-error').textContent=e.message||String(e)}
}
function attachVisualFrame(){
 var frame=$('cms-visual-frame');try{var doc=frame.contentDocument;if(!doc||!doc.body)throw new Error('not loaded');if(frameDoc===doc)return;frameDoc=doc;
 doc.addEventListener('click',function(event){var el=event.target&&event.target.nodeType===1?event.target:event.target.parentElement;if(!el)return;event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();selectElement(el)},true);
 doc.addEventListener('mouseover',function(event){var el=event.target&&event.target.nodeType===1?event.target:event.target.parentElement;if(el&&el.style&&el!==selectedElement&&!['HTML','BODY','HEAD','SCRIPT','STYLE'].includes(el.tagName))el.style.outline='1px dashed #8d8bff'},true);
 doc.addEventListener('mouseout',function(event){var el=event.target&&event.target.nodeType===1?event.target:event.target.parentElement;if(el&&el!==selectedElement&&el.style)el.style.outline=''},true);
 doc.documentElement.style.cursor='crosshair';$('cms-visual-note').textContent='Նախադիտումը պատրաստ է։ Ընտրեք տարրը։'
 }catch(_){$('cms-visual-note').textContent='Նախադիտումը հասանելի չէ․ էջը պետք է բացվի նույն domain-ից։'}
}
async function saveVisual(){
 if(!api||!selectedElement||!selectedSelector||loading)return;$('cms-visual-error').textContent='';
 var file=$('cms-visual-file').files&&$('cms-visual-file').files[0];
 if(file&&(file.size>5*1024*1024||!/^image\/(png|jpeg|webp)$/i.test(file.type))){$('cms-visual-error').textContent='Ընտրեք PNG, JPG կամ WEBP պատկեր մինչև 5 ՄԲ։';return}
 var values;try{values=visualValue();if(values.href&&!safeUrl(values.href,true))throw new Error('Հղումը սխալ է։');if(values.src&&!safeUrl(values.src,true))throw new Error('Նկարի URL-ը սխալ է։')}catch(e){$('cms-visual-error').textContent=e.message;return}
 var st=JSON.parse(JSON.stringify(currentSettings())),key=selectValue('cms-visual-page'),lang=selectValue('cms-visual-lang'),changes={};
 st.contentOverrides=st.contentOverrides||{};st.contentOverrides[key]=st.contentOverrides[key]||{};st.contentOverrides[key][lang]=st.contentOverrides[key][lang]||{};
 if(file){
  var bytes=await file.arrayBuffer(),binary='',u=new Uint8Array(bytes);for(var i=0;i<u.length;i+=0x8000)binary+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));
  var ext=file.type==='image/jpeg'?'jpg':file.type==='image/webp'?'webp':'png',asset='uploads/'+(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2))+'.'+ext;
  values.src='/'+asset;changes[asset]={content:btoa(binary),encoding:'base64'};$('cms-visual-src').value=values.src;
 }
 st.contentOverrides[key][lang][selectedSelector]=values;changes['main/js/site-settings.json']=JSON.stringify(st,null,2)+'\n';
 loading=true;$('cms-visual-save').disabled=true;
 try{await api.commitChanges(changes,'Update MatchPro visual content');settings=st;api.setSettings(st);$('cms-visual-file').value='';applyVisual();api.notify('Տարրի փոփոխությունը պահպանվեց։ Կայքում կերևա deploy-ից հետո։')}
 catch(e){$('cms-visual-error').textContent=e.message||'Պահպանումը չհաջողվեց'}
 finally{loading=false;$('cms-visual-save').disabled=false}
}
function bindEvents(){
 document.querySelectorAll('[data-view]').forEach(function(button){button.addEventListener('click',function(){if(['pages','seo','visual'].indexOf(button.dataset.view)<0)showCMSView('none')})});
 document.querySelectorAll('[data-view="pages"],[data-view="seo"],[data-view="visual"]').forEach(function(button){button.addEventListener('click',function(){var v=button.dataset.view;showCMSView(v);if(v==='pages')renderPageCards();if(v==='seo')loadSeoForm();if(v==='visual')loadVisualFrame()})});
 $('cms-refresh-pages').addEventListener('click',loadPages);$('cms-page-search').addEventListener('input',renderPageCards);
 $('cms-seo-page').addEventListener('change',loadSeoForm);$('cms-seo-lang').addEventListener('change',loadSeoForm);
 $('cms-seo-save').addEventListener('click',saveSeo);$('cms-seo-reload').addEventListener('click',loadSeoForm);
 ['cms-seo-title','cms-seo-h1','cms-seo-description','cms-seo-keywords','cms-seo-canonical','cms-seo-robots','cms-og-title','cms-og-description','cms-og-type','cms-og-image','cms-og-image-alt','cms-twitter-card','cms-twitter-title','cms-twitter-description','cms-twitter-image','cms-twitter-image-alt','cms-twitter-site','cms-twitter-creator'].forEach(function(id){$(id).addEventListener('input',updateSeoPreview);$(id).addEventListener('change',updateSeoPreview)});
 $('cms-visual-frame').addEventListener('load',attachVisualFrame);$('cms-visual-page').addEventListener('change',loadVisualFrame);$('cms-visual-lang').addEventListener('change',loadVisualFrame);$('cms-visual-reload').addEventListener('click',loadVisualFrame);$('cms-visual-apply').addEventListener('click',applyVisual);$('cms-visual-save').addEventListener('click',saveVisual);
}
function initialize(){
 api=window.MATCHPRO_ADMIN_API;if(!api)return;
 root=(api.baseUrl||resolveBase()).replace(/\/+$/,'');settings=api.getSettings()||{};channels=api.getChannels()||[];
 loadPages().then(function(){fillIdentity();loadSeoForm()});
}
function boot(){
 if(!document.querySelector('#app-screen main'))return;
 addNavViews();bindEvents();
 document.addEventListener('matchpro:admin-ready',initialize);
 if(window.MATCHPRO_ADMIN_SESSION_READY)initialize();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();