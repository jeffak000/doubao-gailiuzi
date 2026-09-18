# Dola / 豆包 无水印视频图片下载器（油猴脚本）

在豆包国际版 **Dola (dola.com)** 与国内 **doubao.com** 页面，一键抓取并下载**无水印**原视频与原图。

> 真·去水印：不是简单“下载播放地址”，而是把视频接口参数 `logo_type` 改成 `unwatermarked` 重新请求，再对加密的 `main_url` 做 qAAB 解密，拿到干净 CDN 直链。图片直接抓原图 CDN。

## 功能
- ✅ Dola (dola.com) / doubao.com 双平台支持
- ✅ 视频：换参 + 解密，下载无水印 MP4
- ✅ 图片：抓取原图 CDN 直链
- ✅ 右下角浮动面板，支持全下载 / 单条下载 / 复制链接
- ✅ 每一条视频 / 图片可单独下载

## 安装
1. 安装油猴管理器（Tampermonkey / Violentmonkey）：Chrome / Edge 商店搜 “Tampermonkey”
2. 安装本脚本 `dola-watermark-remover.user.js`：
   - 方式 A：把文件内容粘贴到管理器「新建脚本」
   - 方式 B：通过 GreasyFork / 本仓库 raw 地址导入
3. 打开 https://www.dola.com 一个有生成视频的会话，强制刷新（Ctrl+Shift+R）

## 使用
- 右下角出现「📥 Dola 真·去水印」面板
- 视频区点「下载无水印」→ 自动：换 `logo_type=unwatermarked` + 解密 `main_url` + 下载干净 MP4
- 图片区点「下载」/「复制」

## 原理
Dola 视频接口 `/video/fplay/...` 默认返回**带水印**片源（`logo_type=watermarked`）。
把请求参数改为 `logo_type=unwatermarked` 重新请求可得无水印版；
真正的直链经 qAAB 加密（`main_url` + `key_seed`），用 SHA-512 派生 key/iv 做 AES-CBC 解密还原 CDN 地址。

解密逻辑移植自开源项目 [ihmily/doubao-nomark](https://github.com/ihmily/doubao-nomark)。

## 声明
- 仅用于下载**你自己账号**生成的内容，遵守平台服务条款与当地法律法规。
- 接口字段可能随平台更新变化；若失败请提 Issue 或反馈截图。
- 水印去除能力依赖平台当前是否仍提供 `unwatermarked` 参数，若平台下线该功能则脚本失效。

## License
MIT
