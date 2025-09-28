import { client } from '../../index.js'

type Browser = typeof client.pupBrowser

export const model = ['swin_unet.art', 'swin_unet.art_scan', 'swin_unet.photo', 'cunet.art'] as const
export const denoise = [-1, 0, 1, 2, 3] as const
export const upscaling = [1, 2, 4] as const
export const tile = [64, 256, 400, 640] as const
export const tta = [0, 2, 4] as const
export const alpha = [1, 0] as const

export type Waifu2xOptions = {
  model?: (typeof model)[number]
  denoise?: (typeof denoise)[number]
  upscaling?: (typeof upscaling)[number]
  tile?: (typeof tile)[number]
  shuffle?: boolean
  tta?: (typeof tta)[number]
  alpha?: (typeof alpha)[number]
}

export async function Waifu2x(browser: Browser, imagePath: string, options?: Waifu2xOptions) {
  if (browser) {
    const page = await browser.newPage()
    await page.goto('https://unlimited.waifu2x.net/')
    const fileUpload = await page.waitForSelector('input[type=file]')
    if (fileUpload) {
      //@ts-expect-error
      await fileUpload.uploadFile(imagePath)
      await page.evaluate((options) => {
        if (options) {
          const { model, denoise, upscaling, tile, shuffle, tta, alpha } = options
          if (model) {
            const Smodel = document.querySelector('select[name=model]') as HTMLSelectElement
            if (Smodel) Smodel.value = String(model)
          }
          if (denoise) {
            const Sdenoise = document.querySelector('select[name=noise_level]') as HTMLSelectElement
            if (Sdenoise) Sdenoise.value = String(denoise)
          }
          if (upscaling) {
            const Supscaling = document.querySelector('select[name=scale]') as HTMLSelectElement
            if (Supscaling) Supscaling.value = String(upscaling)
          }
          if (tile) {
            const Stile = document.querySelector('select[name=tile_size]') as HTMLSelectElement
            if (Stile) Stile.value = String(tile)
          }
          if (shuffle) {
            const s = document.querySelector('input[type=checkbox][name=tile_random]') as HTMLInputElement
            if (s) s.checked = shuffle
          }
          if (tta) {
            const Stta = document.querySelector('select[name=tta]') as HTMLSelectElement
            if (Stta) Stta.value = String(tta)
          }
          if (alpha) {
            const Salpha = document.querySelector('select[name=alpha]') as HTMLSelectElement
            if (Salpha) Salpha.value = String(alpha)
          }
        }
      }, options)
      await page.click('input[type=button]#start')
      const blobLink = await page.waitForSelector('a[href^="blob:"]', { timeout: 3 * 60 * 1000 })
      if (blobLink) {
        const blobUrl = await blobLink.evaluate((el) => (el as HTMLAnchorElement).href)
        const buffer = await page.evaluate(async (url) => {
          const res = await fetch(url)
          const arr = await res.arrayBuffer()
          return Array.from(new Uint8Array(arr))
        }, blobUrl)
        await page.close()
        return Buffer.from(buffer)
      }
    }
  }
}
