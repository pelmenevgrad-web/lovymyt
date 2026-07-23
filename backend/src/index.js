import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import { Telegraf } from 'telegraf'
import { createClient } from '@supabase/supabase-js'
import { verifyTelegramInitData } from './telegramAuth.js'

const PORT = process.env.PORT || 3000
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const WEBHOOK_URL = process.env.TELEGRAM_WEBHOOK_URL
const JWT_SECRET = process.env.JWT_SECRET

const app = express()
const httpServer = createServer(app)

const io = new Server(httpServer, {
  cors: { origin: '*' },
})

app.use(cors())
app.use(express.json({ limit: '8mb' }))

// Supabase client (service role для серверного доступа)
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

// Telegraf bot
const bot = new Telegraf(BOT_TOKEN)
const BOT_USERNAME = 'lovymyt_bot'

// Monetization via real Telegram Stars payments (currency 'XTR') — PRO is a
// direct 1-month invoice, top-ups credit users.stars_balance for future
// spending (gifts). Free tier is capped on simultaneous active events.
const PRO_PRICE_STARS = 300
const PRO_DURATION_DAYS = 30
const STARS_TOPUP_PACKAGES = [100, 300, 750]
const FREE_ACTIVE_EVENTS_LIMIT = 2

function isProActive(user) {
  return !!user.is_pro && (!user.pro_expires_at || new Date(user.pro_expires_at) > new Date())
}

bot.start((ctx) => ctx.reply('Ласкаво просимо в ЛовіМіть! Відкрий для себе новий світ емоцій.'))
bot.help((ctx) => ctx.reply('Используй кнопку меню для запуска приложения.'))

// Telegram requires answering within 10s — we don't need extra validation
// since the invoice price/payload were set by us moments earlier.
bot.on('pre_checkout_query', (ctx) => ctx.answerPreCheckoutQuery(true))

bot.on('message', async (ctx, next) => {
  const payment = ctx.message?.successful_payment
  if (!payment) return next()

  let payload
  try {
    payload = JSON.parse(payment.invoice_payload)
  } catch {
    console.error('Unparseable successful_payment payload:', payment.invoice_payload)
    return
  }

  const { data: user, error: userErr } = await supabase
    .from('users')
    .select('id, is_pro, pro_expires_at, stars_balance')
    .eq('telegram_id', ctx.from.id)
    .single()
  if (userErr || !user) {
    console.error('successful_payment: user not found for telegram_id', ctx.from.id)
    return
  }

  if (payload.type === 'topup') {
    const { error } = await supabase
      .from('users')
      .update({ stars_balance: user.stars_balance + payload.stars })
      .eq('id', user.id)
    if (error) return console.error('Crediting stars top-up failed:', error.message)

    await supabase.from('stars_transactions').insert({
      user_id: user.id, type: 'topup', amount: payload.stars,
      telegram_payment_charge_id: payment.telegram_payment_charge_id,
    })
    ctx.reply(`✅ Нараховано ${payload.stars} Stars. Твій баланс: ${user.stars_balance + payload.stars}`).catch(() => {})
  } else if (payload.type === 'pro') {
    const base = isProActive(user) ? new Date(user.pro_expires_at) : new Date()
    const newExpiry = new Date(base.getTime() + PRO_DURATION_DAYS * 86_400_000)

    const { error } = await supabase
      .from('users')
      .update({ is_pro: true, pro_expires_at: newExpiry.toISOString() })
      .eq('id', user.id)
    if (error) return console.error('Activating PRO failed:', error.message)

    await supabase.from('stars_transactions').insert({
      user_id: user.id, type: 'pro_purchase', amount: PRO_PRICE_STARS,
      telegram_payment_charge_id: payment.telegram_payment_charge_id,
    })
    ctx.reply(`✅ PRO активовано до ${newExpiry.toLocaleDateString('uk-UA')}`).catch(() => {})
  }
})

// DMs a user via the bot — works any time once they've opened the bot once
// (which auth already requires), not just while the Mini App is open.
// `startParam` becomes WebApp.initDataUnsafe.start_param on open (see App.jsx),
// e.g. "event_<uuid>" lands on the event page, "chat_<uuid>" opens its chat.
async function notifyUser(telegramId, text, startParam, buttonLabel = 'Відкрити захід') {
  if (!telegramId) return
  try {
    await bot.telegram.sendMessage(telegramId, text, {
      reply_markup: startParam
        ? { inline_keyboard: [[{ text: buttonLabel, url: `https://t.me/${BOT_USERNAME}?startapp=${startParam}` }]] }
        : undefined,
    })
  } catch (err) {
    console.error('Failed to notify user', telegramId, err.message)
  }
}

// Notifies everyone involved in an event (organizer + accepted participants)
// except the person who triggered it. textBuilder receives the event title.
async function notifyEventPeople(eventId, excludeUserId, textBuilder, startParam = `event_${eventId}`, buttonLabel) {
  const { data: event } = await supabase
    .from('events')
    .select('title, creator_id, creator:users!events_creator_id_fkey(telegram_id)')
    .eq('id', eventId)
    .single()
  if (!event) return

  const { data: participants } = await supabase
    .from('event_participants')
    .select('user:users(id, telegram_id)')
    .eq('event_id', eventId)
    .eq('status', 'accepted')

  const recipients = new Map()
  if (event.creator_id !== excludeUserId && event.creator?.telegram_id) {
    recipients.set(event.creator_id, event.creator.telegram_id)
  }
  for (const p of participants ?? []) {
    if (p.user && p.user.id !== excludeUserId && p.user.telegram_id) {
      recipients.set(p.user.id, p.user.telegram_id)
    }
  }

  const text = textBuilder(event.title)
  await Promise.all([...recipients.values()].map(tgId => notifyUser(tgId, text, startParam, buttonLabel)))
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

// Tells users who opted in (either "everywhere" or within their set radius)
// about a freshly created event, skipping its own creator.
async function notifyAboutNewEvent(event, creatorId) {
  const { data: candidates, error } = await supabase
    .from('users')
    .select('telegram_id, notify_all_events, notify_lat, notify_lng, notify_radius_km')
    .neq('id', creatorId)
    .or('notify_all_events.eq.true,notify_radius_km.not.is.null')

  if (error) {
    console.error('Fetching notify candidates failed:', error.message)
    return
  }

  const text = `🆕 Новий захід поруч: «${event.title}»\n📍 ${event.address_text}`

  await Promise.all(candidates.map(u => {
    const inRadius = u.notify_radius_km && u.notify_lat != null && u.notify_lng != null
      && haversineKm(u.notify_lat, u.notify_lng, event.lat, event.lng) <= u.notify_radius_km
    if (!(u.notify_all_events || inRadius)) return null
    return notifyUser(u.telegram_id, text, `event_${event.id}`)
  }))
}

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }))

// Telegram webhook
app.post('/webhook', (req, res) => {
  bot.handleUpdate(req.body, res)
})

// events_created_count/events_joined_count on the users row were never kept
// in sync by anything — computed live instead of trying to increment a
// stored counter at every place an event can become 'completed'.
async function computeUserStats(userId) {
  const { count: createdCount } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('creator_id', userId)
    .eq('status', 'completed')

  const { data: joinedRows } = await supabase
    .from('event_participants')
    .select('event:events!inner(status)')
    .eq('user_id', userId)
    .eq('status', 'accepted')
    .eq('events.status', 'completed')

  const { count: noShowCount } = await supabase
    .from('event_no_shows')
    .select('event_id', { count: 'exact', head: true })
    .eq('user_id', userId)

  return {
    events_created_count: createdCount ?? 0,
    events_joined_count: joinedRows?.length ?? 0,
    no_show_count: noShowCount ?? 0,
  }
}

// Telegram Mini App auth: verify initData signature, upsert the user, issue a JWT
app.post('/auth/telegram', async (req, res) => {
  const { initData } = req.body ?? {}
  const tgUser = verifyTelegramInitData(initData, BOT_TOKEN)

  if (!tgUser) {
    return res.status(401).json({ error: 'Invalid or expired Telegram initData' })
  }

  const { data: user, error } = await supabase
    .from('users')
    .upsert(
      {
        telegram_id: tgUser.id,
        username: tgUser.username ?? null,
        first_name: tgUser.first_name ?? null,
        avatar_url: tgUser.photo_url ?? null,
        last_active_at: new Date().toISOString(),
      },
      { onConflict: 'telegram_id' },
    )
    .select()
    .single()

  if (error) {
    console.error('Auth upsert failed:', error.message)
    return res.status(500).json({ error: 'Failed to persist user' })
  }

  if (user.is_banned) {
    return res.status(403).json({ error: `Тебе заблоковано.${user.ban_reason ? ` Причина: ${user.ban_reason}` : ''}` })
  }

  const token = jwt.sign({ sub: user.id, telegram_id: user.telegram_id }, JWT_SECRET, { expiresIn: '30d' })
  res.json({ token, user: { ...user, ...(await computeUserStats(user.id)) } })
})

// Requires a valid `Authorization: Bearer <jwt>` issued by /auth/telegram
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return res.status(401).json({ error: 'Missing bearer token' })
  }

  try {
    req.auth = jwt.verify(token, JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

// Like requireAuth, but doesn't reject when there's no/invalid token —
// used by public routes that want to know who's asking, if anyone.
function tryAuth(req) {
  const authHeader = req.headers.authorization ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return null
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch {
    return null
  }
}

// Same as requireAuth, but also requires the user to be flagged is_admin —
// used to gate every /admin/* route below.
async function requireAdmin(req, res, next) {
  requireAuth(req, res, async () => {
    const { data: user } = await supabase.from('users').select('is_admin').eq('id', req.auth.sub).single()
    if (!user?.is_admin) {
      return res.status(403).json({ error: 'Admin only' })
    }
    next()
  })
}

// Update the authenticated user's own editable profile fields
app.patch('/users/me', requireAuth, async (req, res) => {
  const { bio, gender, notify_lat, notify_lng, notify_radius_km, notify_all_events } = req.body ?? {}
  const patch = {}

  if (bio !== undefined) {
    if (typeof bio !== 'string' || bio.length > 300) {
      return res.status(400).json({ error: 'bio must be a string up to 300 characters' })
    }
    patch.bio = bio.trim() || null
  }

  if (gender !== undefined) {
    if (gender !== null && gender !== 'male' && gender !== 'female') {
      return res.status(400).json({ error: 'gender must be "male", "female" or null' })
    }
    patch.gender = gender
  }

  if (notify_all_events !== undefined) {
    patch.notify_all_events = !!notify_all_events
  }
  if (notify_lat !== undefined) patch.notify_lat = notify_lat
  if (notify_lng !== undefined) patch.notify_lng = notify_lng
  if (notify_radius_km !== undefined) patch.notify_radius_km = notify_radius_km

  if (Object.keys(patch).length === 0) {
    return res.status(400).json({ error: 'No editable fields provided' })
  }

  const { data: user, error } = await supabase
    .from('users')
    .update(patch)
    .eq('id', req.auth.sub)
    .select()
    .single()

  if (error) {
    console.error('Profile update failed:', error.message)
    return res.status(500).json({ error: 'Failed to update profile' })
  }

  res.json({ user: { ...user, ...(await computeUserStats(user.id)) } })
})

// Re-fetches the authenticated user's own row — used after actions that
// change it server-side without a request body (e.g. a Stars payment
// completing), where PATCH /users/me's "no editable fields" guard doesn't fit.
app.get('/users/me', requireAuth, async (req, res) => {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', req.auth.sub)
    .single()

  if (error) {
    return res.status(404).json({ error: 'User not found' })
  }

  res.json({ user: { ...user, ...(await computeUserStats(user.id)) } })
})

// Public profile — for viewing another user's page (e.g. an event's organizer)
app.get('/users/:id', async (req, res) => {
  const { data: user, error } = await supabase
    .from('users')
    .select('id, first_name, avatar_url, bio, is_verified, is_pro, rating_avg, rating_count')
    .eq('id', req.params.id)
    .single()

  if (error) {
    return res.status(404).json({ error: 'User not found' })
  }

  res.json({ user: { ...user, ...(await computeUserStats(user.id)) } })
})

// Real-money Telegram Stars invoice (currency 'XTR', no provider_token needed)
// to top up the in-app stars_balance — credited once bot.on('message') sees
// the matching successful_payment (see near top of file).
app.post('/stars/topup', requireAuth, async (req, res) => {
  const amount = Number(req.body?.package)
  if (!STARS_TOPUP_PACKAGES.includes(amount)) {
    return res.status(400).json({ error: 'Invalid package' })
  }

  try {
    const invoiceLink = await bot.telegram.createInvoiceLink({
      title: `${amount} Stars`,
      description: `Поповнення балансу на ${amount} Stars у ЛовиМить`,
      payload: JSON.stringify({ type: 'topup', stars: amount }),
      provider_token: '',
      currency: 'XTR',
      prices: [{ label: `${amount} Stars`, amount }],
    })
    res.json({ invoice_link: invoiceLink })
  } catch (err) {
    console.error('Creating top-up invoice failed:', err.message)
    res.status(500).json({ error: 'Failed to create invoice' })
  }
})

// Real-money Stars invoice for a 1-month PRO subscription (stacks onto the
// remaining time if already PRO, rather than wasting it).
app.post('/pro/subscribe', requireAuth, async (req, res) => {
  try {
    const invoiceLink = await bot.telegram.createInvoiceLink({
      title: 'ЛовиМить PRO — 1 місяць',
      description: 'Необмежені активні заходи, пріоритет на карті',
      payload: JSON.stringify({ type: 'pro' }),
      provider_token: '',
      currency: 'XTR',
      prices: [{ label: 'PRO — 1 місяць', amount: PRO_PRICE_STARS }],
    })
    res.json({ invoice_link: invoiceLink })
  } catch (err) {
    console.error('Creating PRO invoice failed:', err.message)
    res.status(500).json({ error: 'Failed to create invoice' })
  }
})

// Public list of event categories — icon_name is a lucide-react component name
app.get('/categories', async (_req, res) => {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, icon_name, color')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Fetching categories failed:', error.message)
    return res.status(500).json({ error: 'Failed to load categories' })
  }
  res.json({ categories: data })
})

// Public list of the funny-status labels reviewers can tag participants with
app.get('/funny-statuses', async (_req, res) => {
  const { data, error } = await supabase
    .from('funny_statuses')
    .select('id, label, icon_name')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Fetching funny statuses failed:', error.message)
    return res.status(500).json({ error: 'Failed to load funny statuses' })
  }
  res.json({ funny_statuses: data })
})

// Public catalog of gifts users can send each other with Stars
app.get('/gifts', async (_req, res) => {
  const { data, error } = await supabase
    .from('gifts_catalog')
    .select('id, name, icon_name, color, price_stars')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Fetching gifts catalog failed:', error.message)
    return res.status(500).json({ error: 'Failed to load gifts' })
  }
  res.json({ gifts: data })
})

// Gifts a given user has received — shown on their profile
app.get('/users/:id/gifts', async (req, res) => {
  const { data, error } = await supabase
    .from('likes_gifts')
    .select('id, stars_amount, created_at, gift:gifts_catalog(id, name, icon_name, color), from_user:users!likes_gifts_from_user_id_fkey(id, first_name, avatar_url)')
    .eq('to_user_id', req.params.id)
    .eq('type', 'gift')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Fetching received gifts failed:', error.message)
    return res.status(500).json({ error: 'Failed to load gifts' })
  }
  res.json({ gifts: data })
})

// Send a gift to another user — price_stars moves from the sender's balance
// straight onto the recipient's (a tip, not a platform fee), so both ends of
// stars_transactions' gift_sent/gift_received are recorded.
app.post('/users/:id/gifts', requireAuth, async (req, res) => {
  if (req.params.id === req.auth.sub) {
    return res.status(400).json({ error: 'Не можна дарувати подарунок собі' })
  }

  const { data: gift, error: giftErr } = await supabase
    .from('gifts_catalog')
    .select('id, name, price_stars')
    .eq('id', req.body?.gift_id)
    .eq('is_active', true)
    .single()
  if (giftErr || !gift) {
    return res.status(404).json({ error: 'Подарунок не знайдено' })
  }

  const { data: sender, error: senderErr } = await supabase
    .from('users')
    .select('stars_balance, first_name')
    .eq('id', req.auth.sub)
    .single()
  if (senderErr || !sender) {
    return res.status(500).json({ error: 'Failed to load sender' })
  }
  if (sender.stars_balance < gift.price_stars) {
    return res.status(400).json({ error: 'Недостатньо Stars на балансі' })
  }

  const { data: recipient, error: recipientErr } = await supabase
    .from('users')
    .select('stars_balance, telegram_id')
    .eq('id', req.params.id)
    .single()
  if (recipientErr || !recipient) {
    return res.status(404).json({ error: 'User not found' })
  }

  const { error: debitErr } = await supabase
    .from('users').update({ stars_balance: sender.stars_balance - gift.price_stars }).eq('id', req.auth.sub)
  if (debitErr) {
    console.error('Debiting gift sender failed:', debitErr.message)
    return res.status(500).json({ error: 'Failed to send gift' })
  }
  const { error: creditErr } = await supabase
    .from('users').update({ stars_balance: recipient.stars_balance + gift.price_stars }).eq('id', req.params.id)
  if (creditErr) {
    // best-effort rollback of the debit above
    await supabase.from('users').update({ stars_balance: sender.stars_balance }).eq('id', req.auth.sub)
    console.error('Crediting gift recipient failed:', creditErr.message)
    return res.status(500).json({ error: 'Failed to send gift' })
  }

  await supabase.from('likes_gifts').insert({
    from_user_id: req.auth.sub, to_user_id: req.params.id,
    type: 'gift', gift_id: gift.id, stars_amount: gift.price_stars,
  })
  await supabase.from('stars_transactions').insert([
    { user_id: req.auth.sub, type: 'gift_sent', amount: -gift.price_stars },
    { user_id: req.params.id, type: 'gift_received', amount: gift.price_stars },
  ])

  notifyUser(recipient.telegram_id, `🎁 ${sender.first_name ?? 'Хтось'} подарував(-ла) тобі: ${gift.name}!`, `user_${req.params.id}`, 'Відкрити профіль').catch(() => {})

  res.status(201).json({ ok: true, stars_balance: sender.stars_balance - gift.price_stars })
})

const EVENT_SELECT = '*, creator:users!events_creator_id_fkey(first_name, avatar_url, is_pro), participants:event_participants(status, user:users(id, first_name, avatar_url)), categoryLinks:event_categories(category_id)'

// Shapes a DB row (with embedded creator/participants) into the flat object
// shape the frontend already works with (same fields as the old mocks).
function shapeEvent(row) {
  const { late_join_allowed, ...conditions } = row.conditions ?? {}
  const accepted = (row.participants ?? []).filter(p => p.status === 'accepted' && p.user)
  const category_ids = (row.categoryLinks ?? []).map(c => c.category_id)
  return {
    id: row.id,
    title: row.title,
    category_id: row.category_id,
    category_ids: category_ids.length > 0 ? category_ids : (row.category_id ? [row.category_id] : []),
    status: row.status,
    cover_image_url: row.cover_image_url ?? null,
    start_time: row.start_time,
    end_time: row.end_time,
    duration_min_hours: row.duration_min_hours,
    lat: row.lat,
    lng: row.lng,
    address_text: row.address_text,
    max_participants: row.max_participants,
    current_participants: accepted.length,
    participant_avatars: accepted.slice(0, 4).map(p => ({
      id: p.user.id, first_name: p.user.first_name, avatar_url: p.user.avatar_url,
    })),
    creator_id: row.creator_id,
    creator_name: row.creator?.first_name ?? 'Користувач',
    creator_avatar_url: row.creator?.avatar_url ?? null,
    creator_is_pro: row.creator?.is_pro ?? false,
    budget_type: row.budget_type,
    budget_amount: row.budget_amount,
    age_min: row.age_min,
    age_max: row.age_max,
    allowed_gender: row.allowed_gender ?? 'any',
    max_male: row.max_male,
    max_female: row.max_female,
    late_join_allowed: late_join_allowed ?? false,
    conditions,
  }
}

// Public list of upcoming/in-progress events for the map
app.get('/events', async (_req, res) => {
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_SELECT)
    .in('status', ['planned', 'gathering', 'active'])
    .order('is_pro', { foreignTable: 'creator', ascending: false })
    .order('start_time', { ascending: true })

  if (error) {
    console.error('Fetching events failed:', error.message)
    return res.status(500).json({ error: 'Failed to load events' })
  }

  res.json({ events: data.map(shapeEvent) })
})

// Past events, ranked by average rating (from reviews left about that event)
app.get('/events/history', async (_req, res) => {
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_SELECT)
    .eq('status', 'completed')
    .order('start_time', { ascending: false })

  if (error) {
    console.error('Fetching event history failed:', error.message)
    return res.status(500).json({ error: 'Failed to load event history' })
  }

  const { data: reviews, error: reviewsError } = await supabase
    .from('reviews')
    .select('event_id, rating')
    .in('event_id', data.map((row) => row.id))

  if (reviewsError) {
    console.error('Fetching event ratings failed:', reviewsError.message)
    return res.status(500).json({ error: 'Failed to load event history' })
  }

  const ratingsByEvent = new Map()
  for (const { event_id, rating } of reviews) {
    const bucket = ratingsByEvent.get(event_id) ?? []
    bucket.push(rating)
    ratingsByEvent.set(event_id, bucket)
  }

  const events = data
    .map((row) => {
      const ratings = ratingsByEvent.get(row.id) ?? []
      const rating_avg = ratings.length
        ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 100) / 100
        : null
      return { ...shapeEvent(row), rating_avg, rating_count: ratings.length }
    })
    .sort((a, b) => (b.rating_avg ?? -1) - (a.rating_avg ?? -1))

  res.json({ events })
})

// duration_max_hours becomes end_time (start_time + N hours) — the hard
// cutoff where the background sweep (see setInterval below) auto-completes
// the event if the organizer hasn't already. duration_min_hours is descriptive only.
function computeEndTime(startTime, durationMaxHours) {
  if (!durationMaxHours) return null
  return new Date(new Date(startTime).getTime() + durationMaxHours * 3_600_000).toISOString()
}

// Validates the category_ids array shared by POST/PATCH /events — an event
// can now be tagged with more than one category (e.g. picnic + concert).
function parseCategoryIds(category_ids) {
  if (!Array.isArray(category_ids) || category_ids.length === 0) return null
  const ids = category_ids.map(Number).filter(Number.isInteger)
  return ids.length > 0 ? [...new Set(ids)] : null
}

// Replaces the full category set for an event (delete + insert is simplest
// and keeps create/edit using the same logic).
async function syncEventCategories(eventId, categoryIds) {
  await supabase.from('event_categories').delete().eq('event_id', eventId)
  await supabase.from('event_categories').insert(categoryIds.map(category_id => ({ event_id: eventId, category_id })))
}

// Create a new event owned by the authenticated user
app.post('/events', requireAuth, async (req, res) => {
  const {
    category_ids, title, description, address_text, start_time, lat, lng,
    max_participants, min_participants, budget_type, budget_amount,
    age_min, age_max, late_join_allowed, conditions,
    allowed_gender, max_male, max_female,
    duration_min_hours, duration_max_hours, cover_image,
  } = req.body ?? {}

  const categoryIds = parseCategoryIds(category_ids)
  if (!categoryIds || !title?.trim() || !address_text?.trim() || !start_time || lat == null || lng == null) {
    return res.status(400).json({ error: 'Missing required fields' })
  }
  if (!duration_max_hours || duration_max_hours <= 0) {
    return res.status(400).json({ error: 'Потрібна максимальна тривалість заходу' })
  }
  if (allowed_gender && !['any', 'male', 'female'].includes(allowed_gender)) {
    return res.status(400).json({ error: 'allowed_gender must be "any", "male" or "female"' })
  }

  const { data: creator } = await supabase
    .from('users')
    .select('is_pro, pro_expires_at')
    .eq('id', req.auth.sub)
    .single()

  if (!isProActive(creator ?? {})) {
    const { count: activeCount } = await supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('creator_id', req.auth.sub)
      .in('status', ['planned', 'gathering', 'active'])

    if ((activeCount ?? 0) >= FREE_ACTIVE_EVENTS_LIMIT) {
      return res.status(403).json({
        error: `На безкоштовному тарифі можна мати не більше ${FREE_ACTIVE_EVENTS_LIMIT} активних заходів. Онови до PRO для необмеженої кількості.`,
        code: 'FREE_EVENT_LIMIT',
      })
    }
  }

  try {
    const cover_image_url = await resolveCoverImage(cover_image, req.auth.sub)

    const { data: created, error } = await supabase
      .from('events')
      .insert({
        creator_id: req.auth.sub,
        category_id: categoryIds[0], title: title.trim(), description: description?.trim() || null,
        address_text: address_text.trim(),
        start_time, lat, lng,
        end_time: computeEndTime(start_time, duration_max_hours),
        duration_min_hours: duration_min_hours || null,
        max_participants, min_participants, budget_type,
        budget_amount: budget_amount || null,
        age_min: age_min || null, age_max: age_max || null,
        allowed_gender: allowed_gender || 'any',
        max_male: max_male || null, max_female: max_female || null,
        conditions: { ...(conditions ?? {}), late_join_allowed: !!late_join_allowed },
        cover_image_url,
      })
      .select('id')
      .single()

    if (error) throw error

    await syncEventCategories(created.id, categoryIds)

    const { data: row, error: refetchErr } = await supabase
      .from('events')
      .select(EVENT_SELECT)
      .eq('id', created.id)
      .single()
    if (refetchErr) throw refetchErr

    const shaped = shapeEvent(row)
    notifyAboutNewEvent(shaped, req.auth.sub).catch(() => {})

    res.status(201).json({ event: shaped })
  } catch (err) {
    if (err instanceof ImageUploadError) {
      return res.status(400).json({ error: err.message })
    }
    console.error('Creating event failed:', err.message)
    res.status(500).json({ error: 'Failed to create event' })
  }
})

// Edit an event — organizer only
app.patch('/events/:id', requireAuth, async (req, res) => {
  const { data: existing, error: fetchErr } = await supabase
    .from('events')
    .select('creator_id')
    .eq('id', req.params.id)
    .single()

  if (fetchErr) {
    return res.status(404).json({ error: 'Event not found' })
  }
  if (existing.creator_id !== req.auth.sub) {
    return res.status(403).json({ error: 'Тільки організатор може редагувати захід' })
  }

  const {
    category_ids, title, description, address_text, start_time, lat, lng,
    max_participants, min_participants, budget_type, budget_amount,
    age_min, age_max, late_join_allowed, conditions,
    allowed_gender, max_male, max_female,
    duration_min_hours, duration_max_hours, cover_image,
  } = req.body ?? {}

  const categoryIds = parseCategoryIds(category_ids)
  if (!categoryIds || !title?.trim() || !address_text?.trim() || !start_time || lat == null || lng == null) {
    return res.status(400).json({ error: 'Missing required fields' })
  }
  if (!duration_max_hours || duration_max_hours <= 0) {
    return res.status(400).json({ error: 'Потрібна максимальна тривалість заходу' })
  }
  if (allowed_gender && !['any', 'male', 'female'].includes(allowed_gender)) {
    return res.status(400).json({ error: 'allowed_gender must be "any", "male" or "female"' })
  }

  let row, error
  try {
    const cover_image_url = await resolveCoverImage(cover_image, req.auth.sub)
    const { error: updateErr } = await supabase
      .from('events')
      .update({
        category_id: categoryIds[0], title: title.trim(), description: description?.trim() || null,
        address_text: address_text.trim(),
        start_time, lat, lng,
        end_time: computeEndTime(start_time, duration_max_hours),
        duration_min_hours: duration_min_hours || null,
        max_participants, min_participants, budget_type,
        budget_amount: budget_amount || null,
        age_min: age_min || null, age_max: age_max || null,
        allowed_gender: allowed_gender || 'any',
        max_male: max_male || null, max_female: max_female || null,
        conditions: { ...(conditions ?? {}), late_join_allowed: !!late_join_allowed },
        cover_image_url,
      })
      .eq('id', req.params.id)
    if (updateErr) throw updateErr

    await syncEventCategories(req.params.id, categoryIds)
    ;({ data: row, error } = await supabase
      .from('events')
      .select(EVENT_SELECT)
      .eq('id', req.params.id)
      .single())
  } catch (err) {
    if (err instanceof ImageUploadError) {
      return res.status(400).json({ error: err.message })
    }
    console.error('Updating event failed:', err.message)
    return res.status(500).json({ error: 'Failed to update event' })
  }

  if (error) {
    console.error('Updating event failed:', error.message)
    return res.status(500).json({ error: 'Failed to update event' })
  }

  res.json({ event: shapeEvent(row) })
})

// Manually end an event — organizer only
app.post('/events/:id/complete', requireAuth, async (req, res) => {
  const { data: existing, error: fetchErr } = await supabase
    .from('events')
    .select('creator_id')
    .eq('id', req.params.id)
    .single()

  if (fetchErr) {
    return res.status(404).json({ error: 'Event not found' })
  }
  if (existing.creator_id !== req.auth.sub) {
    return res.status(403).json({ error: 'Тільки організатор може завершити захід' })
  }

  const { data: row, error } = await supabase
    .from('events')
    .update({ status: 'completed' })
    .eq('id', req.params.id)
    .select(EVENT_SELECT)
    .single()

  if (error) {
    console.error('Completing event failed:', error.message)
    return res.status(500).json({ error: 'Failed to complete event' })
  }

  res.json({ event: shapeEvent(row) })
})

// Single event's full detail — includes the caller's own participation
// status (if authenticated) so the detail page knows whether to show
// "Приєднатися" or "Ви вже приєднались".
app.get('/events/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_SELECT)
    .eq('id', req.params.id)
    .single()

  if (error) {
    return res.status(404).json({ error: 'Event not found' })
  }

  const auth = tryAuth(req)
  let myStatus = null
  if (auth) {
    const { data: participant } = await supabase
      .from('event_participants')
      .select('status')
      .eq('event_id', req.params.id)
      .eq('user_id', auth.sub)
      .maybeSingle()
    myStatus = participant?.status ?? null
  }

  res.json({
    event: {
      ...shapeEvent(data),
      description: data.description,
      min_participants: data.min_participants,
      is_creator: auth?.sub === data.creator_id,
      my_status: myStatus,
    },
  })
})

// Events the caller either created or has joined — for the profile's "Мої заходи"
app.get('/users/me/events', requireAuth, async (req, res) => {
  const { data: joinedRows, error: joinedErr } = await supabase
    .from('event_participants')
    .select('event_id')
    .eq('user_id', req.auth.sub)
    .eq('status', 'accepted')

  if (joinedErr) {
    console.error('Fetching joined event ids failed:', joinedErr.message)
    return res.status(500).json({ error: 'Failed to load your events' })
  }

  const joinedIds = joinedRows.map(r => r.event_id)
  let query = supabase
    .from('events')
    .select(EVENT_SELECT)
    .order('start_time', { ascending: true })

  query = joinedIds.length > 0
    ? query.or(`creator_id.eq.${req.auth.sub},id.in.(${joinedIds.join(',')})`)
    : query.eq('creator_id', req.auth.sub)

  const { data, error } = await query

  if (error) {
    console.error('Fetching my events failed:', error.message)
    return res.status(500).json({ error: 'Failed to load your events' })
  }

  res.json({
    events: data.map(row => ({ ...shapeEvent(row), is_creator: row.creator_id === req.auth.sub })),
  })
})

const GENDER_LABEL = { male: 'чоловіків', female: 'жінок' }

// Join an event — instant acceptance for now (no organizer approval step yet)
app.post('/events/:id/join', requireAuth, async (req, res) => {
  const { data: event, error: eventErr } = await supabase
    .from('events')
    .select('creator_id, allowed_gender, max_male, max_female, status')
    .eq('id', req.params.id)
    .single()

  if (eventErr) {
    return res.status(404).json({ error: 'Event not found' })
  }
  if (event.creator_id === req.auth.sub) {
    return res.status(400).json({ error: 'Не можна приєднатися до власного заходу' })
  }
  if (event.status === 'completed' || event.status === 'cancelled') {
    return res.status(400).json({ error: 'Цей захід вже завершено' })
  }

  const { data: joiner, error: joinerErr } = await supabase
    .from('users')
    .select('gender, first_name')
    .eq('id', req.auth.sub)
    .single()

  if (joinerErr) {
    console.error('Fetching joiner failed:', joinerErr.message)
    return res.status(500).json({ error: 'Failed to verify user' })
  }

  if (event.allowed_gender && event.allowed_gender !== 'any') {
    if (!joiner.gender) {
      return res.status(403).json({ error: `Цей захід тільки для ${GENDER_LABEL[event.allowed_gender]}. Вкажи свою стать у профілі, щоб приєднатися.` })
    }
    if (joiner.gender !== event.allowed_gender) {
      return res.status(403).json({ error: `Цей захід тільки для ${GENDER_LABEL[event.allowed_gender]}` })
    }
  }

  const quota = joiner.gender === 'male' ? event.max_male : joiner.gender === 'female' ? event.max_female : null
  if (quota) {
    const { data: sameGender, error: countErr } = await supabase
      .from('event_participants')
      .select('user:users!inner(gender)')
      .eq('event_id', req.params.id)
      .eq('status', 'accepted')
      .eq('users.gender', joiner.gender)

    if (countErr) {
      console.error('Counting participants by gender failed:', countErr.message)
      return res.status(500).json({ error: 'Failed to verify quota' })
    }
    if (sameGender.length >= quota) {
      return res.status(403).json({ error: `Ліміт для ${GENDER_LABEL[joiner.gender]} вже заповнений` })
    }
  }

  const { data, error } = await supabase
    .from('event_participants')
    .upsert(
      { event_id: req.params.id, user_id: req.auth.sub, status: 'accepted' },
      { onConflict: 'event_id,user_id' },
    )
    .select()
    .single()

  if (error) {
    console.error('Join failed:', error.message)
    return res.status(500).json({ error: 'Failed to join event' })
  }

  notifyEventPeople(req.params.id, req.auth.sub, (title) =>
    `✅ ${joiner.first_name ?? 'Хтось'} приєднався до заходу «${title}»`,
  ).catch(() => {})

  res.json({ participant: data })
})

// People who can be rated after the event: the creator plus everyone accepted
app.get('/events/:id/participants', async (req, res) => {
  const { data: event, error: eventErr } = await supabase
    .from('events')
    .select('creator_id, creator:users!events_creator_id_fkey(id, first_name, avatar_url)')
    .eq('id', req.params.id)
    .single()

  if (eventErr) {
    return res.status(404).json({ error: 'Event not found' })
  }

  const { data: accepted, error: participantsErr } = await supabase
    .from('event_participants')
    .select('user:users(id, first_name, avatar_url)')
    .eq('event_id', req.params.id)
    .eq('status', 'accepted')

  if (participantsErr) {
    console.error('Fetching participants failed:', participantsErr.message)
    return res.status(500).json({ error: 'Failed to load participants' })
  }

  const seen = new Set()
  const people = [event.creator, ...accepted.map(p => p.user)].filter(person => {
    if (!person || seen.has(person.id)) return false
    seen.add(person.id)
    return true
  })

  res.json({ participants: people, creator_id: event.creator_id })
})

// Organizer removes an accepted participant, with a reason shown to them
app.post('/events/:id/participants/:userId/decline', requireAuth, async (req, res) => {
  const { data: event, error: eventErr } = await supabase
    .from('events')
    .select('title, creator_id, status')
    .eq('id', req.params.id)
    .single()

  if (eventErr) {
    return res.status(404).json({ error: 'Event not found' })
  }
  if (event.creator_id !== req.auth.sub) {
    return res.status(403).json({ error: 'Тільки організатор може відмовити учаснику' })
  }
  if (req.params.userId === event.creator_id) {
    return res.status(400).json({ error: 'Не можна відмовити собі' })
  }
  if (event.status === 'completed' || event.status === 'cancelled') {
    return res.status(400).json({ error: 'Захід вже завершено' })
  }

  const reason = req.body?.reason?.trim()
  if (!reason) {
    return res.status(400).json({ error: 'Опиши причину відмови' })
  }

  const { data: declined, error } = await supabase
    .from('event_participants')
    .update({ status: 'declined', decline_reason: reason })
    .eq('event_id', req.params.id)
    .eq('user_id', req.params.userId)
    .eq('status', 'accepted')
    .select('user:users(telegram_id)')
    .single()

  if (error || !declined) {
    console.error('Declining participant failed:', error?.message)
    return res.status(500).json({ error: 'Failed to decline participant' })
  }

  notifyUser(
    declined.user?.telegram_id,
    `❌ Організатор відмовив тобі в участі у заході «${event.title}».\nПричина: ${reason}`,
  ).catch(() => {})

  res.json({ ok: true })
})

// Submit ratings/comments for other people who were at the same event.
// Upserts so re-submitting just edits the earlier review instead of erroring.
app.post('/events/:id/reviews', requireAuth, async (req, res) => {
  const { reviews } = req.body ?? {}
  if (!Array.isArray(reviews) || reviews.length === 0) {
    return res.status(400).json({ error: 'reviews must be a non-empty array' })
  }

  const { data: validStatuses } = await supabase.from('funny_statuses').select('label').eq('is_active', true)
  const validLabels = new Set((validStatuses ?? []).map(s => s.label))

  const rows = reviews
    .filter(r => r.to_user_id && r.to_user_id !== req.auth.sub && Number(r.rating) >= 1 && Number(r.rating) <= 5)
    .map(r => ({
      event_id: req.params.id,
      from_user_id: req.auth.sub,
      to_user_id: r.to_user_id,
      rating: Number(r.rating),
      comment: r.comment?.trim() || null,
      funny_status: validLabels.has(r.funny_status) ? r.funny_status : null,
    }))

  if (rows.length === 0) {
    return res.status(400).json({ error: 'No valid reviews to submit' })
  }

  const { error } = await supabase
    .from('reviews')
    .upsert(rows, { onConflict: 'event_id,from_user_id,to_user_id' })

  if (error) {
    console.error('Submitting reviews failed:', error.message)
    return res.status(500).json({ error: 'Failed to submit reviews' })
  }

  res.status(201).json({ ok: true })
})

// Organizer sets the no-show list for a completed event — resubmitting from
// the review screen replaces the whole set rather than accumulating duplicates.
app.post('/events/:id/no-shows', requireAuth, async (req, res) => {
  const { data: event, error: eventErr } = await supabase
    .from('events')
    .select('creator_id, status')
    .eq('id', req.params.id)
    .single()

  if (eventErr) {
    return res.status(404).json({ error: 'Event not found' })
  }
  if (event.creator_id !== req.auth.sub) {
    return res.status(403).json({ error: 'Тільки організатор може відмічати неявку' })
  }
  if (event.status !== 'completed') {
    return res.status(400).json({ error: 'Захід ще не завершено' })
  }

  const userIds = Array.isArray(req.body?.user_ids) ? req.body.user_ids.filter(Boolean) : []

  const { error: deleteErr } = await supabase.from('event_no_shows').delete().eq('event_id', req.params.id)
  if (deleteErr) {
    console.error('Clearing no-shows failed:', deleteErr.message)
    return res.status(500).json({ error: 'Failed to update no-shows' })
  }

  if (userIds.length > 0) {
    const { error: insertErr } = await supabase
      .from('event_no_shows')
      .insert(userIds.map(userId => ({ event_id: req.params.id, user_id: userId, marked_by: req.auth.sub })))
    if (insertErr) {
      console.error('Setting no-shows failed:', insertErr.message)
      return res.status(500).json({ error: 'Failed to update no-shows' })
    }
  }

  res.json({ ok: true })
})

// Public list of reviews someone has received — shown on their profile
app.get('/users/:id/reviews', async (req, res) => {
  const { data, error } = await supabase
    .from('reviews')
    .select('id, rating, comment, funny_status, created_at, from_user:users!reviews_from_user_id_fkey(id, first_name, avatar_url), event:events(id, title)')
    .eq('to_user_id', req.params.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Fetching user reviews failed:', error.message)
    return res.status(500).json({ error: 'Failed to load reviews' })
  }

  res.json({ reviews: data })
})

// Public archive of completed events someone attended (organizer or accepted
// participant) — the "Надійність" drill-down on their profile.
app.get('/users/:id/events', async (req, res) => {
  const { data: joinedRows, error: joinedErr } = await supabase
    .from('event_participants')
    .select('event_id')
    .eq('user_id', req.params.id)
    .eq('status', 'accepted')

  if (joinedErr) {
    console.error('Fetching joined event ids failed:', joinedErr.message)
    return res.status(500).json({ error: 'Failed to load events' })
  }

  const joinedIds = joinedRows.map(r => r.event_id)
  let query = supabase
    .from('events')
    .select(EVENT_SELECT)
    .eq('status', 'completed')
    .order('start_time', { ascending: false })

  query = joinedIds.length > 0
    ? query.or(`creator_id.eq.${req.params.id},id.in.(${joinedIds.join(',')})`)
    : query.eq('creator_id', req.params.id)

  const { data, error } = await query

  if (error) {
    console.error('Fetching user event archive failed:', error.message)
    return res.status(500).json({ error: 'Failed to load events' })
  }

  res.json({
    events: data.map(row => ({ ...shapeEvent(row), is_creator: row.creator_id === req.params.id })),
  })
})

const SUPPLY_SELECT = '*, claims:event_supply_claims(amount, user:users(id, first_name, avatar_url))'

function shapeSupply(row) {
  const claims = (row.claims ?? []).filter(c => c.user)
  const claimed_amount = claims.reduce((sum, c) => sum + Number(c.amount), 0)
  return {
    id: row.id,
    name: row.name,
    needed_amount: Number(row.needed_amount),
    unit: row.unit,
    claimed_amount,
    claims: claims.map(c => ({
      user_id: c.user.id, first_name: c.user.first_name, avatar_url: c.user.avatar_url, amount: Number(c.amount),
    })),
  }
}

// What's needed for the event (уголь, дрова, вода...) — public read
app.get('/events/:id/supplies', async (req, res) => {
  const { data, error } = await supabase
    .from('event_supplies')
    .select(SUPPLY_SELECT)
    .eq('event_id', req.params.id)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Fetching supplies failed:', error.message)
    return res.status(500).json({ error: 'Failed to load supplies' })
  }

  res.json({ supplies: data.map(shapeSupply) })
})

// Only the organizer can define what's needed
app.post('/events/:id/supplies', requireAuth, async (req, res) => {
  const { data: event, error: eventErr } = await supabase
    .from('events')
    .select('creator_id')
    .eq('id', req.params.id)
    .single()

  if (eventErr) {
    return res.status(404).json({ error: 'Event not found' })
  }
  if (event.creator_id !== req.auth.sub) {
    return res.status(403).json({ error: 'Тільки організатор може додавати список необхідного' })
  }

  const { name, needed_amount, unit } = req.body ?? {}
  if (!name?.trim() || !(Number(needed_amount) > 0)) {
    return res.status(400).json({ error: 'Потрібні назва і кількість більше нуля' })
  }

  const { data: row, error } = await supabase
    .from('event_supplies')
    .insert({
      event_id: req.params.id,
      name: name.trim(),
      needed_amount: Number(needed_amount),
      unit: unit?.trim() || null,
    })
    .select(SUPPLY_SELECT)
    .single()

  if (error) {
    console.error('Adding supply failed:', error.message)
    return res.status(500).json({ error: 'Failed to add item' })
  }

  res.status(201).json({ supply: shapeSupply(row) })
})

// Claim how much of an item you'll bring — amount <= 0 removes your claim
app.post('/events/:id/supplies/:supplyId/claim', requireAuth, async (req, res) => {
  const amount = Number(req.body?.amount)

  if (!amount || amount <= 0) {
    const { error } = await supabase
      .from('event_supply_claims')
      .delete()
      .eq('supply_id', req.params.supplyId)
      .eq('user_id', req.auth.sub)

    if (error) {
      console.error('Removing claim failed:', error.message)
      return res.status(500).json({ error: 'Failed to update claim' })
    }
    return res.json({ removed: true })
  }

  const { data, error } = await supabase
    .from('event_supply_claims')
    .upsert(
      { supply_id: req.params.supplyId, user_id: req.auth.sub, amount },
      { onConflict: 'supply_id,user_id' },
    )
    .select()
    .single()

  if (error) {
    console.error('Claiming supply failed:', error.message)
    return res.status(500).json({ error: 'Failed to claim item' })
  }

  const [{ data: supply }, { data: claimer }] = await Promise.all([
    supabase.from('event_supplies').select('name, unit').eq('id', req.params.supplyId).single(),
    supabase.from('users').select('first_name').eq('id', req.auth.sub).single(),
  ])
  notifyEventPeople(req.params.id, req.auth.sub, (title) =>
    `🎒 ${claimer?.first_name ?? 'Хтось'} принесе ${amount}${supply?.unit ? ' ' + supply.unit : ''} (${supply?.name ?? 'щось'}) на «${title}»`,
  ).catch(() => {})

  res.json({ claim: data })
})

// Only the organizer or an accepted participant can read/write an event's chat
async function canAccessChat(eventId, userId) {
  const { data: event } = await supabase.from('events').select('creator_id').eq('id', eventId).single()
  if (!event) return false
  if (event.creator_id === userId) return true

  const { data: participant } = await supabase
    .from('event_participants')
    .select('status')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .eq('status', 'accepted')
    .maybeSingle()
  return !!participant
}

async function getOrCreateChat(eventId) {
  const { data: existing } = await supabase.from('event_chats').select('id').eq('event_id', eventId).maybeSingle()
  if (existing) return existing.id

  const { data: created, error } = await supabase.from('event_chats').insert({ event_id: eventId }).select('id').single()
  if (error) throw error
  await supabase.from('events').update({ chat_id: created.id }).eq('id', eventId)
  return created.id
}

const CHAT_MESSAGE_SELECT = 'id, text, image_url, is_system, created_at, sender:users(id, first_name, avatar_url)'
const MAX_IMAGE_BYTES = 8 * 1024 * 1024

class ImageUploadError extends Error {}

// Shared by chat messages and event reports — both let a user attach one
// photo as a base64 data URL, uploaded to Storage under `bucket`.
async function uploadImageDataUrl(dataUrl, bucket, pathPrefix) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(dataUrl)
  if (!match) throw new ImageUploadError('Непідтримуваний формат зображення')
  const [, mime, base64Data] = match
  const buffer = Buffer.from(base64Data, 'base64')
  if (buffer.length > MAX_IMAGE_BYTES) throw new ImageUploadError('Зображення завелике (макс. 8 МБ)')
  const ext = mime.split('/')[1]
  const path = `${pathPrefix}-${Date.now()}.${ext}`
  const { error } = await supabase.storage.from(bucket).upload(path, buffer, { contentType: mime })
  if (error) throw error
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}

// Resolves events.cover_image_url from request input: an already-hosted URL
// (unchanged on edit) passes through, a new data: URL gets uploaded, and
// null/omitted clears it.
async function resolveCoverImage(coverImage, userId) {
  if (!coverImage) return null
  if (coverImage.startsWith('data:')) {
    return uploadImageDataUrl(coverImage, 'chat-images', `event-covers/${userId}`)
  }
  return coverImage
}

// Message history for an event's chat
app.get('/events/:id/chat/messages', requireAuth, async (req, res) => {
  const allowed = await canAccessChat(req.params.id, req.auth.sub)
  if (!allowed) {
    return res.status(403).json({ error: 'Доступно тільки учасникам заходу' })
  }

  try {
    const chatId = await getOrCreateChat(req.params.id)
    const { data, error } = await supabase
      .from('chat_messages')
      .select(CHAT_MESSAGE_SELECT)
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })
      .limit(200)

    if (error) throw error
    res.json({ chat_id: chatId, messages: data })
  } catch (err) {
    console.error('Fetching chat messages failed:', err.message)
    res.status(500).json({ error: 'Failed to load chat' })
  }
})

// Send a chat message — persisted, then broadcast to anyone subscribed via socket
app.post('/events/:id/chat/messages', requireAuth, async (req, res) => {
  const allowed = await canAccessChat(req.params.id, req.auth.sub)
  if (!allowed) {
    return res.status(403).json({ error: 'Доступно тільки учасникам заходу' })
  }

  const text = req.body?.text?.trim() || null
  const imageDataUrl = req.body?.image

  if (!text && !imageDataUrl) {
    return res.status(400).json({ error: 'Порожнє повідомлення' })
  }

  try {
    const imageUrl = imageDataUrl
      ? await uploadImageDataUrl(imageDataUrl, 'chat-images', `${req.params.id}/${req.auth.sub}`)
      : null

    const chatId = await getOrCreateChat(req.params.id)
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({ chat_id: chatId, sender_id: req.auth.sub, text, image_url: imageUrl })
      .select(CHAT_MESSAGE_SELECT)
      .single()

    if (error) throw error
    io.to(`event:${req.params.id}`).emit('new_message', data)

    const preview = data.text
      ? (data.text.length > 80 ? data.text.slice(0, 80) + '…' : data.text)
      : '📷 Фото'
    notifyEventPeople(
      req.params.id, req.auth.sub,
      (title) => `💬 ${data.sender?.first_name ?? 'Хтось'} у чаті «${title}»: ${preview}`,
      `chat_${req.params.id}`, 'Відкрити чат',
    ).catch(() => {})

    res.status(201).json({ message: data })
  } catch (err) {
    if (err instanceof ImageUploadError) {
      return res.status(400).json({ error: err.message })
    }
    console.error('Sending chat message failed:', err.message)
    res.status(500).json({ error: 'Failed to send message' })
  }
})

const EVENT_REPORT_SELECT = 'id, text, image_url, created_at, author:users(id, first_name, avatar_url)'

// Recap feed for a finished event — public read (anyone can browse a past
// event's report), hidden entries excluded unless you're the organizer.
app.get('/events/:id/reports', async (req, res) => {
  const auth = tryAuth(req)
  const { data: event } = await supabase.from('events').select('creator_id').eq('id', req.params.id).single()
  if (!event) {
    return res.status(404).json({ error: 'Event not found' })
  }
  const isOrganizer = auth?.sub === event.creator_id

  let query = supabase
    .from('event_reports')
    .select(`${EVENT_REPORT_SELECT}${isOrganizer ? ', is_hidden' : ''}`)
    .eq('event_id', req.params.id)
    .order('created_at', { ascending: true })
  if (!isOrganizer) query = query.eq('is_hidden', false)

  const { data, error } = await query
  if (error) {
    console.error('Fetching event reports failed:', error.message)
    return res.status(500).json({ error: 'Failed to load reports' })
  }
  res.json({ reports: data })
})

// Add a recap entry — only people who were actually there, once it's over
app.post('/events/:id/reports', requireAuth, async (req, res) => {
  const { data: event } = await supabase.from('events').select('status').eq('id', req.params.id).single()
  if (!event) {
    return res.status(404).json({ error: 'Event not found' })
  }
  if (event.status !== 'completed') {
    return res.status(400).json({ error: 'Звіт можна залишити тільки для завершеного заходу' })
  }
  const allowed = await canAccessChat(req.params.id, req.auth.sub)
  if (!allowed) {
    return res.status(403).json({ error: 'Тільки учасники заходу можуть залишити звіт' })
  }

  const text = req.body?.text?.trim() || null
  const imageDataUrl = req.body?.image
  if (!text && !imageDataUrl) {
    return res.status(400).json({ error: 'Додай текст або фото' })
  }

  try {
    const imageUrl = imageDataUrl
      ? await uploadImageDataUrl(imageDataUrl, 'chat-images', `reports/${req.params.id}/${req.auth.sub}`)
      : null

    const { data, error } = await supabase
      .from('event_reports')
      .insert({ event_id: req.params.id, author_id: req.auth.sub, text, image_url: imageUrl })
      .select(EVENT_REPORT_SELECT)
      .single()

    if (error) throw error
    res.status(201).json({ report: data })
  } catch (err) {
    if (err instanceof ImageUploadError) {
      return res.status(400).json({ error: err.message })
    }
    console.error('Adding event report failed:', err.message)
    res.status(500).json({ error: 'Failed to add report' })
  }
})

// Minimal moderation — the organizer can hide a report entry from their event
app.post('/events/:id/reports/:reportId/hide', requireAuth, async (req, res) => {
  const { data: event } = await supabase.from('events').select('creator_id').eq('id', req.params.id).single()
  if (!event) {
    return res.status(404).json({ error: 'Event not found' })
  }
  if (event.creator_id !== req.auth.sub) {
    return res.status(403).json({ error: 'Тільки організатор може приховувати записи' })
  }

  const { error } = await supabase
    .from('event_reports')
    .update({ is_hidden: true })
    .eq('id', req.params.reportId)
    .eq('event_id', req.params.id)

  if (error) {
    console.error('Hiding report failed:', error.message)
    return res.status(500).json({ error: 'Failed to hide report' })
  }
  res.json({ ok: true })
})

// ── Admin ────────────────────────────────────────────────────────────────

app.get('/admin/stats', requireAdmin, async (_req, res) => {
  const count = (table, filters = (q) => q) =>
    filters(supabase.from(table).select('id', { count: 'exact', head: true })).then(({ count }) => count ?? 0)

  const [
    total_users, banned_users, total_events, planned_events, gathering_events,
    active_events, completed_events, cancelled_events, total_reports, total_reviews,
  ] = await Promise.all([
    count('users'),
    count('users', (q) => q.eq('is_banned', true)),
    count('events'),
    count('events', (q) => q.eq('status', 'planned')),
    count('events', (q) => q.eq('status', 'gathering')),
    count('events', (q) => q.eq('status', 'active')),
    count('events', (q) => q.eq('status', 'completed')),
    count('events', (q) => q.eq('status', 'cancelled')),
    count('event_reports'),
    count('reviews'),
  ])

  res.json({
    total_users, banned_users, total_events,
    events_by_status: { planned: planned_events, gathering: gathering_events, active: active_events, completed: completed_events, cancelled: cancelled_events },
    total_reports, total_reviews,
  })
})

app.get('/admin/categories', requireAdmin, async (_req, res) => {
  const { data, error } = await supabase.from('categories').select('*').order('sort_order', { ascending: true })
  if (error) return res.status(500).json({ error: 'Failed to load categories' })
  res.json({ categories: data })
})

app.post('/admin/categories', requireAdmin, async (req, res) => {
  const { name, icon_name, color, sort_order } = req.body ?? {}
  if (!name?.trim()) {
    return res.status(400).json({ error: 'name is required' })
  }
  const { data, error } = await supabase
    .from('categories')
    .insert({ name: name.trim(), icon_name: icon_name || null, color: color || null, sort_order: sort_order || 0 })
    .select()
    .single()
  if (error) {
    console.error('Creating category failed:', error.message)
    return res.status(500).json({ error: 'Failed to create category' })
  }
  res.status(201).json({ category: data })
})

app.patch('/admin/categories/:id', requireAdmin, async (req, res) => {
  const { name, icon_name, color, sort_order, is_active } = req.body ?? {}
  const patch = {}
  if (name !== undefined) patch.name = name.trim()
  if (icon_name !== undefined) patch.icon_name = icon_name
  if (color !== undefined) patch.color = color
  if (sort_order !== undefined) patch.sort_order = sort_order
  if (is_active !== undefined) patch.is_active = !!is_active

  const { data, error } = await supabase.from('categories').update(patch).eq('id', req.params.id).select().single()
  if (error) {
    console.error('Updating category failed:', error.message)
    return res.status(500).json({ error: 'Failed to update category' })
  }
  res.json({ category: data })
})

app.get('/admin/funny-statuses', requireAdmin, async (_req, res) => {
  const { data, error } = await supabase.from('funny_statuses').select('*').order('sort_order', { ascending: true })
  if (error) return res.status(500).json({ error: 'Failed to load funny statuses' })
  res.json({ funny_statuses: data })
})

app.post('/admin/funny-statuses', requireAdmin, async (req, res) => {
  const { label, icon_name, sort_order } = req.body ?? {}
  if (!label?.trim()) {
    return res.status(400).json({ error: 'label is required' })
  }
  const { data, error } = await supabase
    .from('funny_statuses')
    .insert({ label: label.trim(), icon_name: icon_name || null, sort_order: sort_order || 0 })
    .select()
    .single()
  if (error) {
    console.error('Creating funny status failed:', error.message)
    return res.status(500).json({ error: 'Failed to create funny status' })
  }
  res.status(201).json({ funny_status: data })
})

app.patch('/admin/funny-statuses/:id', requireAdmin, async (req, res) => {
  const { label, icon_name, sort_order, is_active } = req.body ?? {}
  const patch = {}
  if (label !== undefined) patch.label = label.trim()
  if (icon_name !== undefined) patch.icon_name = icon_name
  if (sort_order !== undefined) patch.sort_order = sort_order
  if (is_active !== undefined) patch.is_active = !!is_active

  const { data, error } = await supabase.from('funny_statuses').update(patch).eq('id', req.params.id).select().single()
  if (error) {
    console.error('Updating funny status failed:', error.message)
    return res.status(500).json({ error: 'Failed to update funny status' })
  }
  res.json({ funny_status: data })
})

app.get('/admin/gifts', requireAdmin, async (_req, res) => {
  const { data, error } = await supabase.from('gifts_catalog').select('*').order('sort_order', { ascending: true })
  if (error) return res.status(500).json({ error: 'Failed to load gifts' })
  res.json({ gifts: data })
})

app.post('/admin/gifts', requireAdmin, async (req, res) => {
  const { name, icon_name, color, price_stars, sort_order } = req.body ?? {}
  if (!name?.trim() || !(Number(price_stars) > 0)) {
    return res.status(400).json({ error: 'name and a positive price_stars are required' })
  }
  const { data, error } = await supabase
    .from('gifts_catalog')
    .insert({ name: name.trim(), icon_name: icon_name || null, color: color || null, price_stars: Number(price_stars), sort_order: sort_order || 0 })
    .select()
    .single()
  if (error) {
    console.error('Creating gift failed:', error.message)
    return res.status(500).json({ error: 'Failed to create gift' })
  }
  res.status(201).json({ gift: data })
})

app.patch('/admin/gifts/:id', requireAdmin, async (req, res) => {
  const { name, icon_name, color, price_stars, sort_order, is_active } = req.body ?? {}
  const patch = {}
  if (name !== undefined) patch.name = name.trim()
  if (icon_name !== undefined) patch.icon_name = icon_name
  if (color !== undefined) patch.color = color
  if (price_stars !== undefined) {
    if (!(Number(price_stars) > 0)) return res.status(400).json({ error: 'price_stars must be positive' })
    patch.price_stars = Number(price_stars)
  }
  if (sort_order !== undefined) patch.sort_order = sort_order
  if (is_active !== undefined) patch.is_active = !!is_active

  const { data, error } = await supabase.from('gifts_catalog').update(patch).eq('id', req.params.id).select().single()
  if (error) {
    console.error('Updating gift failed:', error.message)
    return res.status(500).json({ error: 'Failed to update gift' })
  }
  res.json({ gift: data })
})

app.get('/admin/users', requireAdmin, async (_req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, telegram_id, username, first_name, avatar_url, is_admin, is_banned, ban_reason, created_at')
    .order('created_at', { ascending: false })
  if (error) return res.status(500).json({ error: 'Failed to load users' })
  res.json({ users: data })
})

app.post('/admin/users/:id/ban', requireAdmin, async (req, res) => {
  const reason = req.body?.reason?.trim()
  if (!reason) {
    return res.status(400).json({ error: 'Опиши причину бану' })
  }
  const { data, error } = await supabase
    .from('users')
    .update({ is_banned: true, ban_reason: reason })
    .eq('id', req.params.id)
    .select('id, first_name, is_banned, ban_reason')
    .single()
  if (error) {
    console.error('Banning user failed:', error.message)
    return res.status(500).json({ error: 'Failed to ban user' })
  }
  res.json({ user: data })
})

app.post('/admin/users/:id/unban', requireAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from('users')
    .update({ is_banned: false, ban_reason: null })
    .eq('id', req.params.id)
    .select('id, first_name, is_banned, ban_reason')
    .single()
  if (error) {
    console.error('Unbanning user failed:', error.message)
    return res.status(500).json({ error: 'Failed to unban user' })
  }
  res.json({ user: data })
})

// Socket.io: realtime delivery only — sending goes through the REST endpoint
// above (which persists then broadcasts); sockets just subscribe to a room.
io.use((socket, next) => {
  try {
    socket.userId = jwt.verify(socket.handshake.auth?.token, JWT_SECRET).sub
    next()
  } catch {
    next(new Error('unauthorized'))
  }
})

io.on('connection', (socket) => {
  socket.on('join_event', async (eventId) => {
    if (await canAccessChat(eventId, socket.userId)) {
      socket.join(`event:${eventId}`)
    }
  })

  socket.on('leave_event', (eventId) => {
    socket.leave(`event:${eventId}`)
  })
})

// Auto-completes events past their end_time if the organizer hasn't already —
// runs in-process since there's no separate cron/worker for this app.
async function sweepExpiredEvents() {
  const { error } = await supabase
    .from('events')
    .update({ status: 'completed' })
    .in('status', ['planned', 'gathering', 'active'])
    .not('end_time', 'is', null)
    .lt('end_time', new Date().toISOString())

  if (error) console.error('Auto-complete sweep failed:', error.message)
}

// Flips is_pro back to false once pro_expires_at has passed — the frontend
// and free-tier limit check both trust is_pro directly, so this can't be
// left to compute lazily on every read the way isProActive() does elsewhere.
async function sweepExpiredPro() {
  const { error } = await supabase
    .from('users')
    .update({ is_pro: false })
    .eq('is_pro', true)
    .not('pro_expires_at', 'is', null)
    .lt('pro_expires_at', new Date().toISOString())

  if (error) console.error('PRO expiry sweep failed:', error.message)
}

async function start() {
  await new Promise((resolve) => httpServer.listen(PORT, resolve))
  console.log(`Backend listening on port ${PORT}`)

  sweepExpiredEvents()
  setInterval(sweepExpiredEvents, 5 * 60_000)
  sweepExpiredPro()
  setInterval(sweepExpiredPro, 5 * 60_000)

  if (WEBHOOK_URL) {
    const webhookEndpoint = `${WEBHOOK_URL}/webhook`
    try {
      await bot.telegram.setWebhook(webhookEndpoint)
      const info = await bot.telegram.getWebhookInfo()
      console.log(`Webhook set: ${info.url} (pending: ${info.pending_update_count})`)
    } catch (err) {
      console.error('Failed to set webhook:', err.message)
      process.exit(1)
    }
  } else {
    await bot.launch()
    console.log('Bot started in long-polling mode')
  }
}

start().catch((err) => {
  console.error('Startup error:', err)
  process.exit(1)
})

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
