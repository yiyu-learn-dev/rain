import fs from "node:fs/promises";
import path from "node:path";
import sharp, { type Sharp } from "sharp";

interface Rgb {
  r: number;
  g: number;
  b: number;
}

interface TextureOptions {
  width: number;
  height: number;
  blur: number;
  brightness: number;
  saturation: number;
  tint: Rgb;
  tintOpacity: number;
}

interface BackgroundTextureConfig {
  source: string;
  outputs: {
    bg: string;
    fg: string;
  };
  bg: TextureOptions;
  fg: TextureOptions;
}

const root = path.resolve(import.meta.dirname, "..");

export const backgroundTextureConfig: BackgroundTextureConfig = {
  source: "assets/source.jpg",
  outputs: {
    bg: "public/generated/texture-bg.png",
    fg: "public/generated/texture-fg.png",
  },
  bg: {
    width: 384,
    height: 256,
    blur: 3,
    brightness: 1.2,
    saturation: 0.8,
    tint: { r: 212, g: 234, b: 240 },
    tintOpacity: 0.12,
  },
  fg: {
    width: 192,
    height: 128,
    blur: 0,
    brightness: 1.2,
    saturation: 0.8,
    tint: { r: 212, g: 234, b: 240 },
    tintOpacity: 0.12,
  },
};

function coverResize(image: Sharp, options: TextureOptions) {
  return image.resize(options.width, options.height, {
    fit: "cover",
    position: "centre",
  });
}

function tintLayer(options: TextureOptions) {
  return {
    input: Buffer.from(
      `<svg width="${options.width}" height="${options.height}" viewBox="0 0 ${options.width} ${options.height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="rgb(${options.tint.r},${options.tint.g},${options.tint.b})" fill-opacity="${options.tintOpacity}"/>
      </svg>`,
    ),
    blend: "over" as const,
  };
}

async function generateImage(
  source: string,
  output: string,
  options: TextureOptions,
  format: "jpeg" | "png",
) {
  await fs.mkdir(path.dirname(output), { recursive: true });

  let image = sharp(source).rotate();
  image = coverResize(image, options);

  if (options.blur > 0) {
    image = image.blur(options.blur);
  }

  image = image
    .modulate({
      brightness: options.brightness,
      saturation: options.saturation,
    })
    .composite([tintLayer(options)]);

  if (format === "jpeg") {
    await image.jpeg({ quality: 88, progressive: true }).toFile(output);
  } else {
    await image
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toFile(output);
  }
}

export async function generateBackgroundTextures(
  config = backgroundTextureConfig,
) {
  const source = path.resolve(root, config.source);
  const outputs = Object.values(config.outputs).map((output) =>
    path.resolve(root, output),
  );

  await fs.access(source);

  await generateImage(
    source,
    path.resolve(root, config.outputs.bg),
    config.bg,
    "png",
  );
  await generateImage(
    source,
    path.resolve(root, config.outputs.fg),
    config.fg,
    "png",
  );

  return { outputs };
}
