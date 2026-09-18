import WebApp from '@twa-dev/sdk'

export const BOT_USERNAME = 'lovymyt_bot'

// Deep link into the Mini App. `startParam` becomes WebApp.initDataUnsafe.start_param
// on the receiving end — only [A-Za-z0-9_-] survive Telegram's start_param, so event
// ids (uuids) are passed as `event_<uuid>` and stripped back off in App.jsx.
export function appLink(startParam) {
  return startParam ? `https://t.me/${BOT_USERNAME}?startapp=${startParam}` : `https://t.me/${BOT_USERNAME}`
}

// A plain t.me deep link has no per-event preview — Telegram only shows the
// bot's static name/photo when the link is pasted outside Telegram itself.
// /e/:id (see frontend/api/e/[id].js) is a small server-rendered page with
// real Open Graph tags for the event that immediately redirects into the
// bot, so pasting it into other apps/socials shows the event's own title,
// date and cover photo instead.
const SHARE_ORIGIN = 'https://lovymyt-phi.vercel.app'
export function eventShareLink(eventId) {
  return `${SHARE_ORIGIN}/e/${eventId}`
}

// Opens Telegram's native "forward to..." picker (contacts, groups, chats) with the
// given link + caption pre-filled. This is the only share surface a Mini App gets —
// there's no API to read a user's contacts or message them directly.
export function shareViaTelegram(url, text) {
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`
  WebApp.openTelegramLink(shareUrl)
}
