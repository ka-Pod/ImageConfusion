import { expect, test, describe } from 'bun:test'

describe('renderPage', () => {
  test('returns complete HTML document', async () => {
    const { renderPage } = await import('./ui')
    const html = renderPage()
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('</html>')
    expect(html).toContain('图片混淆')
  })

  test('includes input elements', async () => {
    const { renderPage } = await import('./ui')
    const html = renderPage()
    expect(html).toContain('id="ipt"')
    expect(html).toContain('multiple')
    expect(html).toContain('id="dir"')
    expect(html).toContain('id="zip-upload"')
  })

  test('includes status marquee', async () => {
    const { renderPage } = await import('./ui')
    const html = renderPage()
    expect(html).toContain('id="status-marquee"')
  })

  test('includes batch mode UI classes', async () => {
    const { renderPage } = await import('./ui')
    const html = renderPage()
    expect(html).toContain('preview-counter')
    expect(html).toContain('preview-nav')
    expect(html).toContain('shimmer-placeholder')
  })

  test('includes control buttons', async () => {
    const { renderPage } = await import('./ui')
    const html = renderPage()
    expect(html).toContain('id="enc"')
    expect(html).toContain('id="dec"')
    expect(html).toContain('id="re"')
    expect(html).toContain('id="download"')
    expect(html).toContain('id="batch-dl"')
    expect(html).toContain('btn-primary')
    expect(html).toContain('btn-secondary')
  })

  test('includes reader layout containers', async () => {
    const { renderPage } = await import('./ui')
    const html = renderPage()
    expect(html).toContain('id="thumb-sidebar"')
    expect(html).toContain('id="preview-scroll"')
    expect(html).toContain('id="main-area"')
  })

  test('includes toast container', async () => {
    const { renderPage } = await import('./ui')
    const html = renderPage()
    expect(html).toContain('id="toast-container"')
  })

  test('includes drag-drop zone placeholder', async () => {
    const { renderPage } = await import('./ui')
    const html = renderPage()
    expect(html).toContain('drop-placeholder')
  })

  test('includes keyboard navigation handlers', async () => {
    const { renderPage } = await import('./ui')
    const html = renderPage()
    expect(html).toContain('ArrowUp')
    expect(html).toContain('ArrowDown')
    expect(html).toContain('Home')
    expect(html).toContain('End')
  })

  test('includes IntersectionObserver for scroll tracking', async () => {
    const { renderPage } = await import('./ui')
    const html = renderPage()
    expect(html).toContain('IntersectionObserver')
  })

  test('includes toast notification logic', async () => {
    const { renderPage } = await import('./ui')
    const html = renderPage()
    expect(html).toContain('showToast')
  })

  test('has header layout classes', async () => {
    const { renderPage } = await import('./ui')
    const html = renderPage()
    expect(html).toContain('class="header"')
    expect(html).toContain('header-row')
    expect(html).toContain('header-title')
    expect(html).toContain('space-between')
  })

  test('has kinetic typography animations', async () => {
    const { renderPage } = await import('./ui')
    const html = renderPage()
    expect(html).toContain('letterPulse')
    expect(html).toContain('hueDrift')
    expect(html).toContain('@keyframes scramble')
  })

  test('has neo-brutalist button styles', async () => {
    const { renderPage } = await import('./ui')
    const html = renderPage()
    expect(html).toContain('4px 4px 0 0')
    expect(html).toContain('--radius: 0')
  })

  test('has preview title hide', async () => {
    const { renderPage } = await import('./ui')
    const html = renderPage()
    expect(html).toContain('.previewing h1')
    expect(html).toContain('previewing')
  })
})
