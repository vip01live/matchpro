(function(){'use strict';
const channels=Array.isArray(window.MATCHPRO_CHANNELS)?window.MATCHPRO_CHANNELS:[];
const params=new URLSearchParams(location.search),path=location.pathname.replace(/\/+$/,''),pathMatch=path.match(/\/([0-9]{4})(?:&lang=(hy|ru|en))?$/i);
const requestedId=params.get('id')||(pathMatch&&pathMatch[1]);
const requestedLang=(params.get('lang')||(pathMatch&&pathMatch[2])||'').toLowerCase();
const pageFile=(location.pathname.split('/').pop()||'index.html').toLowerCase();
const origin=location.origin;
function get(k){try{return localStorage.getItem(k)}catch(_){return null}}
function set(k,v){try{localStorage.setItem(k,v)}catch(_) {}}
function detectLanguage(){if(requestedLang==='hy'||requestedLang==='ru'||requestedLang==='en')return requestedLang;const saved=get('matchpro-language');if(saved==='hy'||saved==='ru'||saved==='en')return saved;const b=(navigator.language||'').toLowerCase();if(b.indexOf('hy')===0)return'hy';if(/^(ru|be|kk|ky|uz)(-|$)/.test(b))return'ru';const identity=window.MATCHPRO_SITE_SETTINGS&&window.MATCHPRO_SITE_SETTINGS.siteIdentity;const fallback=identity&&identity.defaultLanguage;return['hy','ru','en'].includes(fallback)?fallback:'en'}
const lang=detectLanguage();if(requestedLang||get('matchpro-language'))set('matchpro-language',lang);document.documentElement.lang=lang;
const channel=requestedId?channels.find(x=>String(x.id)===String(requestedId)):channels.find(x=>String(x.file).toLowerCase()===pageFile);
const dictionaries={
hy:{intro:'Լավագույն մարզական իրադարձությունները՝ ուղիղ եթերում',info:'Բարի գալուստ սպորտի աշխարհ։ Այստեղ կարող եք դիտել ֆուտբոլի, հոկեյի, բասկետբոլի և այլ մարզաձևերի ուղիղ հեռարձակումներ։ Հետևեք սիրելի թիմերին, կարևոր մրցաշարերին և մարզական իրադարձություններին մեկ վայրում։',watch:'Դիտել առցանց — ',related:'Այլ մարզական ալիքներ',copyright:'Հեղինակային իրավունք',homeLink:'Գլխավոր',powered:'Աշխատում է՝',home:'Մարզական ալիքներ՝ ուղիղ եթերում'},
ru:{intro:'Лучшие матчи — в прямом эфире',info:'Добро пожаловать в увлекательный мир спорта! У нас вы найдёте прямые трансляции самых захватывающих турниров, эксклюзивные интервью с спортсменами и аналитические обзоры от ведущих экспертов. От футбола до тенниса, от баскетбола до мотоспорта — мы освещаем всё, что любят настоящие поклонники спорта. Почувствуйте напряжение больших соревнований и следите за выступлениями любимых команд в высоком качестве. Наши спортивные платформы работают для вас 24 часа в сутки, предлагая самые свежие и яркие моменты из мира спорта. Присоединяйтесь к нам и убедитесь — спорт не знает границ!',watch:'Смотреть онлайн – ',related:'Другие спортивные каналы',copyright:'Авторские права',homeLink:'Главная',powered:'Работает на',home:'Спортивные каналы онлайн в прямом эфире'},
en:{intro:'The best matches — live',info:'Welcome to the exciting world of sports! Here you will find live broadcasts of the most thrilling tournaments, exclusive athlete interviews, and expert analysis. From football and tennis to basketball and motorsport, we cover what true sports fans love. Feel the excitement of major competitions and follow your favorite teams in high quality. Our sports platform is available 24 hours a day, bringing you the latest and most exciting moments from the world of sports. Join us and discover that sport knows no boundaries!',watch:'Watch online – ',related:'Other sports channels',copyright:'Copyright',homeLink:'Home',powered:'Powered by',home:'Sports channels live online'}
};
const tr=dictionaries[lang]||dictionaries.hy;
function channelField(c,base){return c[base+(lang==='hy'?'Hy':lang==='ru'?'Ru':'En')]||c[base+'Hy']||c[base+'Ru']||c[base+'En']||'';}
function loadAds(){if(!requestedId&&(pageFile==='index.html'||pageFile===''))return;if(pageFile==='copyright-en.html'||pageFile==='copyright-ru.html'||pageFile==='copyright-hy.html')return;if(window.MATCHPRO_ADS_LOADED)return;var current=document.currentScript||document.querySelector('script[src*="/main/js/matchpro.js"]');if(!current)return;var s=document.createElement('script');s.src=new URL('ads-loader.js',current.src).href;s.async=true;s.dataset.matchproAutoAds='1';(document.head||document.documentElement).appendChild(s)}
function meta(name,value){let e=document.head.querySelector('meta[name="'+name+'"]');if(!value){if(e)e.remove();return}if(!e){e=document.createElement('meta');e.name=name;document.head.appendChild(e)}e.content=value}
function prop(name,value){let e=document.head.querySelector('meta[property="'+name+'"]');if(!value){if(e)e.remove();return}if(!e){e=document.createElement('meta');e.property=name;document.head.appendChild(e)}e.content=value}
function canonical(url){let e=document.head.querySelector('link[rel="canonical"]');if(!e){e=document.createElement('link');e.rel='canonical';document.head.appendChild(e)}e.href=url}
function idUrl(id){return '/?id='+encodeURIComponent(id)+'&lang='+lang}
function seo(){
 const isHomePage=pageFile==='index.html'||pageFile==='';if(!channel&&!isHomePage)return;
 const settings=window.MATCHPRO_SITE_SETTINGS||{},identity=settings.siteIdentity||{},home=(settings.home&&settings.home[lang])||{};
 let base=String(identity.baseUrl||origin);while(base.endsWith('/'))base=base.slice(0,-1);
 const url=channel?base+'/?id='+encodeURIComponent(channel.id)+'&lang='+lang:(home.canonical||base+'/?lang='+lang);
 const pageTitle=channel?channelField(channel,'title'):(home.title||tr.home);
 const description=channel?channelField(channel,'description'):(home.description||'');
 const keywords=channel?channelField(channel,'keywords'):(home.keywords||'');
 const resolvePublicUrl=function(value){var raw=String(value||'').trim();if(!raw)return '';if(/^https?:\/\//i.test(raw))return raw;var rel=raw.replace(/^\/+/,''),basePath='';try{basePath=new URL(base,origin).pathname.replace(/^\/+|\/+$/g,'')}catch(_){}if(basePath&&rel.indexOf(basePath+'/')===0)return new URL('/'+rel,origin).href;return new URL(rel,base+'/').href};
 const image=channel?(channel.logo?resolvePublicUrl(channel.logo):''):(home.ogImage||identity.shareImage||'');
 const ogTitle=channel?pageTitle:(home.ogTitle||pageTitle);
 const ogDescription=channel?description:(home.ogDescription||description);
 const twitterTitle=channel?pageTitle:(home.twitterTitle||ogTitle);
 const twitterDescription=channel?description:(home.twitterDescription||ogDescription);
 const twitterImage=channel?image:(home.twitterImage||image);
 document.title=pageTitle;meta('description',description);meta('keywords',keywords);
 meta('robots',channel&&(channel.published===false||channel.indexable===false)?'noindex,nofollow':(home.robots||'index, follow, max-image-preview:large'));
 meta('googlebot',channel&&(channel.published===false||channel.indexable===false)?'noindex,nofollow':(home.robots||'index, follow'));
 prop('og:title',ogTitle);prop('og:description',ogDescription);prop('og:type',channel?'website':(home.ogType||'website'));
 prop('og:site_name',identity.name||'MatchPro');prop('og:url',channel?url:(home.ogUrl||url));
 prop('og:image',image?resolvePublicUrl(image):'');prop('og:image:alt',channel?(channel.name||'MatchPro channel'):(home.ogImageAlt||''));
 const localeMap={hy:'hy_AM',ru:'ru_RU',en:'en_US'};prop('og:locale',channel?localeMap[lang]:(home.ogLocale||localeMap[lang]));
 meta('twitter:card',channel?'summary_large_image':(home.twitterCard||'summary_large_image'));
 meta('twitter:title',twitterTitle);meta('twitter:description',twitterDescription);meta('twitter:image',twitterImage?resolvePublicUrl(twitterImage):'');
 meta('twitter:image:alt',channel?(channel.name||'MatchPro channel'):(home.twitterImageAlt||home.ogImageAlt||''));
 meta('twitter:site',home.twitterSite||'');meta('twitter:creator',home.twitterCreator||'');
 canonical(url);
}
function renderHome(){if(requestedId||(pageFile!=='index.html'&&pageFile!==''))return;const grid=document.querySelector('.channel-grid');if(!grid)return;grid.innerHTML='';channels.filter(x=>x.published!==false).forEach(x=>{const a=document.createElement('a');a.className='channel';a.href=idUrl(x.id);const i=document.createElement('img');i.src=x.logo;i.loading='lazy';i.decoding='async';i.alt=channelField(x,'name');a.appendChild(i);grid.appendChild(a)})}
function renderRelated(){document.querySelectorAll('.related-grid').forEach(g=>{g.innerHTML='';channels.filter(x=>x.published!==false).forEach(x=>{if(channel&&String(x.id)===String(channel.id))return;const a=document.createElement('a');a.className='channel';a.href=idUrl(x.id);const i=document.createElement('img');i.src=x.logo;i.loading='lazy';i.decoding='async';i.alt=channelField(x,'name');a.appendChild(i);g.appendChild(a)})})}
function text(){const isHomePage=pageFile==='index.html'||pageFile==='';const intro=isHomePage?document.querySelector('.intro-text'):null;if(intro)intro.textContent=tr.intro;const info=isHomePage?document.querySelector('.info-text'):null;if(info)info.textContent=tr.info;const related=(isHomePage||channel)?document.querySelector('.related-title'):null;if(related)related.textContent=tr.related;const name=document.querySelector('.channel-name');if(name&&channel)name.innerHTML=tr.watch+'<span>'+channelField(channel,'name')+'</span>';const desc=document.querySelector('.channel-description');if(desc&&channel)desc.textContent=channelField(channel,'description');document.querySelectorAll('footer').forEach(f=>{f.querySelectorAll('.matchpro-footer-links,.matchpro-powered,.matchpro-copyright').forEach(e=>e.remove());let y=f.querySelector('#year');if(y)y.textContent=new Date().getFullYear();let links=document.createElement('div');links.className='matchpro-footer-links';let home=document.createElement('a');home.href='/?lang='+lang;home.textContent=tr.homeLink;let sep=document.createElement('span');sep.textContent='•';let c=document.createElement('a');c.className='matchpro-copyright';c.textContent=tr.copyright;c.href=lang==='hy'?'./copyright-hy.html':lang==='en'?'./copyright-en.html':'./copyright-ru.html';links.append(home,sep,c);f.appendChild(links);let p=document.createElement('p');p.className='matchpro-powered';p.innerHTML=tr.powered+' <a href="https://t.me/skyxcoding" target="_blank" rel="noopener noreferrer">SkyXCode</a>';f.appendChild(p)})}
function preventCopy(){if(document.documentElement.dataset.copyGuard)return;document.documentElement.dataset.copyGuard='1';['copy','cut','paste','contextmenu','selectstart','dragstart'].forEach(e=>document.addEventListener(e,x=>x.preventDefault(),{passive:false}));document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&['c','x','v','u','a','s','p'].includes(e.key.toLowerCase()))e.preventDefault()},{passive:false})}
function applyGlobalText(){const s=window.MATCHPRO_SITE_SETTINGS;const h=s&&s.home&&s.home[lang];if(!h||channel)return;if(h.intro)tr.intro=h.intro;if(h.info)tr.info=h.info}
function boot(){applyGlobalText();loadAds();seo();renderHome();renderRelated();text();if(typeof window.MATCHPRO_APPLY_BRANDING==='function')window.MATCHPRO_APPLY_BRANDING();preventCopy()}
window.MATCHPRO_BOOT=boot;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
if(window.MATCHPRO_SITE_SETTINGS_READY)window.MATCHPRO_SITE_SETTINGS_READY.then(function(){boot()});
})();
