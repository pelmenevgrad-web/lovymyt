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
app.use(express.json())

// Supabase client (service role для серверного доступа)
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

// Telegraf bot
const bot = new Telegraf(BOT_TOKEN)
const BOT_USERNAME = 'lovymyt_bot'

bot.start((ctx) => ctx.reply('Ласкаво просимо в ЛовіМіть! Відкрий для себе новий світ емоцій.'))
bot.help((ctx) => ctx.reply('Используй кнопку меню для запуска приложения.'))

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
    .select('title, creator_id, creator:users(telegram_id)')
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

  const token = jwt.sign({ sub: user.id, telegram_id: user.telegram_id }, JWT_SECRET, { expiresIn: '30d' })
  res.json({ token, user })
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

  res.json({ user })
})

const EVENT_SELECT = '*, creator:users(first_name, avatar_url), participants:event_participants(status, user:users(id, first_name, avatar_url))'

// Shapes a DB row (with embedded creator/participants) into the flat object
// shape the frontend already works with (same fields as the old mocks).
function shapeEvent(row) {
  const { late_join_allowed, ...conditions } = row.conditions ?? {}
  const accepted = (row.participants ?? []).filter(p => p.status === 'accepted' && p.user)
  return {
    id: row.id,
    title: row.title,
    category_id: row.category_id,
    status: row.status,
    start_time: row.start_time,
    lat: row.lat,
    lng: row.lng,
    address_text: row.address_text,
    max_participants: row.max_participants,
    current_participants: accepted.length,
    participant_avatars: accepted.slice(0, 4).map(p => ({
      id: p.user.id, first_name: p.user.first_name, avatar_url: p.user.avatar_url,
    })),
    creator_name: row.creator?.first_name ?? 'Користувач',
    creator_avatar_url: row.creator?.avatar_url ?? null,
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
    .order('start_time', { ascending: true })

  if (error) {
    console.error('Fetching events failed:', error.message)
    return res.status(500).json({ error: 'Failed to load events' })
  }

  res.json({ events: data.map(shapeEvent) })
})

// Create a new event owned by the authenticated user
app.post('/events', requireAuth, async (req, res) => {
  const {
    category_id, title, description, address_text, start_time, lat, lng,
    max_participants, min_participants, budget_type, budget_amount,
    age_min, age_max, late_join_allowed, conditions,
    allowed_gender, max_male, max_female,
  } = req.body ?? {}

  if (!category_id || !title?.trim() || !address_text?.trim() || !start_time || lat == null || lng == null) {
    return res.status(400).json({ error: 'Missing required fields' })
  }
  if (allowed_gender && !['any', 'male', 'female'].includes(allowed_gender)) {
    return res.status(400).json({ error: 'allowed_gender must be "any", "male" or "female"' })
  }

  const { data: row, error } = await supabase
    .from('events')
    .insert({
      creator_id: req.auth.sub,
      category_id, title: title.trim(), description: description?.trim() || null,
      address_text: address_text.trim(),
      start_time, lat, lng,
      max_participants, min_participants, budget_type,
      budget_amount: budget_amount || null,
      age_min: age_min || null, age_max: age_max || null,
      allowed_gender: allowed_gender || 'any',
      max_male: max_male || null, max_female: max_female || null,
      conditions: { ...(conditions ?? {}), late_join_allowed: !!late_join_allowed },
    })
    .select(EVENT_SELECT)
    .single()

  if (error) {
    console.error('Creating event failed:', error.message)
    return res.status(500).json({ error: 'Failed to create event' })
  }

  const shaped = shapeEvent(row)
  notifyAboutNewEvent(shaped, req.auth.sub).catch(() => {})

  res.status(201).json({ event: shaped })
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
    category_id, title, description, address_text, start_time, lat, lng,
    max_participants, min_participants, budget_type, budget_amount,
    age_min, age_max, late_join_allowed, conditions,
    allowed_gender, max_male, max_female,
  } = req.body ?? {}

  if (!category_id || !title?.trim() || !address_text?.trim() || !start_time || lat == null || lng == null) {
    return res.status(400).json({ error: 'Missing required fields' })
  }
  if (allowed_gender && !['any', 'male', 'female'].includes(allowed_gender)) {
    return res.status(400).json({ error: 'allowed_gender must be "any", "male" or "female"' })
  }

  const { data: row, error } = await supabase
    .from('events')
    .update({
      category_id, title: title.trim(), description: description?.trim() || null,
      address_text: address_text.trim(),
      start_time, lat, lng,
      max_participants, min_participants, budget_type,
      budget_amount: budget_amount || null,
      age_min: age_min || null, age_max: age_max || null,
      allowed_gender: allowed_gender || 'any',
      max_male: max_male || null, max_female: max_female || null,
      conditions: { ...(conditions ?? {}), late_join_allowed: !!late_join_allowed },
    })
    .eq('id', req.params.id)
    .select(EVENT_SELECT)
    .single()

  if (error) {
    console.error('Updating event failed:', error.message)
    return res.status(500).json({ error: 'Failed to update event' })
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
    .select('creator_id, allowed_gender, max_male, max_female')
    .eq('id', req.params.id)
    .single()

  if (eventErr) {
    return res.status(404).json({ error: 'Event not found' })
  }
  if (event.creator_id === req.auth.sub) {
    return res.status(400).json({ error: 'Не можна приєднатися до власного заходу' })
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
    .select('creator_id, creator:users(id, first_name, avatar_url)')
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

// Submit ratings/comments for other people who were at the same event.
// Upserts so re-submitting just edits the earlier review instead of erroring.
app.post('/events/:id/reviews', requireAuth, async (req, res) => {
  const { reviews } = req.body ?? {}
  if (!Array.isArray(reviews) || reviews.length === 0) {
    return res.status(400).json({ error: 'reviews must be a non-empty array' })
  }

  const rows = reviews
    .filter(r => r.to_user_id && r.to_user_id !== req.auth.sub && Number(r.rating) >= 1 && Number(r.rating) <= 5)
    .map(r => ({
      event_id: req.params.id,
      from_user_id: req.auth.sub,
      to_user_id: r.to_user_id,
      rating: Number(r.rating),
      comment: r.comment?.trim() || null,
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

const CHAT_MESSAGE_SELECT = 'id, text, is_system, created_at, sender:users(id, first_name, avatar_url)'

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

  const text = req.body?.text?.trim()
  if (!text) {
    return res.status(400).json({ error: 'Порожнє повідомлення' })
  }

  try {
    const chatId = await getOrCreateChat(req.params.id)
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({ chat_id: chatId, sender_id: req.auth.sub, text })
      .select(CHAT_MESSAGE_SELECT)
      .single()

    if (error) throw error
    io.to(`event:${req.params.id}`).emit('new_message', data)

    const preview = data.text.length > 80 ? data.text.slice(0, 80) + '…' : data.text
    notifyEventPeople(
      req.params.id, req.auth.sub,
      (title) => `💬 ${data.sender?.first_name ?? 'Хтось'} у чаті «${title}»: ${preview}`,
      `chat_${req.params.id}`, 'Відкрити чат',
    ).catch(() => {})

    res.status(201).json({ message: data })
  } catch (err) {
    console.error('Sending chat message failed:', err.message)
    res.status(500).json({ error: 'Failed to send message' })
  }
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

async function start() {
  await new Promise((resolve) => httpServer.listen(PORT, resolve))
  console.log(`Backend listening on port ${PORT}`)

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
