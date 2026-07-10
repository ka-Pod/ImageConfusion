import { ref, computed } from 'vue'
import type { BatchItem } from '../types'

export function useConfuse() {
  const batchMode = ref(false)
  const batchItems = ref<BatchItem[]>([])
  const selectedIndex = ref(-1)
  const sessionId = ref<string | null>(null)
  const zipId = ref<string | null>(null)
  const originalSrc = ref('')
  const originalFile = ref<File | null>(null)
  const originalFileName = ref('')
  const currentAction = ref<'encrypt' | 'decrypt' | ''>('')

  const selectedItem = computed(() =>
    selectedIndex.value >= 0 ? batchItems.value[selectedIndex.value] : null
  )

  const hasItems = computed(() => batchItems.value.length > 0)

  const allEncrypted = computed(() =>
    batchItems.value.length > 0 && batchItems.value.every(i => i.status === 'encrypted')
  )

  const allDecrypted = computed(() =>
    batchItems.value.length > 0 && batchItems.value.every(i => i.status === 'decrypted')
  )

  function resetAll() {
    batchItems.value.forEach(i => {
      i.processedBlob = undefined
    })
    if (originalSrc.value.startsWith('blob:')) URL.revokeObjectURL(originalSrc.value)
    batchMode.value = false
    batchItems.value = []
    selectedIndex.value = -1
    sessionId.value = null
    zipId.value = null
    originalSrc.value = ''
    originalFile.value = null
    originalFileName.value = ''
    currentAction.value = ''
  }

  function loadSingleFile(file: File) {
    resetAll()
    batchMode.value = false
    originalFile.value = file
    originalFileName.value = file.name
    originalSrc.value = URL.createObjectURL(file)
    selectedIndex.value = -1
  }

  function loadBatchFiles(files: FileList | File[]) {
    resetAll()
    batchMode.value = true
    batchItems.value = Array.from(files).map(f => ({
      file: f,
      status: 'pending' as const,
      processedName: '',
    }))
    selectedIndex.value = files.length > 0 ? 0 : -1
  }

  async function processSingle(action: 'encrypt' | 'decrypt'): Promise<Blob | null> {
    try {
      const response = await fetch(originalSrc.value)
      const blob = await response.blob()
      const form = new FormData()
      form.append('image', blob, 'image.jpeg')
      const res = await fetch(`/api/${action}`, { method: 'POST', body: form })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      currentAction.value = action
      return await res.blob()
    } catch {
      return null
    }
  }

  async function processBatch(action: 'encrypt' | 'decrypt') {
    const form = new FormData()
    batchItems.value.forEach(item => {
      form.append('image', item.file, item.file.name)
    })

    const res = await fetch(`/api/batch/${action}`, { method: 'POST', body: form })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const data = await res.json() as Record<string, unknown>

    if (action === 'encrypt') {
      zipId.value = data.zipId as string
      const items = data.items as Array<Record<string, unknown>>
      items.forEach((respItem, i) => {
        if (i < batchItems.value.length) {
          batchItems.value[i].processedName = respItem.processedName as string
          batchItems.value[i].status = respItem.error ? 'error' : 'encrypted'
          batchItems.value[i].errorMsg = respItem.error as string | undefined
        }
      })
    } else {
      sessionId.value = data.sessionId as string
      const items = data.items as Array<Record<string, unknown>>
      for (let di = 0; di < items.length; di++) {
        const dItem = items[di]
        if (di < batchItems.value.length) {
          batchItems.value[di].processedName = dItem.processedName as string
          if (dItem.error) {
            batchItems.value[di].status = 'error'
            batchItems.value[di].errorMsg = dItem.error as string
          } else {
            const imgRes = await fetch(`/api/batch/image/${dItem.id as string}?sessionId=${sessionId.value}`)
            if (imgRes.ok) {
              batchItems.value[di].processedBlob = await imgRes.blob()
              batchItems.value[di].status = 'decrypted'
            }
          }
        }
      }
    }

    return data
  }

  function scrollToImage(index: number) {
    if (index >= 0 && index < batchItems.value.length) {
      selectedIndex.value = index
    }
  }

  return {
    batchMode, batchItems, selectedIndex, sessionId, zipId,
    originalSrc, originalFile, originalFileName, currentAction,
    selectedItem, hasItems, allEncrypted, allDecrypted,
    resetAll, loadSingleFile, loadBatchFiles,
    processSingle, processBatch, scrollToImage,
  }
}
