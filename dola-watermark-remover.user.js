// ==UserScript==
// @name         Dola/豆包 无水印视频下载器（仅视频版）
// @name:zh-CN   Dola/豆包 无水印视频下载器（仅视频版）
// @namespace    https://github.com/jeffak000/doubao-gailiuzi
// @version      2.0.1
// @description  在 dola.com / doubao.com 抓取无水印原视频（logo_type=unwatermarked + main_url 解密），仅提取视频，不抓图片。
// @description:zh-CN  在豆包国际版(Dola)与豆包页面抓取无水印原视频（换 logo_type 参数 + 解密 main_url），只下载视频，不抓图片。
// @author       WorkBuddy (for jeffak000/doubao-gailiuzi)
// @license      MIT
// @match        https://www.dola.com/*
// @match        https://dola.com/*
// @match        https://*.dola.com/*
// @match        https://www.doubao.com/*
// @match        https://*.doubao.com/*
// @run-at       document-start
// @grant        unsafeWindow
// @grant        GM_download
// @grant        GM_xmlhttpRequest
// @connect      ibyteimg.com
// @connect      ciciai.com
// @connect      byteintlapi.com
// @connect      byteimg.com
// @connect      douyinvod.com
// @connect      snssdk.com
// @connect      doubao.com
// @connect      dola.com
// @connect      douyinpic.com
// @noframes
// ==/UserScript==

(function () {
  "use strict";

  const W = (typeof unsafeWindow !== "undefined") ? unsafeWindow : window;
  if (W.__DOLA_WM_HOOK__) return;
  W.__DOLA_WM_HOOK__ = true;

  const SUBTLE = (W.crypto && W.crypto.subtle) ? W.crypto.subtle : null;

  // ---------- 配置 ----------
  const VIDEO_EXT = /\.(mp4|webm|mov|m4v|m3u8)(\?|$)/i;
  const FPLAY_HOST_SUFFIXES = [".snssdk.com",".douyinvod.com",".dola.com",".byteintlapi.com"];
  const QAAB_SALT = hexToBytes(
    "4dd4c2e6b83162090e52b3c7a6733ba4" +
    "1cb2462b829ab58a196b39db57177524" +
    "f49baf7f08e8d68d26a72e37c1a95a2f" +
    "1f05a51892aef2949732b62a38aadd58");

  // ---------- 存储 ----------
  const videos = new Map();      // fallbackApi -> {url, status, clean, err}

  // ---------- 工具 ----------
  function hexToBytes(hex){ const a=[]; for(let i=0;i<hex.length;i+=2) a.push(parseInt(hex.substr(i,2),16)); return new Uint8Array(a); }
  function isHttpUrl(s){ try{ const u=new URL(s); return u.protocol==="http:"||u.protocol==="https:"; }catch(e){ return false; } }

  // ---------- base64 / 解密（移植自 doubao-nomark video_crypto.py）----------
  function b64Norm(s){ s=s.replace(/-/g,"+").replace(/_/g,"/"); while(s.length%4)s+="="; return s; }
  function atobBytes(s){ const b=atob(s); const u=new Uint8Array(b.length); for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i); return u; }
  function decodeBase64Loose(value){
    const text=(value||"").trim();
    const variants=[ text,
      text.replace(/\$/g,"_").replace(/@/g,"/").replace(/#/g,"."),
      text.replace(/\$/g,"+").replace(/@/g,"/").replace(/#/g,"=") ];
    const seen=new Set();
    for(let c of variants){ if(!c||seen.has(c))continue; seen.add(c);
      try{ return atobBytes(b64Norm(c)); }catch(e){} }
    return null;
  }
  function urlFromBytes(bytes){
    for(let i=0;i<bytes.length;i++){ const b=bytes[i]; if(!(b===9||b===10||b===13||(b>=32&&b<=126))) return ""; }
    let s=""; for(let i=0;i<bytes.length;i++) s+=String.fromCharCode(bytes[i]);
    s=s.trim(); return isHttpUrl(s)?s:"";
  }
  function stripPkcs7(bytes){
    if(!bytes.length) return bytes;
    const p=bytes[bytes.length-1];
    if(p<1||p>16||p>bytes.length) return bytes;
    for(let i=0;i<p;i++) if(bytes[bytes.length-1-i]!==p) return bytes;
    return bytes.slice(0,bytes.length-p);
  }
  async function sha512(bytes){
    if(!SUBTLE) throw new Error("crypto.subtle 不可用（需 https 页面）");
    return new Uint8Array(await SUBTLE.digest("SHA-512", bytes));
  }
  async function aesCbcDecrypt(payload, key, iv){
    if(!SUBTLE||!payload.length||payload.length%16) return null;
    try{
      const k=await SUBTLE.importKey("raw", key, {name:"AES-CBC"}, false, ["decrypt"]);
      const buf=await SUBTLE.decrypt({name:"AES-CBC", iv}, k, payload);
      return new Uint8Array(buf);
    }catch(e){ return null; }
  }
  async function decodeQaabToken(token, keySeed){
    const data=decodeBase64Loose(token), seed=decodeBase64Loose(keySeed);
    if(!data||!seed) return "";
    const first=await sha512(seed.slice(0,32));
    const comb=new Uint8Array(first.length+QAAB_SALT.length);
    comb.set(first,0); comb.set(QAAB_SALT,first.length);
    const mat=await sha512(comb);
    const key=mat.slice(0,16), iv=mat.slice(16,32);
    const attempts=[];
    if(data[0]===0xa8&&data[1]===0x00&&data[2]===0x01&&data[3]===0x00){
      attempts.push([data.slice(4),key,iv]);
      attempts.push([data.slice(4),iv,key]);
      if(data.length>36){ attempts.push([data.slice(36),key,data.slice(20,36)]); attempts.push([data.slice(36),key,iv]); }
    } else { attempts.push([data,key,iv]); }
    for(const [pl,k,i] of attempts){
      const dec=await aesCbcDecrypt(pl,k,i);
      if(!dec) continue;
      let u=urlFromBytes(dec); if(u) return u;
      u=urlFromBytes(stripPkcs7(dec)); if(u) return u;
    }
    return "";
  }
  async function decodeMainUrl(token, keySeed){
    token=(token||"").trim();
    if(isHttpUrl(token)) return token;
    const dec=decodeBase64Loose(token);
    if(dec){ const plain=urlFromBytes(dec); if(plain) return plain; }
    if(token.startsWith("qAAB")&&keySeed) return await decodeQaabToken(token,keySeed);
    return "";
  }

  // ---------- 抓取 fallback_api（视频源）----------
  function isFplayUrl(u){
    try{ const p=new URL(u); const h=p.hostname.toLowerCase();
      const ok=FPLAY_HOST_SUFFIXES.some(s=>h===s.slice(1)||h.endsWith(s));
      return ok && p.pathname.startsWith("/video/fplay/");
    }catch(e){ return false; }
  }
  function addVideoSource(url){
    if(!url||typeof url!=="string") return;
    if(!isFplayUrl(url)) return;
    if(videos.has(url)) return;
    videos.set(url,{url,status:"ready",clean:null,err:""});
    schedulePanel();
  }
  function buildUnwatermarkedUrl(url){
    const u=new URL(url);
    const p=new URLSearchParams(u.search);
    p.delete("codec_type"); p.delete("logo_type");
    p.set("codec_type","8"); p.set("logo_type","unwatermarked");
    u.search=p.toString();
    return u.toString();
  }
  function walkFplay(node, depth){
    if(!node||depth>30) return;
    if(typeof node==="string"){ if(isFplayUrl(node)) addVideoSource(node); return; }
    if(Array.isArray(node)){ for(const c of node) walkFplay(c,depth+1); return; }
    if(typeof node==="object"){
      if(typeof node.fallback_api==="string") addVideoSource(node.fallback_api);
      for(const k in node) if(Object.prototype.hasOwnProperty.call(node,k)) walkFplay(node[k],depth+1);
    }
  }

  // ---------- Hook JSON.parse ----------
  const origParse=W.JSON.parse;
  W.JSON.parse=function(text,reviver){
    const r=origParse.call(this,text,reviver);
    try{ if(typeof text==="string"&&text.length<2e6) walkFplay(r,0); }catch(e){}
    return r;
  };

  // ---------- 解析页面 <script data-fn-args>（兜底）----------
  function scanScriptTags(){
    const tags=document.querySelectorAll("script[data-script-src]");
    for(const tag of tags){
      const src=tag.getAttribute("data-script-src")||"";
      if(src!=="modern-run-router-data-fn"&&src!=="modern-run-window-fn") continue;
      const args=tag.getAttribute("data-fn-args"); if(!args) continue;
      try{ walkFplay(JSON.parse(args),0); }catch(e){}
    }
  }

  // ---------- 网络兜底 ----------
  const origFetch=W.fetch;
  if(origFetch){ W.fetch=function(...a){ return origFetch.apply(this,a).then(resp=>{
    try{ const ct=resp.headers&&resp.headers.get&&resp.headers.get("content-type");
      if(ct&&ct.indexOf("json")!==-1) resp.clone().text().then(t=>{try{walkFplay(JSON.parse(t),0);}catch(e){}}).catch(()=>{}); }catch(e){}
    return resp; }); }; }

  // ---------- 拿无水印直链 ----------
  function gmGet(url){ return new Promise((res,rej)=>{
    GM_xmlhttpRequest({ method:"GET", url,
      headers:{ "User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0", "Accept":"application/json" },
      onload:r=> (r.status>=200&&r.status<300)?res(r.responseText):rej(new Error("HTTP "+r.status)),
      onerror:e=>rej(new Error("network")) }); }); }
  async function fetchCleanVideo(fallbackApi){
    const uw=buildUnwatermarkedUrl(fallbackApi);
    const payload=JSON.parse(await gmGet(uw));
    const vi=payload.video_info||(payload.data&&payload.data.video_info)||payload;
    const data=(vi&&vi.data)||vi||{};
    const vl=data.video_list;
    let entries=vl?(vl instanceof Array?vl:Object.values(vl)):[data];
    entries=entries.filter(e=>e&&(e.main_url||e.play_url));
    if(!entries.length) throw new Error("响应里没有 main_url");
    entries.sort((a,b)=>((b.vwidth||b.width||0)*(b.vheight||b.height||0))-((a.vwidth||a.width||0)*(a.vheight||a.height||0)));
    const best=entries[0];
    const token=best.main_url||best.play_url;
    const seed=data.key_seed||(vi&&vi.key_seed)||payload.key_seed||"";
    const url=await decodeMainUrl(token,seed);
    if(!url) throw new Error("解密失败");
    return url;
  }

  // ---------- 下载 ----------
  function fname(){
    const ts=new Date().toISOString().replace(/[:.]/g,"-").slice(0,19);
    const id=(location.pathname.match(/[a-f0-9]{8,}/)||["chat"])[0];
    return `dola_${id}_${ts}.mp4`;
  }
  function download(url){
    const name=fname();
    try{ GM_download({url,name,saveAs:false,onerror:()=>downloadBlob(url,name)}); }
    catch(e){ downloadBlob(url,name); }
  }
  function downloadBlob(url,name){
    GM_xmlhttpRequest({method:"GET",url,responseType:"blob",
      onload:r=>{ const o=URL.createObjectURL(r.response); const a=document.createElement("a"); a.href=o; a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(o),5000); },
      onerror:()=>alert("下载失败（可能被跨域拦截）：\n"+url) });
  }

  // ---------- 面板 ----------
  let panel,bodyBuilt=false,timer=null;
  function buildPanel(){
    panel=document.createElement("div"); panel.id="dola-wm-panel";
    Object.assign(panel.style,{position:"fixed",right:"12px",bottom:"12px",zIndex:2147483647,
      width:"330px",maxHeight:"72vh",overflow:"auto",background:"#1e1e1e",color:"#eee",
      border:"1px solid #444",borderRadius:"10px",font:"13px/1.4 system-ui,sans-serif",boxShadow:"0 8px 24px rgba(0,0,0,.4)"});
    panel.innerHTML=
      '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:#2a2a2a;border-radius:10px 10px 0 0;cursor:move;">'+
      '<b>📥 Dola 视频去水印</b><span id="dola-wm-close" style="cursor:pointer;padding:0 4px;">✕</span></div>'+
      '<div style="padding:6px 10px;display:flex;gap:6px;">'+
      '<button id="dola-wm-dlall" style="flex:1;padding:5px;background:#43a047;color:#fff;border:none;border-radius:6px;cursor:pointer;">全下载视频</button>'+
      '<button id="dola-wm-clear" style="padding:5px 8px;background:#555;color:#fff;border:none;border-radius:6px;cursor:pointer;">清空</button></div>'+
      '<div id="dola-wm-body" style="padding:6px 10px 10px;"></div>';
    document.body.appendChild(panel);
    panel.querySelector("#dola-wm-close").onclick=()=>panel.remove();
    panel.querySelector("#dola-wm-clear").onclick=()=>{ videos.clear(); renderPanel(); };
    panel.querySelector("#dola-wm-dlall").onclick=()=>{ for(const v of videos.values()) downloadVideo(v); };
    dragPanel(panel); bodyBuilt=true;
  }
  function dragPanel(el){ const bar=el.firstElementChild; let dx,dy,sx,sy,drag=false;
    bar.onmousedown=e=>{drag=true;sx=e.clientX;sy=e.clientY;const r=el.getBoundingClientRect();dx=r.left;dy=r.top;e.preventDefault();};
    document.onmousemove=e=>{if(!drag)return;el.style.left=dx+(e.clientX-sx)+"px";el.style.top=dy+(e.clientY-sy)+"px";el.style.right="auto";el.style.bottom="auto";};
    document.onmouseup=()=>drag=false; }
  function renderPanel(){
    if(!bodyBuilt) return;
    const b=panel.querySelector("#dola-wm-body");
    const vids=[...videos.values()];
    if(!vids.length){ b.innerHTML='<div style="color:#888;">打开含视频的会话后自动捕获。视频会拿 logo_type=unwatermarked 解密下载。</div>'; return; }
    let html=`<div style="color:#aaa;margin-bottom:4px;">视频源 ${vids.length}</div>`;
    for(const v of vids){
      const st=v.status==="loading"?"⏳ 解密处理中…":v.status==="done"?"✅ 已得无水印直链":v.status==="err"?("❌ "+v.err):"待下载";
      html+=`<div style="margin:6px 0;padding:6px;border:1px solid #333;border-radius:6px;">`+
        `<div style="font-size:11px;color:#81c784;">🎬 Dola 视频（去水印）</div>`+
        `<div style="font-size:10px;color:#888;">${st}</div>`+
        `<div style="margin-top:4px;"><button data-vid="${encodeURIComponent(v.url)}" style="padding:3px 8px;background:#e53935;color:#fff;border:none;border-radius:5px;cursor:pointer;">下载无水印</button></div></div>`;
    }
    b.innerHTML=html;
    b.querySelectorAll("[data-vid]").forEach(btn=>btn.onclick=()=>downloadVideo(videos.get(decodeURIComponent(btn.dataset.vid))));
  }
  async function downloadVideo(v){
    if(!v||v.status==="loading") return;
    v.status="loading"; renderPanel();
    try{
      const clean=await fetchCleanVideo(v.url);
      v.clean=clean; v.status="done"; renderPanel();
      download(clean);
    }catch(e){ v.status="err"; v.err=e.message; renderPanel(); alert("去水印失败："+e.message+"\n\n可改用 doubao-nomark 扩展，或把报错发我。"); }
  }
  function schedulePanel(){ if(timer)return; timer=setTimeout(()=>{ timer=null; if(!bodyBuilt)buildPanel(); renderPanel(); },400); }

  // ---------- 启动 ----------
  function start(){
    const init=()=>{ buildPanel(); scanScriptTags();
      new MutationObserver(()=>scanScriptTags()).observe(document.documentElement,{childList:true,subtree:true});
      setInterval(scanScriptTags,2500); };
    if(document.body) init(); else document.addEventListener("DOMContentLoaded",init);
  }
  start();
})();
