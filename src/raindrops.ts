import { chance, createCanvas, random, times } from './utils'

const dropSize = 64

type Drop = {
  x: number
  y: number
  r: number
  spreadX: number
  spreadY: number
  momentum: number
  momentumX: number
  lastSpawn: number
  nextSpawn: number
  parent: Drop | null
  isNew: boolean
  killed: boolean
  shrink: number
}

type RaindropOptions = {
  minR: number
  maxR: number
  maxDrops: number
  rainChance: number
  rainLimit: number
  dropletsRate: number
  dropletsSize: [number, number]
  dropletsCleaningRadiusMultiplier: number
  raining: boolean
  globalTimeScale: number
  trailRate: number
  autoShrink: boolean
  spawnArea: [number, number]
  trailScaleRange: [number, number]
  collisionRadius: number
  collisionRadiusIncrease: number
  dropFallMultiplier: number
  collisionBoostMultiplier: number
  collisionBoost: number
}

const DropDefaults: Drop = {
  x: 0,
  y: 0,
  r: 0,
  spreadX: 0,
  spreadY: 0,
  momentum: 0,
  momentumX: 0,
  lastSpawn: 0,
  nextSpawn: 0,
  parent: null,
  isNew: true,
  killed: false,
  shrink: 0,
}

const defaultOptions: RaindropOptions = {
  minR: 10,
  maxR: 40,
  maxDrops: 900,
  rainChance: 0.3,
  rainLimit: 3,
  dropletsRate: 50,
  dropletsSize: [2, 4],
  dropletsCleaningRadiusMultiplier: 0.43,
  raining: true,
  globalTimeScale: 1,
  trailRate: 1,
  autoShrink: true,
  spawnArea: [-0.1, 0.95],
  trailScaleRange: [0.2, 0.5],
  collisionRadius: 0.65,
  collisionRadiusIncrease: 0.01,
  dropFallMultiplier: 1,
  collisionBoostMultiplier: 0.05,
  collisionBoost: 1,
}

export default class Raindrops {
  canvas: HTMLCanvasElement
  options: RaindropOptions

  private ctx: CanvasRenderingContext2D
  private width: number
  private height: number
  private scale: number
  private dropAlpha: HTMLImageElement
  private dropColor: HTMLImageElement
  private dropletsPixelDensity = 1
  private droplets: HTMLCanvasElement
  private dropletsCtx: CanvasRenderingContext2D
  private dropletsCounter = 0
  private drops: Drop[] = []
  private dropsGfx: HTMLCanvasElement[] = []
  private clearDropletsGfx: HTMLCanvasElement
  private textureCleaningIterations = 0
  private lastRender: number | null = null
  private raf = 0

  constructor(
    width: number,
    height: number,
    scale: number,
    dropAlpha: HTMLImageElement,
    dropColor: HTMLImageElement,
    options: Partial<RaindropOptions> = {},
  ) {
    this.width = width
    this.height = height
    this.scale = scale
    this.dropAlpha = dropAlpha
    this.dropColor = dropColor
    this.options = Object.assign({}, defaultOptions, options)

    this.canvas = createCanvas(this.width, this.height)
    this.ctx = this.context2d(this.canvas)
    this.droplets = createCanvas(
      this.width * this.dropletsPixelDensity,
      this.height * this.dropletsPixelDensity,
    )
    this.dropletsCtx = this.context2d(this.droplets)
    this.clearDropletsGfx = createCanvas(128, 128)

    this.renderDropsGfx()
    this.update()
  }

  get deltaR() {
    return this.options.maxR - this.options.minR
  }

  get area() {
    return (this.width * this.height) / this.scale
  }

  get areaMultiplier() {
    return Math.sqrt(this.area / (1024 * 768))
  }

  resize(width: number, height: number, scale: number) {
    this.width = width
    this.height = height
    this.scale = scale

    this.canvas.width = Math.max(1, Math.floor(width))
    this.canvas.height = Math.max(1, Math.floor(height))
    this.droplets.width = Math.max(1, Math.floor(width * this.dropletsPixelDensity))
    this.droplets.height = Math.max(1, Math.floor(height * this.dropletsPixelDensity))
    this.drops = []
    this.dropletsCounter = 0
    this.lastRender = null
  }

  createDrop(options: Partial<Drop>) {
    if (this.drops.length >= this.options.maxDrops * this.areaMultiplier) return null
    return Object.assign(Object.create(DropDefaults) as Drop, DropDefaults, options)
  }

  addDrop(drop: Drop | null) {
    if (this.drops.length >= this.options.maxDrops * this.areaMultiplier || drop == null) {
      return false
    }

    this.drops.push(drop)
    return true
  }

  clearDrops() {
    this.drops.forEach((drop) => {
      window.setTimeout(() => {
        drop.shrink = 0.1 + random(0.5)
      }, random(1200))
    })
    this.clearTexture()
  }

  destroy() {
    cancelAnimationFrame(this.raf)
  }

  private context2d(canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('2D canvas context is unavailable')
    }
    return context
  }

  private renderDropsGfx() {
    const dropBuffer = createCanvas(dropSize, dropSize)
    const dropBufferCtx = this.context2d(dropBuffer)

    this.dropsGfx = Array.from({ length: 255 }, (_, i) => {
      const drop = createCanvas(dropSize, dropSize)
      const dropCtx = this.context2d(drop)

      dropBufferCtx.clearRect(0, 0, dropSize, dropSize)
      dropBufferCtx.globalCompositeOperation = 'source-over'
      dropBufferCtx.drawImage(this.dropColor, 0, 0, dropSize, dropSize)

      dropBufferCtx.globalCompositeOperation = 'screen'
      dropBufferCtx.fillStyle = `rgba(0,0,${i},1)`
      dropBufferCtx.fillRect(0, 0, dropSize, dropSize)

      dropCtx.globalCompositeOperation = 'source-over'
      dropCtx.drawImage(this.dropAlpha, 0, 0, dropSize, dropSize)

      dropCtx.globalCompositeOperation = 'source-in'
      dropCtx.drawImage(dropBuffer, 0, 0, dropSize, dropSize)
      return drop
    })

    const clearDropletsCtx = this.context2d(this.clearDropletsGfx)
    clearDropletsCtx.fillStyle = '#000'
    clearDropletsCtx.beginPath()
    clearDropletsCtx.arc(64, 64, 64, 0, Math.PI * 2)
    clearDropletsCtx.fill()
  }

  private drawDroplet(x: number, y: number, r: number) {
    this.drawDrop(this.dropletsCtx, {
      ...DropDefaults,
      x: x * this.dropletsPixelDensity,
      y: y * this.dropletsPixelDensity,
      r: r * this.dropletsPixelDensity,
    })
  }

  private drawDrop(ctx: CanvasRenderingContext2D, drop: Drop) {
    if (this.dropsGfx.length === 0) return

    const { x, y, r, spreadX, spreadY } = drop
    const scaleX = 1
    const scaleY = 1.5
    let d = Math.max(0, Math.min(1, ((r - this.options.minR) / this.deltaR) * 0.9))
    d *= 1 / ((drop.spreadX + drop.spreadY) * 0.5 + 1)

    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
    d = Math.floor(d * (this.dropsGfx.length - 1))
    ctx.drawImage(
      this.dropsGfx[d],
      (x - r * scaleX * (spreadX + 1)) * this.scale,
      (y - r * scaleY * (spreadY + 1)) * this.scale,
      r * 2 * scaleX * (spreadX + 1) * this.scale,
      r * 2 * scaleY * (spreadY + 1) * this.scale,
    )
  }

  private clearDroplets(x: number, y: number, r = 30) {
    this.dropletsCtx.globalCompositeOperation = 'destination-out'
    this.dropletsCtx.drawImage(
      this.clearDropletsGfx,
      (x - r) * this.dropletsPixelDensity * this.scale,
      (y - r) * this.dropletsPixelDensity * this.scale,
      r * 2 * this.dropletsPixelDensity * this.scale,
      r * 2 * this.dropletsPixelDensity * this.scale * 1.5,
    )
  }

  private clearCanvas() {
    this.ctx.clearRect(0, 0, this.width, this.height)
  }

  private updateRain(timeScale: number) {
    const rainDrops: Drop[] = []
    if (this.options.raining) {
      const limit = this.options.rainLimit * timeScale * this.areaMultiplier
      let count = 0
      while (chance(this.options.rainChance * timeScale * this.areaMultiplier) && count < limit) {
        count += 1
        const r = random(this.options.minR, this.options.maxR, (n) => n ** 3)
        const rainDrop = this.createDrop({
          x: random(this.width / this.scale),
          y: random(
            (this.height / this.scale) * this.options.spawnArea[0],
            (this.height / this.scale) * this.options.spawnArea[1],
          ),
          r,
          momentum: 1 + (r - this.options.minR) * 0.1 + random(2),
          spreadX: 1.5,
          spreadY: 1.5,
        })

        if (rainDrop != null) {
          rainDrops.push(rainDrop)
        }
      }
    }
    return rainDrops
  }

  private clearTexture() {
    this.textureCleaningIterations = 50
  }

  private updateDroplets(timeScale: number) {
    if (this.textureCleaningIterations > 0) {
      this.textureCleaningIterations -= 1 * timeScale
      this.dropletsCtx.globalCompositeOperation = 'destination-out'
      this.dropletsCtx.fillStyle = `rgba(0,0,0,${0.05 * timeScale})`
      this.dropletsCtx.fillRect(
        0,
        0,
        this.width * this.dropletsPixelDensity,
        this.height * this.dropletsPixelDensity,
      )
    }

    if (this.options.raining) {
      this.dropletsCounter += this.options.dropletsRate * timeScale * this.areaMultiplier
      times(this.dropletsCounter, () => {
        this.dropletsCounter -= 1
        this.drawDroplet(
          random(this.width / this.scale),
          random(this.height / this.scale),
          random(...this.options.dropletsSize, (n) => n * n),
        )
      })
    }
    this.ctx.drawImage(this.droplets, 0, 0, this.width, this.height)
  }

  private updateDrops(timeScale: number) {
    let newDrops: Drop[] = []

    this.updateDroplets(timeScale)
    newDrops = newDrops.concat(this.updateRain(timeScale))

    this.drops.sort((a, b) => {
      const va = a.y * (this.width / this.scale) + a.x
      const vb = b.y * (this.width / this.scale) + b.x
      return va > vb ? 1 : va === vb ? 0 : -1
    })

    this.drops.forEach((drop, i) => {
      if (drop.killed) return

      if (
        chance(
          (drop.r - this.options.minR * this.options.dropFallMultiplier) *
            (0.1 / this.deltaR) *
            timeScale,
        )
      ) {
        drop.momentum += random((drop.r / this.options.maxR) * 4)
      }

      if (this.options.autoShrink && drop.r <= this.options.minR && chance(0.05 * timeScale)) {
        drop.shrink += 0.01
      }

      drop.r -= drop.shrink * timeScale
      if (drop.r <= 0) drop.killed = true

      if (this.options.raining) {
        drop.lastSpawn += drop.momentum * timeScale * this.options.trailRate
        if (drop.lastSpawn > drop.nextSpawn) {
          const trailDrop = this.createDrop({
            x: drop.x + random(-drop.r, drop.r) * 0.1,
            y: drop.y - drop.r * 0.01,
            r: drop.r * random(...this.options.trailScaleRange),
            spreadY: drop.momentum * 0.1,
            parent: drop,
          })

          if (trailDrop != null) {
            newDrops.push(trailDrop)

            drop.r *= 0.97 ** timeScale
            drop.lastSpawn = 0
            drop.nextSpawn =
              random(this.options.minR, this.options.maxR) -
              drop.momentum * 2 * this.options.trailRate +
              (this.options.maxR - drop.r)
          }
        }
      }

      drop.spreadX *= 0.4 ** timeScale
      drop.spreadY *= 0.7 ** timeScale

      const moved = drop.momentum > 0
      if (moved && !drop.killed) {
        drop.y += drop.momentum * this.options.globalTimeScale
        drop.x += drop.momentumX * this.options.globalTimeScale
        if (drop.y > this.height / this.scale + drop.r) {
          drop.killed = true
        }
      }

      const checkCollision = (moved || drop.isNew) && !drop.killed
      drop.isNew = false

      if (checkCollision) {
        this.drops.slice(i + 1, i + 70).forEach((drop2) => {
          if (
            drop !== drop2 &&
            drop.r > drop2.r &&
            drop.parent !== drop2 &&
            drop2.parent !== drop &&
            !drop2.killed
          ) {
            const dx = drop2.x - drop.x
            const dy = drop2.y - drop.y
            const d = Math.sqrt(dx * dx + dy * dy)

            if (
              d <
              (drop.r + drop2.r) *
                (this.options.collisionRadius +
                  drop.momentum * this.options.collisionRadiusIncrease * timeScale)
            ) {
              const pi = Math.PI
              const r1 = drop.r
              const r2 = drop2.r
              const a1 = pi * (r1 * r1)
              const a2 = pi * (r2 * r2)
              const targetR = Math.sqrt((a1 + a2 * 0.8) / pi)
              drop.r = targetR
              drop.momentumX += dx * 0.1
              drop.spreadX = 0
              drop.spreadY = 0
              drop2.killed = true
              drop.momentum = Math.max(
                drop2.momentum,
                Math.min(
                  40,
                  drop.momentum +
                    targetR * this.options.collisionBoostMultiplier +
                    this.options.collisionBoost,
                ),
              )
            }
          }
        })
      }

      drop.momentum -= Math.max(1, this.options.minR * 0.5 - drop.momentum) * 0.1 * timeScale
      if (drop.momentum < 0) drop.momentum = 0
      drop.momentumX *= 0.7 ** timeScale

      if (!drop.killed) {
        newDrops.push(drop)
        if (moved && this.options.dropletsRate > 0) {
          this.clearDroplets(drop.x, drop.y, drop.r * this.options.dropletsCleaningRadiusMultiplier)
        }
        this.drawDrop(this.ctx, drop)
      }
    })

    this.drops = newDrops
  }

  private update = () => {
    this.clearCanvas()

    const now = Date.now()
    if (this.lastRender == null) this.lastRender = now
    const deltaT = now - this.lastRender
    let timeScale = deltaT / ((1 / 60) * 1000)
    if (timeScale > 1.1) timeScale = 1.1
    timeScale *= this.options.globalTimeScale
    this.lastRender = now

    this.updateDrops(timeScale)
    this.raf = requestAnimationFrame(this.update)
  }
}
