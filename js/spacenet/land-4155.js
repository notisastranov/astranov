(function(){
  if(window.__SN_LAND_4155) return;
  window.__SN_LAND_4155=true;
  // Wipe fraudulent guest 3M seed (pill may show 0 while sn:avc is 3000000)
  try{
    var raw=localStorage.getItem("sn:avc");
    if(raw!=null && String(raw).replace(/[^0-9]/g,"")==="3000000"){
      localStorage.setItem("sn:avc","0");
      localStorage.removeItem("sn:ave-restored");
    }
  }catch(e){}
  function landQ(t){
    t=String(t||"").trim();
    if(!t) return "";
    var low=t.toLowerCase().replace(/[.!?]+$/,"");
    if(/^(hi|hey|hello|ok|okay|yes|no|thanks|reboot|γεια)$/.test(low)) return "";
    if(/\b(what|who|why|how|photosynthesis|pizza|order|call|pay|login|dating)\b/i.test(t)) return "";
    var m=t.match(/^(?:land(?:\s+(?:in|at|on))?|go(?:\s+to)?|fly(?:\s+to)?)\s+(.+)$/i);
    if(m) return m[1].replace(/[.!?]+$/,"").trim();
    if(/^nairobi(?:\s*,?\s*kenya)?$/i.test(low)) return t;
    return "";
  }
  function geocode(q){
    var url="https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q="+encodeURIComponent(q);
    return fetch(url,{headers:{Accept:"application/json","Accept-Language":"en","User-Agent":"AstranovSpaceNet/1"}}).then(function(r){ return r.json(); }).then(function(rows){
      var r=rows&&rows[0];
      if(!r||!isFinite(+r.lat)) return null;
      return {lat:+r.lat,lng:+r.lon,name:r.name||String(r.display_name||"").split(",")[0]||q};
    }).catch(function(){ return null; });
  }
  function goNamed(q){
    q=String(q||"").trim();
    if(!q||!window.SN) return;
    if(SN.say) SN.say("Going to "+q+"…");
    geocode(q).then(function(p){
      if(!p||!isFinite(p.lat)){ if(SN.talk) SN.talk("Could not land "+q+"."); return; }
      try{ localStorage.setItem("sn:place", JSON.stringify({lat:p.lat,lng:p.lng,name:p.name})); }catch(e){}
      if(SN.showCity) SN.showCity(p);
      else if(SN.showMap) SN.showMap(p,14);
      if(window.SNWork&&SNWork.open) SNWork.open(p,"home");
      if(SN.talk) SN.talk("On the ground in "+(p.name||q)+".");
    });
  }
  window.SNGoNamed=goNamed;
  function wrapRun(){
    if(!window.SN||!SN.run) return setTimeout(wrapRun, 40);
    if(SN.__land4155) return;
    SN.__land4155=true;
    var orig=SN.run;
    SN.run=function(t){
      var q=landQ(t);
      if(q){ goNamed(q); return; }
      return orig.apply(this, arguments);
    };
  }
  var ofetch=window.fetch;
  window.fetch=function(input, init){
    var url=typeof input==="string"?input:(input&&input.url)||"";
    var p=ofetch.apply(this, arguments);
    if(String(url).indexOf("/api/ai")===-1) return p;
    return p.then(function(res){
      var clone=res.clone();
      clone.json().then(function(j){
        var a=String(j&&(j.act||j.action)||"").toLowerCase();
        var q=String(j&&(j.q||j.place||j.name)||"").trim();
        if(q && /^(city|land|go|fly|place|map|streets)$/.test(a)) goNamed(q);
      }).catch(function(){});
      return res;
    });
  };
  wrapRun();
})();
