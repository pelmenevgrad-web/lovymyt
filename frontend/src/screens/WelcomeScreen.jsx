import { useState, useEffect, useRef } from 'react'
import WebApp from '@twa-dev/sdk'
import { welcomeText } from '../i18n/welcome.js'
import fonImg     from '../assets/onboarding/fon.png'
import girlImg    from '../assets/onboarding/girl.png'
import manImg     from '../assets/onboarding/man.png'
import iceImg     from '../assets/onboarding/ice.png'
import avatarsImg from '../assets/onboarding/avatarstats.png'

const TERMS_TEXT = `ЛовиМить — Умови використання

1. Загальні положення

1.1. ЛовиМить — платформа для пошуку компанії для спільного дозвілля через Telegram Mini App.

1.2. Використовуючи Сервіс, ви погоджуєтесь з цими Умовами. Якщо ви не згодні — не користуйтесь Сервісом.

1.3. Адміністрація залишає за собою право змінювати ці Умови; істотні зміни повідомляються через бота.

2. Вік користувачів

2.1. Сервіс призначений для осіб від 18 років.

2.2. Реєструючись, ви підтверджуєте, що вам виповнилось 18 років.

3. Акаунт і поведінка

3.1. Один акаунт Telegram — один профіль у Сервісі.

3.2. Заборонено:
• створювати мероприятия з метою шахрайства або реклами сторонніх сервісів
• розміщувати образливий або дискримінаційний контент
• переслідувати чи погрожувати іншим користувачам
• видавати себе за іншу людину

3.3. За порушення Адміністрація може попередити, обмежити або заблокувати акаунт без повернення коштів.

4. Платежі (Telegram Stars)

4.1. Внутрішня валюта — Telegram Stars, придбання регулюється правилами Telegram.

4.2. Кошти на симпатії, подарунки та PRO-підписку поверненню не підлягають.

4.3. Сервіс утримує комісію 10% з переказів-подарунків між користувачами.

5. Рейтинги та відгуки

5.1. Відгуки можна залишати лише учасникам одного мероприятия.

5.2. Заборонено використовувати систему статусів для цькування чи помсти.

6. Відповідальність і безпека

6.1. Сервіс є лише інструментом для пошуку компанії й не бере участі в організації зустрічей.

6.2. Зустрічі відбуваються на власний розсуд і відповідальність учасників.

6.3. Рекомендації: зустрічайтесь у публічних місцях, повідомляйте близьким про плани, не передавайте гроші наперед незнайомим.

7. Персональні дані

7.1. Геолокація використовується лише для показу мероприятий поруч і не передається третім особам.

8. Контакти

8.1. Питання щодо Умов — через підтримку в боті ЛовиМить.`

// Returns inline style for staggered fade-in
const fi = (delay, duration = 0.55) => ({
  opacity: 0,
  animation: `welcome-fade-up ${duration}s ease ${delay}s forwards`,
})

function formatCount(n) {
  if (n >= 1000) return `${Math.floor(n / 1000)} ${String(n % 1000).padStart(3, '0')}`
  return `${n}`
}

const BASE = 1000 // base online count

export default function WelcomeScreen({ onJoin }) {
  const [showTerms, setShowTerms] = useState(false)
  // Start near BASE with a small random offset so each open looks slightly different
  const [count, setCount] = useState(() => BASE + Math.round((Math.random() - 0.5) * 30))
  const timerRef = useRef(null)

  const langCode = WebApp.initDataUnsafe?.user?.language_code
  const lang = langCode === 'ru' ? 'ru' : 'uk'
  const t = welcomeText[lang]

  useEffect(() => {
    const tick = () => {
      setCount(prev => {
        // ±1–4 users per tick, with slight pull back toward BASE to stay realistic
        const drift = prev - BASE
        const pull  = -Math.round(drift * 0.15)           // gentle pull toward center
        const delta = pull + Math.round((Math.random() - 0.48) * 6) // slight +bias
        return Math.max(BASE - 40, Math.min(BASE + 40, prev + delta))
      })
      // Random interval 1800–2200ms
      timerRef.current = setTimeout(tick, 1800 + Math.round(Math.random() * 400))
    }

    // Start after the stats block is visible
    timerRef.current = setTimeout(tick, 1100)
    return () => clearTimeout(timerRef.current)
  }, [])

  return (
    <div className="welcome-screen">
      {/* Background planet — full screen cover */}
      <img src={fonImg} className="welcome-bg-planet" alt="" aria-hidden="true" />

      {/* Ice — decorative */}
      <img
        src={iceImg}
        alt=""
        aria-hidden="true"
        style={{
          ...fi(1.05),
          position: 'absolute', right: '75%', top: '55%',
          width: '18%', maxWidth: 68,
          zIndex: 2, pointerEvents: 'none',
        }}
      />

      {/* Man with bike */}
      <img
        src={manImg}
        className="welcome-photo-guy"
        alt=""
        aria-hidden="true"
        style={fi(1.1)}
      />

      {/* Orange bubble */}
      <div
        className="welcome-bubble-orange"
        style={{ ...fi(1.3), position: 'absolute', left: '25%', top: '70%', zIndex: 4 }}
      >
        <span className="welcome-bubble-text">{t.bubble2}</span>
      </div>

      {/* Girl with cocktail */}
      <img
        src={girlImg}
        className="welcome-photo-girl"
        alt=""
        aria-hidden="true"
        style={fi(0.75)}
      />

      {/* Purple bubble */}
      <div
        className="welcome-bubble-purple"
        style={{ ...fi(1.0), position: 'absolute', left: '36%', top: '48%', zIndex: 4 }}
      >
        <span className="welcome-bubble-text">{t.bubble1}</span>
      </div>

      {/* Main content layer */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 5,
        display: 'flex', flexDirection: 'column',
        padding: '0 20px',
      }}>
        {/* Top: tagline → stats */}
        <div style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 18px)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 16,
        }}>
          <p className="welcome-tagline-hero" style={fi(0.1)}>{t.tagline}</p>

          <div className="welcome-stat-bg" style={fi(0.4)}>
            <img
              src={avatarsImg}
              alt=""
              aria-hidden="true"
              style={{ height: 36, width: 'auto', objectFit: 'contain' }}
            />
            <div>
              <div
                className="welcome-stat-number"
                style={{ minWidth: 72, display: 'inline-block', fontVariantNumeric: 'tabular-nums' }}
              >
                {formatCount(count)}
              </div>
              <div className="welcome-stat-label">{t.onlineLabel}</div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {/* Bottom CTA */}
        <div style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}>
          <button className="welcome-cta-button" onClick={onJoin} style={fi(1.5)}>
            <span className="welcome-cta-text">{t.cta}</span>
          </button>
          <div style={{ ...fi(1.75, 0.4), textAlign: 'center', marginTop: 10 }}>
            <button
              onClick={() => setShowTerms(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
            >
              <span style={{
                fontFamily: "'Open Sans', sans-serif",
                fontSize: 11, color: 'rgba(255,255,255,0.45)',
                textDecoration: 'underline',
              }}>
                {t.termsHint}
              </span>
            </button>
          </div>
        </div>
      </div>

      {showTerms && <TermsSheet onClose={() => setShowTerms(false)} />}
    </div>
  )
}

function TermsSheet({ onClose }) {
  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 999 }}
      />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        zIndex: 1000, background: '#1a0f38',
        borderRadius: '20px 20px 0 0',
        maxHeight: '74vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
      }}>
        <div style={{
          width: 36, height: 4,
          background: 'rgba(255,255,255,0.2)',
          borderRadius: 99, margin: '12px auto 0', flexShrink: 0,
        }} />
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)',
          flexShrink: 0,
        }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: '#fff' }}>Умови використання</span>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer',
              borderRadius: '50%', width: 28, height: 28,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(255,255,255,0.7)', fontSize: 16,
            }}
          >✕</button>
        </div>
        <div style={{
          overflowY: 'auto', flex: 1,
          padding: '16px 20px',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
          WebkitOverflowScrolling: 'touch',
        }}>
          <pre style={{
            fontFamily: "'Open Sans', -apple-system, sans-serif",
            fontSize: 13, color: 'rgba(255,255,255,0.72)',
            whiteSpace: 'pre-wrap', lineHeight: 1.65, margin: 0,
          }}>
            {TERMS_TEXT}
          </pre>
        </div>
      </div>
    </>
  )
}
