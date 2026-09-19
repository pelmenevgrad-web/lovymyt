import { useState } from 'react'
import WebApp from '@twa-dev/sdk'
import { X, Copy, Check, Send } from 'lucide-react'
import { shareViaTelegram } from '../lib/telegram.js'

// Brand marks lucide-react dropped a while back — small inline SVGs are the
// standard way every other "share to..." sheet on the web handles this.
const XLogo = () => (
  <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor"><path d="M18.9 2H22l-7.7 8.8L23.5 22h-7.1l-5.5-6.7L4.6 22H1.5l8.2-9.4L1 2h7.3l5 6.1L18.9 2z"/></svg>
)
const FacebookLogo = () => (
  <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor"><path d="M22 12a10 10 0 1 0-11.6 9.9v-7h-2.3V12h2.3V9.8c0-2.3 1.4-3.6 3.5-3.6.9 0 1.9.2 1.9.2v2.2h-1.1c-1.1 0-1.4.7-1.4 1.4V12h2.5l-.4 2.9h-2.1v7A10 10 0 0 0 22 12z"/></svg>
)
const WhatsAppLogo = () => (
  <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.3-1.39a9.9 9.9 0 0 0 4.74 1.2h.01c5.46 0 9.9-4.45 9.9-9.9C22 6.45 17.5 2 12.04 2zm5.8 14.14c-.24.68-1.4 1.3-1.93 1.38-.5.08-1.11.11-1.79-.11-.41-.14-.94-.3-1.62-.6-2.85-1.23-4.71-4.1-4.85-4.29-.14-.19-1.16-1.54-1.16-2.94s.73-2.08 1-2.36c.26-.29.57-.36.76-.36h.55c.18 0 .41-.07.64.49.24.57.81 1.98.88 2.12.07.15.12.32.02.51-.1.19-.15.31-.3.48-.15.17-.31.38-.44.51-.15.15-.3.31-.13.6.17.29.76 1.26 1.64 2.04 1.13 1 2.08 1.32 2.37 1.47.29.15.46.13.63-.08.17-.21.72-.84.91-1.13.19-.29.38-.24.64-.14.26.1 1.65.78 1.94.92.29.14.48.21.55.33.07.12.07.68-.17 1.36z"/></svg>
)
const ThreadsLogo = () => (
  <span style={{ fontSize: 17, fontWeight: 800, lineHeight: 1 }}>@</span>
)

function Row({ icon, label, bg, color = '#fff', onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, width: '100%',
        padding: '11px 4px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
      }}
    >
      <span style={{
        width: 36, height: 36, borderRadius: '50%', background: bg, color,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {icon}
      </span>
      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{label}</span>
    </button>
  )
}

// Bottom sheet with every share surface we can reach without a backend
// integration — Telegram's native forward sheet, a plain link copy, and web
// "compose" intents for X/Facebook/Threads/WhatsApp (all keyless, open in
// the system browser via WebApp.openLink). Instagram has no such intent —
// their app doesn't accept a posting URL from the web at all — so it gets a
// "copy caption" fallback instead of a broken link.
export default function ShareSheet({ link, title, text, onClose }) {
  const [copied, setCopied] = useState(false)
  const [igCopied, setIgCopied] = useState(false)

  function copy(value, setFlag) {
    navigator.clipboard.writeText(value).then(() => {
      setFlag(true)
      setTimeout(() => setFlag(false), 2000)
    })
  }

  function openExternal(url) {
    WebApp.openLink(url)
  }

  const caption = `${text} ${link}`

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-end' }}
      onClick={onClose}
    >
      <div className="card" style={{ width: '100%', borderRadius: '20px 20px 0 0', padding: 20 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontWeight: 800, fontSize: 17 }}>Поділитися</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <Row
          icon={<Send size={17} />}
          label="Telegram"
          bg="#229ED9"
          onClick={() => { shareViaTelegram(link, text); onClose() }}
        />
        <Row
          icon={copied ? <Check size={17} /> : <Copy size={16} />}
          label={copied ? 'Скопійовано' : 'Скопіювати посилання'}
          bg="var(--accent)"
          onClick={() => copy(link, setCopied)}
        />
        <Row
          icon={<XLogo />}
          label="X (Twitter)"
          bg="#000"
          onClick={() => openExternal(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`)}
        />
        <Row
          icon={<FacebookLogo />}
          label="Facebook"
          bg="#1877F2"
          onClick={() => openExternal(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`)}
        />
        <Row
          icon={<ThreadsLogo />}
          label="Threads"
          bg="#000"
          onClick={() => openExternal(`https://www.threads.net/intent/post?text=${encodeURIComponent(caption)}`)}
        />
        <Row
          icon={<WhatsAppLogo />}
          label="WhatsApp"
          bg="#25D366"
          onClick={() => openExternal(`https://wa.me/?text=${encodeURIComponent(caption)}`)}
        />
        <Row
          icon={igCopied ? <Check size={17} /> : <span style={{ fontSize: 15, fontWeight: 800 }}>IG</span>}
          label={igCopied ? 'Текст скопійовано — встав в Instagram' : 'Instagram (скопіювати підпис)'}
          bg="linear-gradient(135deg,#F58529,#DD2A7B,#8134AF)"
          onClick={() => copy(caption, setIgCopied)}
        />

        <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 10, textAlign: 'center' }}>
          Instagram не приймає посилання на публікацію ззовні — скопіюй підпис і встав його сама/сам.
        </p>
      </div>
    </div>
  )
}
