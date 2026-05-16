import waterShader from './water.wgsl?raw'
import { createCanvas } from './utils'

type TextureSource = HTMLCanvasElement | HTMLImageElement | ImageBitmap

type RainRendererOptions = {
  renderShadow: boolean
  minRefraction: number
  maxRefraction: number
  brightness: number
  alphaMultiply: number
  alphaSubtract: number
  parallaxBg: number
  parallaxFg: number
}

const defaultOptions: RainRendererOptions = {
  renderShadow: false,
  minRefraction: 256,
  maxRefraction: 512,
  brightness: 1,
  alphaMultiply: 20,
  alphaSubtract: 5,
  parallaxBg: 5,
  parallaxFg: 20,
}

const BufferUsage = {
  COPY_DST: 0x0008,
  UNIFORM: 0x0040,
}

const TextureUsage = {
  COPY_DST: 0x02,
  TEXTURE_BINDING: 0x04,
  RENDER_ATTACHMENT: 0x10,
}

export default class RainRendererWebGPU {
  parallaxX = 0
  parallaxY = 0

  private canvas: HTMLCanvasElement
  private canvasLiquid: HTMLCanvasElement
  private imageShine: TextureSource
  private hasShine: boolean
  private imageFg: TextureSource
  private imageBg: TextureSource
  private options: RainRendererOptions
  private device!: GPUDevice
  private context!: GPUCanvasContext
  private format!: GPUTextureFormat
  private pipeline!: GPURenderPipeline
  private bindGroup!: GPUBindGroup
  private sampler!: GPUSampler
  private uniformBuffer!: GPUBuffer
  private waterTexture!: GPUTexture
  private shineTexture!: GPUTexture
  private fgTexture!: GPUTexture
  private bgTexture!: GPUTexture
  private width = 0
  private height = 0
  private raf = 0
  private initialized = false

  private constructor(
    canvas: HTMLCanvasElement,
    canvasLiquid: HTMLCanvasElement,
    imageFg: TextureSource,
    imageBg: TextureSource,
    imageShine: TextureSource | null = null,
    options: Partial<RainRendererOptions> = {},
  ) {
    this.canvas = canvas
    this.canvasLiquid = canvasLiquid
    this.imageFg = imageFg
    this.imageBg = imageBg
    this.hasShine = imageShine != null
    this.imageShine = imageShine ?? this.createFallbackTextureSource()
    this.options = Object.assign({}, defaultOptions, options)
  }

  static async create(
    canvas: HTMLCanvasElement,
    canvasLiquid: HTMLCanvasElement,
    imageFg: TextureSource,
    imageBg: TextureSource,
    imageShine: TextureSource | null = null,
    options: Partial<RainRendererOptions> = {},
  ) {
    const renderer = new RainRendererWebGPU(
      canvas,
      canvasLiquid,
      imageFg,
      imageBg,
      imageShine,
      options,
    )
    await renderer.init()
    return renderer
  }

  updateTextures() {
    this.copySourceToTexture(this.fgTexture, this.imageFg)
    this.copySourceToTexture(this.bgTexture, this.imageBg)
    this.copySourceToTexture(this.shineTexture, this.imageShine)
  }

  resize() {
    if (!this.initialized) return

    this.width = this.canvas.width
    this.height = this.canvas.height
    this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: 'opaque',
    })
    this.waterTexture.destroy()
    this.waterTexture = this.createTextureFromSource(this.canvasLiquid)
    this.bindGroup = this.createBindGroup()
    this.writeUniforms()
  }

  destroy() {
    cancelAnimationFrame(this.raf)
    this.waterTexture.destroy()
    this.shineTexture.destroy()
    this.fgTexture.destroy()
    this.bgTexture.destroy()
    this.uniformBuffer.destroy()
  }

  private async init() {
    if (!navigator.gpu) {
      throw new Error('当前浏览器不支持 WebGPU。请使用开启 WebGPU 的 Chrome、Edge 或 Safari Technology Preview。')
    }

    const adapter = await navigator.gpu.requestAdapter()
    if (!adapter) {
      throw new Error('没有可用的 WebGPU adapter。')
    }

    const device = await adapter.requestDevice()
    const context = this.canvas.getContext('webgpu')
    if (!context) {
      throw new Error('无法获取 WebGPU canvas context。')
    }

    this.device = device
    this.context = context as GPUCanvasContext
    this.format = navigator.gpu.getPreferredCanvasFormat()
    this.width = this.canvas.width
    this.height = this.canvas.height

    this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: 'opaque',
    })

    this.sampler = this.device.createSampler({
      addressModeU: 'clamp-to-edge',
      addressModeV: 'clamp-to-edge',
      magFilter: 'linear',
      minFilter: 'linear',
    })

    this.waterTexture = this.createTextureFromSource(this.canvasLiquid)
    this.shineTexture = this.createTextureFromSource(this.imageShine)
    this.fgTexture = this.createTextureFromSource(this.imageFg)
    this.bgTexture = this.createTextureFromSource(this.imageBg)
    this.uniformBuffer = this.device.createBuffer({
      size: 64,
      usage: BufferUsage.UNIFORM | BufferUsage.COPY_DST,
    })

    const module = this.device.createShaderModule({
      code: waterShader,
    })

    this.pipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module,
        entryPoint: 'vs',
      },
      fragment: {
        module,
        entryPoint: 'fs',
        targets: [
          {
            format: this.format,
          },
        ],
      },
      primitive: {
        topology: 'triangle-list',
      },
    })

    this.bindGroup = this.createBindGroup()

    this.initialized = true
    this.writeUniforms()
    this.draw()
  }

  private createFallbackTextureSource() {
    const canvas = createCanvas(2, 2)
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('2D canvas context is unavailable')
    }
    context.clearRect(0, 0, canvas.width, canvas.height)
    return canvas
  }

  private createBindGroup() {
    return this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: this.waterTexture.createView() },
        { binding: 1, resource: this.shineTexture.createView() },
        { binding: 2, resource: this.fgTexture.createView() },
        { binding: 3, resource: this.bgTexture.createView() },
        { binding: 4, resource: this.sampler },
        { binding: 5, resource: { buffer: this.uniformBuffer } },
      ],
    })
  }

  private createTextureFromSource(source: TextureSource) {
    const size = this.sourceSize(source)
    const texture = this.device.createTexture({
      size,
      format: 'rgba8unorm',
      usage:
        TextureUsage.TEXTURE_BINDING | TextureUsage.COPY_DST | TextureUsage.RENDER_ATTACHMENT,
    })
    this.copySourceToTexture(texture, source)
    return texture
  }

  private copySourceToTexture(texture: GPUTexture, source: TextureSource) {
    this.device.queue.copyExternalImageToTexture(
      { source },
      { texture },
      this.sourceSize(source),
    )
  }

  private sourceSize(source: TextureSource): GPUExtent3DDict {
    if (source instanceof HTMLCanvasElement) {
      return {
        width: Math.max(1, source.width),
        height: Math.max(1, source.height),
      }
    }

    if (source instanceof HTMLImageElement) {
      return {
        width: Math.max(1, source.naturalWidth || source.width),
        height: Math.max(1, source.naturalHeight || source.height),
      }
    }

    return {
      width: Math.max(1, source.width),
      height: Math.max(1, source.height),
    }
  }

  private writeUniforms() {
    const bgSize = this.sourceSize(this.imageBg)
    const bgHeight = bgSize.height ?? 1
    const uniforms = new Float32Array([
      this.width,
      this.height,
      this.parallaxX,
      this.parallaxY,
      this.options.parallaxFg,
      this.options.parallaxBg,
      bgSize.width / bgHeight,
      this.hasShine ? 1 : 0,
      this.options.renderShadow ? 1 : 0,
      this.options.minRefraction,
      this.options.maxRefraction - this.options.minRefraction,
      this.options.brightness,
      this.options.alphaMultiply,
      this.options.alphaSubtract,
      0,
      0,
    ])
    this.device.queue.writeBuffer(this.uniformBuffer, 0, uniforms)
  }

  private draw = () => {
    this.writeUniforms()
    this.copySourceToTexture(this.waterTexture, this.canvasLiquid)

    const encoder = this.device.createCommandEncoder()
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    })

    pass.setPipeline(this.pipeline)
    pass.setBindGroup(0, this.bindGroup)
    pass.draw(6)
    pass.end()
    this.device.queue.submit([encoder.finish()])

    this.raf = requestAnimationFrame(this.draw)
  }
}
