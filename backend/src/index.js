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

bot.start((ctx) => ctx.reply('Добро пожаловать в ЛовиМить! Открой Mini App.'))
bot.help((ctx) => ctx.reply('Используй кнопку меню для запуска приложения.'))

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
  const { bio } = req.body ?? {}
  const patch = {}

  if (bio !== undefined) {
    if (typeof bio !== 'string' || bio.length > 300) {
      return res.status(400).json({ error: 'bio must be a string up to 300 characters' })
    }
    patch.bio = bio.trim() || null
  }

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
    age_min: row.age_min,
    age_max: row.age_max,
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
    category_id, title, address_text, start_time, lat, lng,
    max_participants, min_participants, budget_type,
    age_min, age_max, late_join_allowed, conditions,
  } = req.body ?? {}

  if (!category_id || !title?.trim() || !address_text?.trim() || !start_time || lat == null || lng == null) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const { data: row, error } = await supabase
    .from('events')
    .insert({
      creator_id: req.auth.sub,
      category_id, title: title.trim(), address_text: address_text.trim(),
      start_time, lat, lng,
      max_participants, min_participants, budget_type,
      age_min: age_min || null, age_max: age_max || null,
      conditions: { ...(conditions ?? {}), late_join_allowed: !!late_join_allowed },
    })
    .select(EVENT_SELECT)
    .single()

  if (error) {
    console.error('Creating event failed:', error.message)
    return res.status(500).json({ error: 'Failed to create event' })
  }

  res.status(201).json({ event: shapeEvent(row) })
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

// Join an event — instant acceptance for now (no organizer approval step yet)
app.post('/events/:id/join', requireAuth, async (req, res) => {
  const { data: event, error: eventErr } = await supabase
    .from('events')
    .select('creator_id')
    .eq('id', req.params.id)
    .single()

  if (eventErr) {
    return res.status(404).json({ error: 'Event not found' })
  }
  if (event.creator_id === req.auth.sub) {
    return res.status(400).json({ error: 'Не можна приєднатися до власного заходу' })
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

// Socket.io: кімнати заходів (realtime-чат)
io.on('connection', (socket) => {
  socket.on('join_event', (eventId) => {
    socket.join(`event:${eventId}`)
  })

  socket.on('send_message', ({ eventId, message }) => {
    io.to(`event:${eventId}`).emit('new_message', message)
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
