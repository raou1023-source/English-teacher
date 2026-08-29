/** Runs in <head> so Chrome sees one valid manifest and a controlling service worker. */
export const PWA_BOOTSTRAP = `"use strict";
(function(){
  function dropGrok(){
    var nodes=document.querySelectorAll('link[rel="manifest"]');
    for(var i=0;i<nodes.length;i++){
      var href=nodes[i].getAttribute("href")||"";
      if(href.indexOf("__grok")!==-1) nodes[i].parentNode&&nodes[i].parentNode.removeChild(nodes[i]);
    }
  }
  dropGrok();
  try{
    new MutationObserver(dropGrok).observe(document.documentElement,{childList:true,subtree:true});
  }catch(e){}
  window.__pwaPrompt=window.__pwaPrompt||null;
  window.addEventListener("beforeinstallprompt",function(e){
    e.preventDefault();
    window.__pwaPrompt=e;
    window.dispatchEvent(new Event("pwa-ready"));
  });
  window.addEventListener("appinstalled",function(){ window.__pwaPrompt=null; });
  var h=location.hostname;
  if(!window.isSecureContext)return;
  if(h==="localhost"||h==="127.0.0.1")return;
  if(!("serviceWorker"in navigator))return;
  navigator.serviceWorker.register("/sw.js",{scope:"/",updateViaCache:"none"}).catch(function(){});
})();
`;
