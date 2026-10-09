// 工具栏弹窗：版本 + 检查更新
const CUR_VER = "2.0.6";
const RAW_URL = "https://raw.githubusercontent.com/jeffak000/doubao-gailiuzi/main/dola-watermark-remover.user.js";

function parseVer(s){ const m=String(s).match(/(\d+(?:\.\d+)+)/); return m?m[1].split('.').map(Number):[0]; }
function compareVer(a,b){
  const pa=parseVer(a), pb=parseVer(b);
  for(let i=0;i<Math.max(pa.length,pb.length);i++){ const x=pa[i]||0,y=pb[i]||0; if(x>y)return 1; if(x<y)return -1; }
  return 0;
}

document.getElementById("check").addEventListener("click", async () => {
  const el = document.getElementById("result");
  el.textContent = "检查中…";
  try {
    const r = await fetch(RAW_URL, { credentials: "omit" });
    if (!r.ok) { el.textContent = "检查失败：HTTP " + r.status; return; }
    const text = await r.text();
    const m = text.match(/@version\s+([\d.]+)/);
    if (!m) { el.textContent = "无法解析版本号。"; return; }
    const latest = m[1];
    if (compareVer(latest, CUR_VER) > 0) {
      el.innerHTML = `发现新版本 v${latest}（当前 v${CUR_VER}）。\n请到 <a href="https://github.com/jeffak000/doubao-gailiuzi" target="_blank" rel="noopener">GitHub</a> 重新下载扩展。`;
    } else {
      el.textContent = `已是最新（v${CUR_VER}）`;
    }
  } catch (e) {
    el.textContent = "检查失败：" + e.message;
  }
});
