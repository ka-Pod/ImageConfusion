import { expect, test, describe } from 'bun:test'

describe('useToast', () => {
  test('showToast adds a toast with correct properties', async () => {
    const { useToast } = await import('../composables/useToast')
    const { showToast } = useToast()

    showToast('测试消息', 'info')

    const { toasts } = useToast()
    const last = toasts.value[toasts.value.length - 1]
    expect(last.message).toBe('测试消息')
    expect(last.type).toBe('info')
    expect(typeof last.id).toBe('number')
  })

  test('showToast accepts different types', async () => {
    const { useToast } = await import('../composables/useToast')
    const { showToast } = useToast()
    const { toasts } = useToast()

    showToast('成功消息', 'success')
    showToast('错误消息', 'error')

    const toastsSnapshot = toasts.value.map(t => ({ message: t.message, type: t.type }))
    expect(toastsSnapshot.some(t => t.message === '成功消息' && t.type === 'success')).toBe(true)
    expect(toastsSnapshot.some(t => t.message === '错误消息' && t.type === 'error')).toBe(true)
  })

  test('showToast auto-removes after duration', async () => {
    const { useToast } = await import('../composables/useToast')
    const { showToast } = useToast()
    const { toasts } = useToast()

    // The test imports share the same module, so toasts has historical entries
    const countBefore = toasts.value.length

    showToast('临时消息', 'info', 10)
    expect(toasts.value.length).toBe(countBefore + 1)

    // Wait for auto-removal
    await new Promise(r => setTimeout(r, 50))
    expect(toasts.value.length).toBe(countBefore)
  }, 200)
})
