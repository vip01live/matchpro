(function(){
  'use strict';

  if(window.MATCHPRO_ADS_LOADED)return;
  window.MATCHPRO_ADS_LOADED=true;

  function addScript(src,zone,name){
    if(document.querySelector('script[data-matchpro-ad="'+name+'"]'))return;
    var s=document.createElement('script');
    s.src=src;
    s.async=true;
    s.dataset.zone=zone;
    s.dataset.matchproAd=name;
    (document.head||document.documentElement).appendChild(s);
  }

  function load(){
    if(window.MATCHPRO_ADS_STARTED)return;
    window.MATCHPRO_ADS_STARTED=true;

    /* Load the advertising providers directly so Vercel, GitHub Pages,
       and custom domains do not depend on a local ad.js path. */
    addScript('https://n6wxm.com/vignette.min.js','11711828','n6wxm-zone-11711828');
    addScript('https://nap5k.com/tag.min.js','11711877','nap5k-zone-11711877');
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',load,{once:true});
  }else{
    load();
  }
})();
