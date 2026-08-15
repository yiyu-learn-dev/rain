# rain 雨窗哈气模拟器

这是一个偏氛围感和互动体验导向的个人网页项目。  
我希望把“隔着起雾雨窗看城市灯光”的感觉做成一个可以直接打开体验的单页页面：既有真实一点的雨滴折射，也保留了手指擦雾、切换场景和选择背景音乐这些更偏情绪化的交互。

项目当前以 [happy.html](file:///D:/dosth/trial/happy.html) 为主入口，目标不是做成一个重工程化的产品，而是做一个打开就能感受到情绪、质感和沉浸感的小型互动作品。

一个基于单页 `happy.html` 的雨窗互动网页，支持：

- WebGPU 雨滴折射效果
- 雾面擦除交互
- 内置底图与自定义上传
- 内置音乐列表与网页合成雨声
- 移动端与桌面端响应式布局

## 主要文件

- [happy.html](file:///D:/dosth/trial/happy.html): 当前根目录单页版本
- [rain/happy.html](file:///D:/dosth/trial/rain/happy.html): 放在 `rain/` 目录中的自洽版本
- `rain/`: 本地参考实现目录，现也包含可直接打开的页面与内置音频
- `assets/`: 当前项目的图片等资源目录

## 使用方式

直接在浏览器中打开 `happy.html` 即可。

如果浏览器支持 `WebGPU`，会启用更真实的雨滴折射渲染；如果不支持，会自动回退到轻量雨滴效果。

## 音频说明

当前页面内置了以下可选音频：

- `Beneath the Mask - rain instrumental`
- `Beneath the Mask`
- `网页合成雨声`

两首歌曲现在已经复制到 `rain/` 目录中。
根目录的 `happy.html` 也改成了优先读取 `rain/` 里的音频文件。

## 鸣谢

本项目基于 KiraKiraAyu 老师的 `https://github.com/KiraKiraAyu/RainEffect` 进行二次开发和个性化修改，感谢原作者的辛勤工作！

当前项目主要参考了原仓库中的：

- 雨滴折射着色器思路
- WebGPU 渲染管线组织方式
- 雨滴液体图模拟逻辑

同时，`rain/README.md` 中也提到该项目的灵感来源之一为：

- `https://github.com/codrops/RainEffect`

## 当前说明

由于原始 `RainEffect` 目录在本地被占用，当前新增了一个可用的 `rain/` 目录供页面引用。
目前 `rain/` 内已经包含：

- `happy.html`
- 两首内置 `mp3`
- 参考仓库源码与资源
如果后续确认旧目录不再使用，可以手动删除 `RainEffect/`。
