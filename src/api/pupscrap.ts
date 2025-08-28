import { client } from '../../index.js'

type Browser = typeof client.pupBrowser

export async function bratGenerator(browser: Browser, text: string) {
  if (browser) {
    const bratText = text.replace(/\n/g, ' ')
    const brat = await browser.newPage()
    await brat.goto('https://www.bratgenerator.com')
    await brat.evaluate((realMsg) => {
      const br = document.querySelector('#toggleButtonWhite') as HTMLDivElement
      const ti = document.querySelector('#textInput') as HTMLInputElement
      const ov = document.querySelector('div#textOverlay') as HTMLDivElement
      ov.style.padding = '2rem'
      br.click()
      ti.value = realMsg
      ti.dispatchEvent(new Event('input', { bubbles: true }))
    }, bratText)
    const br = await brat.waitForSelector('div#textOverlay')
    const screenshot = await br?.screenshot({
      encoding: 'base64',
      fromSurface: true,
    }) as string
    await brat.close()
    return screenshot
  }
}

export async function brotGenerator(browser: Browser, text: string) {
  if (browser) {
    const bratText = text.replace(/\n/g, ' ')
    const brat = await browser.newPage()
    await brat.setContent(/* html */ `<div id="brat" style="display: flex;font-weight: 500;font-family: arial_narrowregular, 'Arial Narrow', sans-serif;font-size: 100px;filter: blur(2px);text-align: justify;text-align-last: justify;align-items: center;line-height: 1.25;padding: 1rem;">
    <span></span>
    </div>`)
    await brat.evaluate((bratText) => {
      const div = document.querySelector('div#brat') as HTMLDivElement | null
      const span = document.querySelector('div#brat span') as HTMLSpanElement | null
      if (div && span) {
        span.innerText = bratText
        // Get initial dimensions
        const style = getComputedStyle(div)
        const height = parseFloat(style.height)
        const width = parseFloat(style.width)
        // Calculate a base size (geometric mean)
        const baseSize = Math.sqrt(height * width)
        // Set width to base size (with px)
        div.style.width = `${baseSize}px`
        // Adjust width to fit span content
        const spanWidth = parseFloat(getComputedStyle(span).width)
        div.style.width = `${spanWidth}px`
        // Ensure the div is square-ish
        const newHeight = parseFloat(getComputedStyle(div).height)
        const newWidth = parseFloat(getComputedStyle(div).width)
        if (newHeight > newWidth) {
          div.style.width = `${newHeight}px`
        } else {
          div.style.height = `${newWidth}px`
        }
      }
    }, bratText)
    const div = await brat?.waitForSelector('div#brat')
    const screenshot = await div?.screenshot({
      encoding: 'base64',
      fromSurface: true,
    }) as string
    await brat.close()
    return screenshot
  }
}
