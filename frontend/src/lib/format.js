// "через 2 год 15 хв" for future events, "Зараз" right at start, otherwise the
// clock time it started/starts at.
export function formatCountdown(iso) {
  const diff = new Date(iso) - Date.now()
  if (Math.abs(diff) < 60_000) return 'Зараз'
  if (diff < 0) {
    return new Date(iso).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })
  }

  const totalMin = Math.round(diff / 60_000)
  const days = Math.floor(totalMin / 1440)
  const hours = Math.floor((totalMin % 1440) / 60)
  const mins = totalMin % 60

  if (days > 0) return `через ${days} дн ${hours} год`
  if (hours > 0) return `через ${hours} год ${mins} хв`
  return `через ${mins} хв`
}
