import "./style.css";
import RainRendererWebGPU from "./rain-renderer";
import Raindrops from "./raindrops";
import { createCanvas, lerp, loadImages } from "./utils";

const textureBgSize = {
  width: 384,
  height: 256,
};
const textureFgSize = {
  width: 192,
  height: 128,
};

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("#app not found");

app.innerHTML = `
  <main class="rain-app">
    <canvas width="1" height="1" id="container" class="rain-canvas"></canvas>
  </main>
`;

const canvasElement = document.querySelector<HTMLCanvasElement>("#container");
if (!canvasElement) throw new Error("#container not found");
const canvas = canvasElement;

let textureFg: HTMLCanvasElement;
let textureFgCtx: CanvasRenderingContext2D;
let textureBg: HTMLCanvasElement;
let textureBgCtx: CanvasRenderingContext2D;
let raindrops: Raindrops;
let renderer: RainRendererWebGPU;
let parallaxX = 0;
let parallaxY = 0;
let targetParallaxX = 0;
let targetParallaxY = 0;
let resizeQueued = false;

const images = await loadImages([
  { name: "dropAlpha", src: "/img/drop-alpha.png" },
  { name: "dropColor", src: "/img/drop-color.png" },
  { name: "textureFg", src: "/generated/texture-fg.png" },
  { name: "textureBg", src: "/generated/texture-bg.png" },
]);

await init();

async function init() {
  resizeCanvas();

  const dpi = window.devicePixelRatio || 1;
  raindrops = new Raindrops(
    canvas.width,
    canvas.height,
    dpi,
    images.dropAlpha.img,
    images.dropColor.img,
    {
      trailRate: 1,
      trailScaleRange: [0.25, 0.35],
      collisionRadius: 0.45,
      dropletsCleaningRadiusMultiplier: 0.28,
      minR: 20,
      maxR: 50,
      rainChance: 0.35,
      rainLimit: 6,
      dropletsRate: 50,
      dropletsSize: [3, 5.5],
      raining: true,
      collisionRadiusIncrease: 0.0002,
    },
  );

  textureFg = createCanvas(textureFgSize.width, textureFgSize.height);
  textureBg = createCanvas(textureBgSize.width, textureBgSize.height);
  textureFgCtx = requireContext(textureFg);
  textureBgCtx = requireContext(textureBg);
  generateTextures();

  renderer = await RainRendererWebGPU.create(
    canvas,
    raindrops.canvas,
    textureFg,
    textureBg,
    null,
    {
      brightness: 1.04,
      alphaMultiply: 6,
      alphaSubtract: 3,
    },
  );

  setupEvents();
}

function requireContext(source: HTMLCanvasElement) {
  const context = source.getContext("2d");
  if (!context) throw new Error("2D canvas context is unavailable");
  return context;
}

function resizeCanvas() {
  const dpi = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = Math.max(1, Math.floor(width * dpi));
  canvas.height = Math.max(1, Math.floor(height * dpi));
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
}

function setupEvents() {
  document.addEventListener("mousemove", (event) => {
    targetParallaxX = (event.pageX / canvas.width) * 2 - 1;
    targetParallaxY = (event.pageY / canvas.height) * 2 - 1;
  });

  window.addEventListener("resize", () => {
    if (resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(() => {
      resizeQueued = false;
      resizeCanvas();
      const dpi = window.devicePixelRatio || 1;
      raindrops.resize(canvas.width, canvas.height, dpi);
      renderer.resize();
    });
  });

  animateParallax();
}

function animateParallax() {
  parallaxX = lerp(parallaxX, targetParallaxX, 0.08);
  parallaxY = lerp(parallaxY, targetParallaxY, 0.08);
  renderer.parallaxX = parallaxX;
  renderer.parallaxY = parallaxY;
  requestAnimationFrame(animateParallax);
}

function generateTextures() {
  textureFgCtx.drawImage(
    images.textureFg.img,
    0,
    0,
    textureFgSize.width,
    textureFgSize.height,
  );
  textureBgCtx.drawImage(
    images.textureBg.img,
    0,
    0,
    textureBgSize.width,
    textureBgSize.height,
  );
}
