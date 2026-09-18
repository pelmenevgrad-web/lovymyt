// Public share-preview page for a single event, served at /e/:id (see
// ../../vercel.json for the rewrite). The Mini App itself can't carry OG
// tags per event — it's a MemoryRouter SPA always loaded at the same
// t.me startapp URL, and Telegram doesn't scrape mini-app deep links for
// per-parameter previews. This page exists only so link-preview crawlers
// (and, briefly, real visitors) see the event's title/photo/date before
// bouncing straight into the bot.
const API_URL = process.env.VITE_API_URL || 'https://lovymyt.onrender.com'
const BOT_USERNAME = 'lovymyt_bot'

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatDateTime(iso) {
  try {
    return new Intl.DateTimeFormat('uk-UA', {
      day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return null
  }
}

function renderPage({ title, description, image, botLink }) {
  const safeTitle = escapeHtml(title)
  const safeDescription = escapeHtml(description)
  return `<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${safeTitle}</title>
<meta property="og:type" content="website">
<meta property="og:site_name" content="ЛовиМить">
<meta property="og:title" content="${safeTitle}">
<meta property="og:description" content="${safeDescription}">
${image ? `<meta property="og:image" content="${escapeHtml(image)}">\n<meta name="twitter:card" content="summary_large_image">` : '<meta name="twitter:card" content="summary">'}
<meta http-equiv="refresh" content="0;url=${botLink}">
<script>location.replace(${JSON.stringify(botLink)})</script>
</head>
<body style="font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0F172A;color:#fff;text-align:center;padding:0 24px;">
<p>Відкриваємо ЛовиМить…<br><a href="${botLink}" style="color:#8B5CF6;">Натисни сюди, якщо нічого не сталося</a></p>
</body>
</html>`
}

export default async function handler(req, res) {
  const { id } = req.query
  const botLink = `https://t.me/${BOT_USERNAME}?startapp=event_${encodeURIComponent(id)}`

  let event = null
  try {
    const r = await fetch(`${API_URL}/events/${id}`)
    if (r.ok) {
      ;({ event } = await r.json())
    }
  } catch {
    // Backend unreachable — fall through to the generic fallback below,
    // the redirect into the bot still has to work either way.
  }

  const fallback = {
    title: 'ЛовиМить',
    description: 'Приєднуйся до заходу в ЛовиМить — знаходь компанію для спільного дозвілля поруч!',
    image: null,
  }

  const page = event
    ? {
        title: event.title || fallback.title,
        description: [formatDateTime(event.start_time), event.address_text].filter(Boolean).join(' • ') || fallback.description,
        image: event.cover_image_url || null,
      }
    : fallback

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300')
  res.status(200).send(renderPage({ ...page, botLink }))
}
