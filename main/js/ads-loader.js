(function(){'use strict';
if(window.MATCHPRO_ADS_LOADED)return;
window.MATCHPRO_ADS_LOADED=true;

var PROVIDERS=['n6wxm.com','nap5k.com'];
var marked=[];

function isProviderNode(node){
  if(!node||node.nodeType!==1)return false;
  var tag=String(node.tagName||'').toLowerCase();
  var src='';
  try{src=String(node.src||node.getAttribute('src')||'').toLowerCase()}catch(_){}
  var idcls=(String(node.id||'')+' '+String(node.className||'')).toLowerCase();
  if(PROVIDERS.some(function(p){return src.indexOf(p)!==-1}))return true;
  if(/ad-|ads|advert|vignette|popup|overlay|nap5k|n6wxm/.test(idcls))return true;
  if(tag==='iframe'&&src)return true;
  return false;
}

function watchProviderNodes(){
  if(!window.MutationObserver)return;
  var root=document.documentElement;
  if(!root)return;
  var observer=new MutationObserver(function(records){
    records.forEach(function(record){
      Array.prototype.forEach.call(record.addedNodes,function(node){
        if(isProviderNode(node)){
          node.setAttribute('data-matchpro-provider-ad','1');
          marked.push(node);
        }
        if(node&&node.querySelectorAll){
          node.querySelectorAll('iframe,script,[id],[class]').forEach(function(child){
            if(isProviderNode(child)){
              child.setAttribute('data-matchpro-provider-ad','1');
              marked.push(child);
            }
          });
        }
      });
    });
  });
  observer.observe(root,{childList:true,subtree:true});
}

function cleanupOnBack(){
  var nav=null;
  try{nav=performance.getEntriesByType('navigation')[0]}catch(_){}
  var back=!!(nav&&nav.type==='back_forward');
  function cleanup(){
    if(!back&&!arguments[0])return;
    marked.forEach(function(node){if(node&&node.parentNode)node.parentNode.removeChild(node)});
    marked=[];
    document.querySelectorAll('[data-matchpro-provider-ad="1"]').forEach(function(node){if(node.parentNode)node.parentNode.removeChild(node)});
    document.querySelectorAll('script[data-matchpro-ad],script[src*="n6wxm.com"],script[src*="nap5k.com"]').forEach(function(node){if(node.parentNode)node.parentNode.removeChild(node)});
  }
  window.addEventListener('pageshow',function(e){if(e.persisted||back)cleanup(e.persisted||back)});
}

watchProviderNodes();
cleanupOnBack();

function load(){
  var nav=null;
  try{nav=performance.getEntriesByType('navigation')[0]}catch(_){}
  if(nav&&nav.type==='back_forward')return;
  if(document.querySelector('script[data-matchpro-global-ads="1"]'))return;
  var s=document.createElement('script');
  s.src='/main/ads/ad.js';
  s.async=true;
  s.dataset.matchproGlobalAds='1';
  (document.head||document.documentElement).appendChild(s);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
