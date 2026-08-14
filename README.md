# rain 雨窗哈气模拟器

这是一个偏氛围感和互动体验导向的个人网页项目。

我想把“隔着起雾雨窗看城市灯光”的感觉做成一个可以直接打开体验的页面：既有比较真实的雨滴折射效果，也保留了手指擦雾、切换场景、选择内置音乐这些更有情绪感的互动。

## 项目特色

- WebGPU 雨滴折射渲染
- 玻璃雾面擦除交互
- 内置底图切换与图片上传
- 内置音乐列表与网页合成雨声
- 适配移动端和桌面端的响应式布局

## 项目结构

- `happy.html`: 当前主要的单页入口
- `src/`: 保留和参考的雨滴渲染源码
- `public/`: Web 资源目录
- `assets/`: 当前项目使用的图片资源

## 本地运行

直接打开 `happy.html` 可以快速查看效果。

如果你想按仓库方式运行开发环境：

```bash
pnpm install
pnpm dev
```

如果需要构建：

```bash
pnpm build
```

## 音频

当前项目内置了以下可选音频：

- `Beneath the Mask - rain instrumental`
- `Beneath the Mask`
- `网页合成雨声`

## 鸣谢

本项目基于 KiraKiraAyu 老师的 `https://github.com/KiraKiraAyu/RainEffect` 进行二次开发和个性化修改，感谢原作者的辛勤工作！

当前项目主要参考了原仓库中的：

- 雨滴折射着色器思路
- WebGPU 渲染管线组织方式
- 雨滴液体图模拟逻辑

同时，原仓库也提到其灵感来源之一为：

- `https://github.com/codrops/RainEffect`
