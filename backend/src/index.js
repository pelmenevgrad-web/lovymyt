import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import { Telegraf } from 'telegraf'
import { createClient } from '@supabase/supabase-js'

const PORT = process.env.PORT || 3000
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const WEBHOOK_URL = process.env.TELEGRAM_WEBHOOK_URL

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

// Socket.io: комнаты мероприятий (realtime-чат)
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
