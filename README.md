# 豆包dola国内国际视频去水印

在豆包国际版 **Dola (dola.com)** 与国内 **doubao.com** 页面，一键抓取并下载**无水印**原视频。

> 本版本 **只提取视频，不抓图片**。需要图片版可回看历史 Release（v2.0.0 含图片功能）。

作者 **gai溜子到处跑** · 邮箱 jeffak@126.com · 主页 <https://www.090803.xyz>

## 功能
- ✅ Dola (dola.com) / doubao.com 双平台
- ✅ 视频：换参 + 解密，下载无水印 MP4（不抓图片）
- ✅ 面板每条视频显示**缩略图**，可点「预览」直接播放
- ✅ 显示每条视频的**生成时间**
- ✅ 页面里每个视频上叠加「⬇ 无水印」下载按钮
- ✅ **GitHub 更新**：面板「检查更新」按钮 + 油猴自动更新（@updateURL 指向本仓库）
- ✅ 右下角浮动面板：全下载 / 单条下载

## 安装
1. 安装油猴管理器（Tampermonkey / Violentmonkey）：Chrome / Edge 商店搜 “Tampermonkey”
2. 安装脚本 `dola-watermark-remover.user.js`：
   - 方式 A：Release 附件拖进管理器安装（推荐，可自动更新）
   - 方式 B：把文件内容粘贴到「新建脚本」
3. 打开 https://www.dola.com 一个有生成视频的会话，强制刷新（Ctrl+Shift+R）

## 使用
- 页面里每个视频右上角出现「⬇ 无水印」按钮，点一下直接下载该视频的干净 MP4
- 右下角面板：每条视频带缩略图 + 生成时间
  - 「预览」→ 面板内直接播放无水印视频
  - 「下载无水印」→ 下载干净 MP4
  - 「检查更新」→ 检查到新版本后**直接打开 GitHub 上的脚本文件**，油猴会弹更新框一键升级

## 更新方式
后续更新全部在 GitHub 发布：https://github.com/jeffak000/doubao-gailiuzi

## 原理
Dola 视频接口 `/video/fplay/...` 默认返回**带水印**片源（`logo_type=watermarked`）。
把参数改为 `logo_type=unwatermarked` 重新请求可得无水印版；
直链经 qAAB 加密（`main_url` + `key_seed`），用 SHA-512 派生 key/iv 做 AES-CBC 解密还原 CDN 地址。

解密逻辑移植自开源项目 [ihmily/doubao-nomark](https://github.com/ihmily/doubao-nomark)。

## 声明
仅用于下载你自己账号生成的内容，遵守平台 ToS 与当地法规。接口字段可能随平台更新变化；若失败请提 Issue 或反馈截图。

## License
MIT
