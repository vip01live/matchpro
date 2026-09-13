(function(){'use strict';
if(window.MATCHPRO_ADS_LOADED)return;
window.MATCHPRO_ADS_LOADED=true;

function getAdsScriptUrl(){
  var scripts=document.getElementsByTagName('script');
  for(var i=scripts.length-1;i>=0;i--){
    var src=scripts[i].src||scripts[i].getAttribute('src')||'';
    if(src.indexOf('ads-loader.js')!==-1){
      try{return new URL('../ads/ad.js',src).href}catch(_){}
    }
  }
  return new URL('/main/ads/ad.js',window.location.origin).href;
}

function load(){
  if(document.querySelector('script[data-matchpro-global-ads="1"]'))return;
  var s=document.createElement('script');
  s.src=getAdsScriptUrl();
  s.async=true;
  s.dataset.matchproGlobalAds='1';
  s.onload=function(){window.MATCHPRO_GLOBAL_ADS_READY=true;};
  s.onerror=function(){
    /* Fallback for deployments where the loader URL was rewritten. */
    var fallback=document.createElement('script');
    fallback.src=new URL('/main/ads/ad.js',window.location.origin).href;
    fallback.async=true;
    fallback.dataset.matchproGlobalAds='1';
    (document.head||document.documentElement).appendChild(fallback);
  };
  (document.head||document.documentElement).appendChild(s);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
