import { onMounted, onUnmounted } from 'vue'

export function useKeyboard(
  enabled: () => boolean,
  onPrev: () => void,
  onNext: () => void,
  onHome: () => void,
  onEnd: () => void,
) {
  function handleKeyDown(e: KeyboardEvent) {
    if (!enabled()) return
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
      e.preventDefault()
    }
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') onPrev()
    else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') onNext()
    else if (e.key === 'Home') onHome()
    else if (e.key === 'End') onEnd()
  }

  onMounted(() => document.addEventListener('keydown', handleKeyDown))
  onUnmounted(() => document.removeEventListener('keydown', handleKeyDown))
}
