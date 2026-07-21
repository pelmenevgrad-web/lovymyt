import WebApp from '@twa-dev/sdk'

export const BOT_USERNAME = 'lovymyt_bot'

// Deep link into the Mini App. `startParam` becomes WebApp.initDataUnsafe.start_param
// on the receiving end — only [A-Za-z0-9_-] survive Telegram's start_param, so event
// ids (uuids) are passed as `event_<uuid>` and stripped back off in App.jsx.
export function appLink(startParam) {
  return startParam ? `https://t.me/${BOT_USERNAME}?startapp=${startParam}` : `https://t.me/${BOT_USERNAME}`
}

// Opens Telegram's native "forward to..." picker (contacts, groups, chats) with the
// given link + caption pre-filled. This is the only share surface a Mini App gets —
// there's no API to read a user's contacts or message them directly.
export function shareViaTelegram(url, text) {
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`
  WebApp.openTelegramLink(shareUrl)
}
