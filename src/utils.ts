export type NamedImage = {
  name: string
  src: string
  img: HTMLImageElement
}

export function random(
  from: number | null = null,
  to: number | null = null,
  interpolation: ((n: number) => number) | null = null,
) {
  if (from == null) {
    from = 0
    to = 1
  } else if (to == null) {
    to = from
    from = 0
  }

  const delta = to - from
  const curve = interpolation ?? ((n: number) => n)
  return from + curve(Math.random()) * delta
}

export function chance(c: number) {
  return random() <= c
}

export function times(n: number, f: (i: number) => void) {
  for (let i = 0; i < n; i += 1) {
    f(i)
  }
}

export function createCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.floor(width))
  canvas.height = Math.max(1, Math.floor(height))
  return canvas
}

export function imageLoaded(img: HTMLImageElement) {
  if (img.complete && img.naturalWidth > 0) return Promise.resolve()

  return new Promise<void>((resolve, reject) => {
    img.addEventListener('load', () => resolve(), { once: true })
    img.addEventListener('error', () => reject(new Error(`Failed to load ${img.src}`)), {
      once: true,
    })
  })
}

function loadImage(src: string | { name: string; src: string }, index: number) {
  return new Promise<NamedImage>((resolve, reject) => {
    const source =
      typeof src === 'string'
        ? {
            name: `image${index}`,
            src,
          }
        : src

    const img = new Image()
    img.decoding = 'async'
    img.addEventListener(
      'load',
      () => {
        resolve({
          ...source,
          img,
        })
      },
      { once: true },
    )
    img.addEventListener('error', () => reject(new Error(`Failed to load ${source.src}`)), {
      once: true,
    })
    img.src = source.src
  })
}

export async function loadImages(images: Array<string | { name: string; src: string }>) {
  const loadedImages = await Promise.all(images.map((src, i) => loadImage(src, i)))
  return loadedImages.reduce<Record<string, NamedImage>>((result, image) => {
    result[image.name] = image
    return result
  }, {})
}

export function lerp(current: number, target: number, amount: number) {
  return current + (target - current) * amount
}
