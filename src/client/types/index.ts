export type BatchItem = {
  file: File
  id?: string
  processedName: string
  status: 'pending' | 'processing' | 'encrypted' | 'decrypted' | 'error'
  errorMsg?: string
  processedBlob?: Blob
  fileUrl?: string
  processedUrl?: string
}

export type ComicMeta = {
  id: string
  name: string
  author: string
  source: string
  createdAt: string
  coverIndex: number
  totalPages: number
  coverBase64?: string
}

export type ToastType = 'success' | 'error' | 'info' | 'network' | 'format' | 'expired' | 'size' | 'server'

export type Toast = {
  id: number
  message: string
  type: ToastType
}
