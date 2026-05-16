struct Uniforms {
  resolution: vec2f,
  parallax: vec2f,
  parallaxFg: f32,
  parallaxBg: f32,
  textureRatio: f32,
  renderShine: f32,
  renderShadow: f32,
  minRefraction: f32,
  refractionDelta: f32,
  brightness: f32,
  alphaMultiply: f32,
  alphaSubtract: f32,
  _pad0: f32,
}

@group(0) @binding(0) var waterMap: texture_2d<f32>;
@group(0) @binding(1) var textureShine: texture_2d<f32>;
@group(0) @binding(2) var textureFg: texture_2d<f32>;
@group(0) @binding(3) var textureBg: texture_2d<f32>;
@group(0) @binding(4) var linearSampler: sampler;
@group(0) @binding(5) var<uniform> uniforms: Uniforms;

struct VertexOut {
  @builtin(position) position: vec4f,
}

@vertex
fn vs(@builtin(vertex_index) vertexIndex: u32) -> VertexOut {
  var positions = array<vec2f, 6>(
    vec2f(-1.0, -1.0),
    vec2f(1.0, -1.0),
    vec2f(-1.0, 1.0),
    vec2f(-1.0, 1.0),
    vec2f(1.0, -1.0),
    vec2f(1.0, 1.0),
  );

  var out: VertexOut;
  out.position = vec4f(positions[vertexIndex], 0.0, 1.0);
  return out;
}

fn blend(bg: vec4f, fg: vec4f) -> vec4f {
  let bgm = bg.rgb * bg.a;
  let fgm = fg.rgb * fg.a;
  let ia = 1.0 - fg.a;
  let a = fg.a + bg.a * ia;
  var rgb = vec3f(0.0);
  if (a != 0.0) {
    rgb = (fgm + bgm * ia) / a;
  }
  return vec4f(rgb, a);
}

fn pixel() -> vec2f {
  return vec2f(1.0) / uniforms.resolution;
}

fn parallax(v: f32) -> vec2f {
  return uniforms.parallax * pixel() * v;
}

fn texCoord(fragCoord: vec4f) -> vec2f {
  return fragCoord.xy / uniforms.resolution;
}

fn scaledTexCoord(fragCoord: vec4f) -> vec2f {
  let ratio = uniforms.resolution.x / uniforms.resolution.y;
  var scale = vec2f(1.0, 1.0);
  var offset = vec2f(0.0, 0.0);
  let ratioDelta = ratio - uniforms.textureRatio;
  if (ratioDelta >= 0.0) {
    scale.y = 1.0 + ratioDelta;
    offset.y = ratioDelta / 2.0;
  } else {
    scale.x = 1.0 - ratioDelta;
    offset.x = -ratioDelta / 2.0;
  }
  return (texCoord(fragCoord) + offset) / scale;
}

fn fgColor(fragCoord: vec4f, x: f32, y: f32) -> vec4f {
  let p2 = uniforms.parallaxFg * 2.0;
  let scale = vec2f(
    (uniforms.resolution.x + p2) / uniforms.resolution.x,
    (uniforms.resolution.y + p2) / uniforms.resolution.y,
  );

  let scaledCoord = texCoord(fragCoord) / scale;
  let offset = vec2f(
    (1.0 - (1.0 / scale.x)) / 2.0,
    (1.0 - (1.0 / scale.y)) / 2.0,
  );

  return textureSample(
    waterMap,
    linearSampler,
    (scaledCoord + offset) + (pixel() * vec2f(x, y)) + parallax(uniforms.parallaxFg),
  );
}

@fragment
fn fs(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
  let bg = textureSample(textureBg, linearSampler, scaledTexCoord(fragCoord) + parallax(uniforms.parallaxBg));
  let cur = fgColor(fragCoord, 0.0, 0.0);

  let d = cur.b;
  let x = cur.g;
  let y = cur.r;
  let a = clamp(cur.a * uniforms.alphaMultiply - uniforms.alphaSubtract, 0.0, 1.0);

  let refraction = (vec2f(x, y) - vec2f(0.5)) * 2.0;
  let refractionParallax = parallax(uniforms.parallaxBg - uniforms.parallaxFg);
  let refractionPos = scaledTexCoord(fragCoord)
    + (pixel() * refraction * (uniforms.minRefraction + (d * uniforms.refractionDelta)))
    + refractionParallax;

  var tex = textureSample(textureFg, linearSampler, refractionPos);

  if (uniforms.renderShine > 0.5) {
    let maxShine = 490.0;
    let minShine = maxShine * 0.18;
    let shinePos = vec2f(0.5, 0.5) + ((1.0 / 512.0) * refraction) * -(minShine + ((maxShine - minShine) * d));
    let shine = textureSample(textureShine, linearSampler, shinePos);
    tex = blend(tex, shine);
  }

  var fg = vec4f(tex.rgb * uniforms.brightness, a);

  if (uniforms.renderShadow > 0.5) {
    var borderAlpha = fgColor(fragCoord, 0.0, 0.0 - (d * 6.0)).a;
    borderAlpha = borderAlpha * uniforms.alphaMultiply - (uniforms.alphaSubtract + 0.5);
    borderAlpha = clamp(borderAlpha, 0.0, 1.0);
    borderAlpha *= 0.2;
    let border = vec4f(0.0, 0.0, 0.0, borderAlpha);
    fg = blend(border, fg);
  }

  return blend(bg, fg);
}
