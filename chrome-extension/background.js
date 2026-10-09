// Background service worker
// 作用：代替 Tampermonkey 的 GM_xmlhttpRequest / GM_download
//  - 跨域请求带 host_permissions + credentials，等效于绕过 CORS
//  - 下载走 chrome.downloads.download，自动带 cookie，不受 CORS 限制

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "fetch") {
    fetch(msg.url, {
      method: "GET",
      headers: msg.headers || {},
      credentials: "include",
      redirect: "follow"
    })
      .then(async (r) => {
        const text = await r.text();
        sendResponse({ ok: r.ok, status: r.status, text });
      })
      .catch((e) => sendResponse({ ok: false, status: 0, text: String(e) }));
    return true; // 异步响应
  }

  if (msg.type === "download") {
    chrome.downloads
      .download({
        url: msg.url,
        filename: msg.filename,
        saveAs: false,
        conflictAction: "uniquify"
      })
      .then((id) => sendResponse({ ok: true, id }))
      .catch((e) => sendResponse({ ok: false, err: String(e && e.message ? e.message : e) }));
    return true;
  }
});
