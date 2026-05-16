# Raindrop

[English](./README.md) | 简体中文

这是一个 WebGPU 实现的雨滴玻璃效果。

灵感来源于 [codrops/RainEffect](https://github.com/codrops/RainEffect)。

## 安装依赖

```bash
pnpm install
```

## 启动开发服务器

```bash
pnpm dev
```

Vite dev server 启动前会自动生成雨滴效果需要的纹理。

## 构建

```bash
pnpm build
```

构建会先执行 TypeScript 检查，然后构建 Vite 应用。雨滴纹理生成流程已经接入 Vite build。

## 更换背景图

替换：

```text
assets/source.jpg
```

然后运行：

```bash
pnpm dev
```

或：

```bash
pnpm build
```

## 调整生成纹理

纹理生成参数在：

```text
scripts/generate-background-textures.ts
```

修改 `backgroundTextureConfig` 可以调整生成效果：

- `bg`：水滴外部采样的低分辨率背景纹理。
- `fg`：水滴内部折射采样的低分辨率前景纹理。

常用参数：

- `width` / `height`：输出纹理尺寸。
- `blur`：数值越大，画面越柔和、越失焦。
- `brightness`：大于 `1` 会变亮，小于 `1` 会变暗。
- `saturation`：数值越低，画面越灰，更像雨天。
- `tint`：RGB 颜色叠加，用来把画面推向雨天色调。
- `tintOpacity`：颜色叠加的强度。

常见调法：

- 背景更朦胧：增大 `bg.blur`。
- 水滴内部更清楚：减小 `fg.blur`。
- 色调更冷、更雨天：提高 `tint` 的蓝绿成分，或增大 `tintOpacity`。
- 更接近原图颜色：提高 `saturation`，降低 `tintOpacity`。
- 水滴内部更亮：增大 `fg.brightness`。
