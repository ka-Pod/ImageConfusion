import { expect, test, describe } from 'bun:test'

describe('useConfuse', () => {
  test('initial state', async () => {
    const { useConfuse } = await import('../composables/useConfuse')
    const state = useConfuse()
    expect(state.batchMode.value).toBe(false)
    expect(state.batchItems.value).toEqual([])
    expect(state.selectedIndex.value).toBe(-1)
    expect(state.sessionId.value).toBeNull()
    expect(state.zipId.value).toBeNull()
    expect(state.originalSrc.value).toBe('')
    expect(state.originalFile.value).toBeNull()
    expect(state.originalFileName.value).toBe('')
    expect(state.currentAction.value).toBe('')
    expect(state.selectedItem.value).toBeNull()
    expect(state.hasItems.value).toBe(false)
  })

  test('loadSingleFile sets single-file state', () => {
    const { useConfuse } = require('../composables/useConfuse') as typeof import('../composables/useConfuse')
    const state = useConfuse()
    const file = new File(['test'], 'photo.jpg', { type: 'image/jpeg' })

    state.loadSingleFile(file)

    expect(state.batchMode.value).toBe(false)
    expect(state.originalFileName.value).toBe('photo.jpg')
    expect(state.originalFile.value).toBe(file)
    expect(state.originalSrc.value).toStartWith('blob:')
    expect(state.selectedIndex.value).toBe(-1)
    expect(state.selectedItem.value).toBeNull()
    expect(state.hasItems.value).toBe(false)
  })

  test('loadBatchFiles sets batch state', () => {
    const { useConfuse } = require('../composables/useConfuse') as typeof import('../composables/useConfuse')
    const state = useConfuse()
    const files = [
      new File(['a'], 'a.jpg', { type: 'image/jpeg' }),
      new File(['b'], 'b.png', { type: 'image/png' }),
    ]

    state.loadBatchFiles(files)

    expect(state.batchMode.value).toBe(true)
    expect(state.batchItems.value.length).toBe(2)
    expect(state.batchItems.value[0].file.name).toBe('a.jpg')
    expect(state.batchItems.value[1].file.name).toBe('b.png')
    expect(state.batchItems.value[0].status).toBe('pending')
    expect(state.batchItems.value[1].status).toBe('pending')
    expect(state.selectedIndex.value).toBe(0)
    expect(state.hasItems.value).toBe(true)
  })

  test('loadBatchFiles sets selectedIndex to 0 for non-empty', () => {
    const { useConfuse } = require('../composables/useConfuse') as typeof import('../composables/useConfuse')
    const state = useConfuse()
    state.loadBatchFiles([new File(['a'], 'a.jpg')])
    expect(state.selectedIndex.value).toBe(0)
  })

  test('loadBatchFiles resets previous state', () => {
    const { useConfuse } = require('../composables/useConfuse') as typeof import('../composables/useConfuse')
    const state = useConfuse()

    state.loadSingleFile(new File(['t'], 'test.jpg'))
    expect(state.batchMode.value).toBe(false)

    state.loadBatchFiles([new File(['a'], 'a.jpg')])
    expect(state.batchMode.value).toBe(true)
    expect(state.originalSrc.value).toBe('')
    expect(state.originalFile.value).toBeNull()
  })

  test('selectedItem returns correct item', () => {
    const { useConfuse } = require('../composables/useConfuse') as typeof import('../composables/useConfuse')
    const state = useConfuse()
    const files = [
      new File(['a'], 'a.jpg'),
      new File(['b'], 'b.jpg'),
      new File(['c'], 'c.jpg'),
    ]
    state.loadBatchFiles(files)
    expect(state.selectedItem.value?.file.name).toBe('a.jpg')
    state.scrollToImage(2)
    expect(state.selectedItem.value?.file.name).toBe('c.jpg')
  })

  test('scrollToImage clamps index', () => {
    const { useConfuse } = require('../composables/useConfuse') as typeof import('../composables/useConfuse')
    const state = useConfuse()
    state.loadBatchFiles([new File(['a'], 'a.jpg')])

    state.scrollToImage(-1)
    expect(state.selectedIndex.value).toBe(0)

    state.scrollToImage(100)
    expect(state.selectedIndex.value).toBe(0)
  })

  test('hasItems reflects batch item presence', () => {
    const { useConfuse } = require('../composables/useConfuse') as typeof import('../composables/useConfuse')
    const state = useConfuse()
    expect(state.hasItems.value).toBe(false)

    state.loadBatchFiles([new File(['a'], 'a.jpg')])
    expect(state.hasItems.value).toBe(true)
  })

  test('batch mode state after loadBatchFiles', () => {
    const { useConfuse } = require('../composables/useConfuse') as typeof import('../composables/useConfuse')
    const state = useConfuse()
    state.loadBatchFiles([new File(['a'], 'a.jpg')])

    expect(state.originalSrc.value).toBe('')
    expect(state.originalFile.value).toBeNull()
    expect(state.originalFileName.value).toBe('')
    expect(state.sessionId.value).toBeNull()
    expect(state.zipId.value).toBeNull()
  })
})
