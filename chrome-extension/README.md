# 豆包dola国内国际视频去水印（插件版）

油猴脚本 `dola-watermark-remover.user.js` 的**浏览器扩展**形态。功能完全一致：在 dola.com / doubao.com 抓取无水印原视频（`logo_type=unwatermarked` + `main_url` 解密），右下角面板带缩略图/生成时间，页面视频上直接叠加「⬇ 无水印」按钮。仅视频。

## 与油猴脚本的区别
- 不需要 Tampermonkey / Violentmonkey，直接作为扩展安装。
- 网络请求走扩展后台 service worker（`host_permissions` + `credentials`），等价于原脚本的 `GM_xmlhttpRequest` / `GM_download`，跨域 + 携带 cookie 不受 CORS 限制。
- 内容脚本运行在 **MAIN world**，直接 Hook 页面真实的 `JSON.parse` / `fetch`，所以能像油猴一样拦截接口响应。

## 安装（Edge）
1. 打开 `edge://extensions`
2. 左侧/右上角打开「开发人员模式」(Developer mode) 开关
3. 点击「加载解压缩的扩展」(Load unpacked)
4. 选择本文件夹 `dola-watermark-chrome-extension`
5. 固定到工具栏（扩展图标 → 固定）

## 安装（Chrome）
1. 打开 `chrome://extensions`
2. 右上角打开「开发者模式」
3. 「加载已解压的扩展程序」→ 选择本文件夹
4. 访问 dola.com 打开含视频的会话即可

> 注意：`manifest.json` 中 `content_scripts.world = "MAIN"` 需要 Chrome/Edge 111+。请使用较新版本浏览器。

## 使用
- 打开 dola.com 的对话页，生成视频后右下角自动出现面板，列出视频源（带缩略图、生成时间）。
- 点「下载无水印」或「全下载视频」即下载干净片源。
- 页面里每个 `<video>` 右上角有红色「⬇ 无水印」浮按钮，点一下直接下载。
- 点「检查更新」会去 GitHub 比对最新版本。

## 文件
- `manifest.json` — 扩展配置（MV3）
- `content.js` — 主逻辑（抓源 / 解密 / 面板 / 浮按钮），运行在页面主世界
- `background.js` — service worker，负责跨域请求与下载
- `popup.html` / `popup.js` — 工具栏弹窗（版本 + 检查更新）

## 更新
本扩展为手动更新：GitHub 仓库 [jeffak000/doubao-gailiuzi](https://github.com/jeffak000/doubao-gailiuzi) 发布新版后，重新「加载解压缩的扩展」即可。
