import { useState } from 'react'
import WebApp from '@twa-dev/sdk'
import { welcomeText } from '../i18n/welcome.js'
import fonImg    from '../assets/onboarding/fon.png'
import girlImg   from '../assets/onboarding/girl.png'
import manImg    from '../assets/onboarding/man.png'
import iceImg    from '../assets/onboarding/ice.png'
import avatarsImg from '../assets/onboarding/avatarstats.png'

const TERMS_TEXT = `Умови використання сервісу ЛовиМить

Останнє оновлення: 2025 рік

1. Загальні положення
Використовуючи застосунок «ЛовиМить», ви погоджуєтесь з цими Умовами використання та Політикою конфіденційності.

2. Авторизація
Для доступу до сервісу необхідна авторизація через Telegram. Ми отримуємо лише публічні дані вашого профілю (ім'я, username, мову інтерфейсу).

3. Правила спільноти
Користувачі зобов'язуються:
• поважати інших учасників;
• не публікувати образливий, незаконний або шкідливий контент;
• не використовувати сервіс для спаму або шахрайства;
• дотримуватись законодавства України.

4. Організація заходів
Організатор несе відповідальність за зміст, безпеку і виконання умов свого заходу. Сервіс є лише платформою для пошуку компанії.

5. Конфіденційність
Геолокація обробляється лише за явної згоди користувача. Ми не продаємо персональні дані третім особам.

6. Stars і платежі
Внутрішня валюта Stars використовується для преміум-функцій. Купівля Stars здійснюється через Telegram Payments відповідно до їхніх умов.

7. Зміни умов
Ми можемо оновлювати ці Умови. Продовження використання сервісу після публікації змін означає їх прийняття.

8. Контакти
З питань звертайтесь через @lovymyt_support у Telegram.

Дякуємо, що обираєте ЛовиМить!`

export default function WelcomeScreen({ onJoin }) {
  const [showTerms, setShowTerms] = useState(false)

  const langCode = WebApp.initDataUnsafe?.user?.language_code
  const lang = langCode === 'ru' ? 'ru' : 'uk'
  const t = welcomeText[lang]

  return (
    <div className="welcome-screen">
      {/* Layer 1: planet/globe background */}
      <img src={fonImg} className="welcome-bg-planet" alt="" aria-hidden="true" />

      {/* Decorative ice element */}
      <img
        src={iceImg}
        alt=""
        aria-hidden="true"
        style={{
          position: 'absolute',
          right: '2%',
          top: '24%',
          width: '18%',
          maxWidth: 68,
          zIndex: 2,
          opacity: 0.88,
          pointerEvents: 'none',
        }}
      />

      {/* Layer 2: man with bike */}
      <img src={manImg} className="welcome-photo-guy" alt="" aria-hidden="true" />

      {/* Orange bubble — near man */}
      <div
        className="welcome-bubble-orange"
        style={{ position: 'absolute', left: '42%', top: '63%', zIndex: 4 }}
      >
        <span className="welcome-bubble-text">{t.bubble2}</span>
      </div>

      {/* Layer 3: girl with cocktail */}
      <img src={girlImg} className="welcome-photo-girl" alt="" aria-hidden="true" />

      {/* Purple bubble — near girl */}
      <div
        className="welcome-bubble-purple"
        style={{ position: 'absolute', left: '5%', top: '41%', zIndex: 4 }}
      >
        <span className="welcome-bubble-text">{t.bubble1}</span>
      </div>

      {/* Layer 5: main content (tagline + title + stats + CTA) */}
      <div style={{
        position: 'absolute',
        inset: 0,
        zIndex: 5,
        display: 'flex',
        flexDirection: 'column',
        padding: '0 20px',
      }}>
        {/* Top section */}
        <div style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 18px)' }}>
          <p className="welcome-tagline">{t.tagline}</p>
          <div className="welcome-title-line1" style={{ margin: 0 }}>{t.title1}</div>
          <div className="welcome-title-line2" style={{ margin: 0 }}>{t.title2}</div>

          <div style={{ marginTop: 18 }}>
            <div className="welcome-stat-bg">
              <img
                src={avatarsImg}
                alt=""
                aria-hidden="true"
                style={{ height: 36, width: 'auto', objectFit: 'contain' }}
              />
              <div>
                <div className="welcome-stat-number">1 000+</div>
                <div className="welcome-stat-label">{t.onlineLabel}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Transparent spacer — photos visible through here */}
        <div style={{ flex: 1 }} />

        {/* Bottom CTA area */}
        <div style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
        }}>
          <button className="welcome-cta-button" onClick={onJoin}>
            <span className="welcome-cta-text">{t.cta}</span>
          </button>
          <div style={{ textAlign: 'center', marginTop: 10 }}>
            <button
              onClick={() => setShowTerms(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
            >
              <span style={{
                fontFamily: "'Open Sans', sans-serif",
                fontSize: 11,
                color: 'rgba(255,255,255,0.45)',
                textDecoration: 'underline',
              }}>
                {t.termsHint}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Terms bottom sheet */}
      {showTerms && <TermsSheet onClose={() => setShowTerms(false)} />}
    </div>
  )
}

function TermsSheet({ onClose }) {
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 999,
        }}
      />
      <div style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        zIndex: 1000,
        background: '#1a0f38',
        borderRadius: '20px 20px 0 0',
        maxHeight: '74vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
      }}>
        {/* Drag handle */}
        <div style={{
          width: 36, height: 4,
          background: 'rgba(255,255,255,0.2)',
          borderRadius: 99,
          margin: '12px auto 0',
          flexShrink: 0,
        }} />

        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 20px 10px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          flexShrink: 0,
        }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: '#fff' }}>
            Умови використання
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none', cursor: 'pointer',
              borderRadius: '50%',
              width: 28, height: 28,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(255,255,255,0.7)',
              fontSize: 16, lineHeight: 1,
            }}
          >✕</button>
        </div>

        {/* Scrollable content */}
        <div style={{
          overflowY: 'auto',
          flex: 1,
          padding: '16px 20px',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
          WebkitOverflowScrolling: 'touch',
        }}>
          <pre style={{
            fontFamily: "'Open Sans', -apple-system, sans-serif",
            fontSize: 13,
            color: 'rgba(255,255,255,0.72)',
            whiteSpace: 'pre-wrap',
            lineHeight: 1.65,
            margin: 0,
          }}>
            {TERMS_TEXT}
          </pre>
        </div>
      </div>
    </>
  )
}
