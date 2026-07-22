<h1 align="center">Rain Effect</h1>

<p align="center">
  <a href="./README-CN.md">简体中文</a> | English
</p>

<p align="center">
  <a href="https://ark.lysastriel.com/demo/rain-effect" target="_blank">
    <img src="https://img.shields.io/badge/Demo-Live%20Sandbox-blueviolet?style=for-the-badge" alt="Live Demo" />
  </a>
</p>

WebGPU implementation of rain-on-glass effect.

Inspired by [codrops/RainEffect](https://github.com/codrops/RainEffect).

## Install Dependencies

```bash
pnpm install
```

## Launch Development Server

```bash
pnpm dev
```

Vite will automatically generate rain textures before the dev server starts.

## Build

```bash
pnpm build
```

The build runs TypeScript checks and then builds the Vite app. The rain textures are generated as part of the Vite build pipeline.

## Change the Background

Replace:

```text
assets/source.jpg
```

Then run:

```bash
pnpm dev
```

or:

```bash
pnpm build
```

## Tune Generated Textures

Texture generation options live in:

```text
scripts/generate-background-textures.ts
```

Edit `backgroundTextureConfig` to change the generated look:

- `bg`: low-resolution background texture sampled outside the drops.
- `fg`: low-resolution foreground texture sampled inside refracted drops.

Common options:

- `width` / `height`: output texture size.
- `blur`: higher values make the layer softer and more defocused.
- `brightness`: values above `1` brighten the layer; below `1` darken it.
- `saturation`: lower values make the scene more gray and rainy.
- `tint`: RGB color overlay used to push the image toward a rainy tone.
- `tintOpacity`: strength of the tint overlay.

Practical adjustments:

- More misty background: increase `bg.blur`.
- Clearer details inside drops: decrease `fg.blur`.
- Colder rainy mood: increase blue/green in `tint` or raise `tintOpacity`.
- More natural source colors: raise `saturation` and lower `tintOpacity`.
- Brighter drop interiors: increase `fg.brightness`.
