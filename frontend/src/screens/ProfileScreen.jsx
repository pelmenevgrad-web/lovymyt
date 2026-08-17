import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Star, Sparkles, BadgeCheck, Pencil, Loader2, AlertTriangle, Smartphone, Share2, History, ShieldEllipsis, MapPin, Repeat, Gift, Copy, Check, Gem, PartyPopper } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { Avatar } from '../components/EventCard.jsx'
import { appLink, shareViaTelegram } from '../lib/telegram.js'
import { apiFetch } from '../lib/api.js'
import { useCategories } from '../context/CategoriesContext.jsx'
import ReviewsList from '../components/ReviewsList.jsx'
import GiftsReceived from '../components/GiftsReceived.jsx'
import TopupSheet from '../components/TopupSheet.jsx'
import VerificationSheet from '../components/VerificationSheet.jsx'

const WAVE_REFERRAL_REWARD = 10
const WAVE_TIERS = [
  { threshold: 50, label: 'Бейдж «Активний запрошувач» в профілі' },
  { threshold: 100, label: '+1 фото в галереї заходу' },
  { threshold: 150, label: '+1 активний захід одночасно' },
  { threshold: 200, label: '+1 клуб понад безкоштовний мінімум' },
]

// Українське відмінювання лічильника: 1 хвиля, 2-4 хвилі, 5+ хвиль.
function waveNoun(n) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'хвиля'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'хвилі'
  return 'хвиль'
}

function shareApp() {
  shareViaTelegram(
    appLink(),
    'Приєднуйся до ЛовиМить — знаходь компанію для спільного дозвілля поруч! 🎉',
  )
}

function Stars({ rating }) {
  const rounded = Math.round(rating)
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <Star
          key={i}
          size={14}
          fill={i <= rounded ? 'var(--orange)' : 'none'}
          color={i <= rounded ? 'var(--orange)' : 'var(--border)'}
        />
      ))}
    </span>
  )
}

function StatBlock({ value, label, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        flex: 1, textAlign: 'center', padding: '14px 8px',
        background: 'var(--card)', borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-sm)', cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 500, marginTop: 2 }}>{label}</div>
    </div>
  )
}

function CenteredMessage({ icon: Icon, title, text }) {
  return (
    <div className="page" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 10, minHeight: '60vh', paddingLeft: 32, paddingRight: 32, textAlign: 'center',
    }}>
      <Icon size={28} color="var(--text-3)" />
      <div style={{ fontWeight: 700, fontSize: 15 }}>{title}</div>
      {text && <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{text}</div>}
    </div>
  )
}

export default function ProfileScreen() {
  const navigate = useNavigate()
  const { user, status, error, updateUser } = useAuth()
  const { categories } = useCategories()
  const [myEvents, setMyEvents] = useState(null)
  const [showTopup, setShowTopup] = useState(false)
  const [showVerification, setShowVerification] = useState(false)
  const [verificationRequest, setVerificationRequest] = useState(null)
  const [referralStats, setReferralStats] = useState(null)
  const [showAllReferrals, setShowAllReferrals] = useState(false)
  const [copied, setCopied] = useState(false)
  const [myVenuesCount, setMyVenuesCount] = useState(null)

  useEffect(() => {
    if (status !== 'ok') return
    apiFetch('/users/me/events')
      .then(({ events }) => setMyEvents(events))
      .catch(err => console.error('[Profile] failed to load my events:', err.message))
    apiFetch('/users/me/verification')
      .then(({ request }) => setVerificationRequest(request))
      .catch(err => console.error('[Profile] failed to load verification status:', err.message))
    apiFetch('/referrals/stats')
      .then(setReferralStats)
      .catch(err => console.error('[Profile] failed to load referral stats:', err.message))
    apiFetch('/venues/mine')
      .then(({ venues }) => setMyVenuesCount(venues.length))
      .catch(err => console.error('[Profile] failed to load venues:', err.message))
  }, [status])

  function copyReferralLink() {
    navigator.clipboard.writeText(appLink(`ref_${user.id}`)).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function shareReferralLink() {
    shareViaTelegram(
      appLink(`ref_${user.id}`),
      `Приєднуйся до ЛовиМить! Коли ти реально відвідаєш свій перший захід, ми обидва отримаємо по ${WAVE_REFERRAL_REWARD} ${waveNoun(WAVE_REFERRAL_REWARD)}`,
    )
  }

  async function refreshMe() {
    const { user: fresh } = await apiFetch('/users/me')
    updateUser(fresh)
  }

  if (status === 'pending') {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader2 size={28} className="spin" color="var(--text-3)" />
      </div>
    )
  }

  if (status === 'guest') {
    return (
      <CenteredMessage
        icon={Smartphone}
        title="Відкрий у Telegram"
        text="Профіль показує дані твого Telegram-акаунту — доступно тільки всередині застосунку."
      />
    )
  }

  if (status === 'error' || !user) {
    return (
      <CenteredMessage
        icon={AlertTriangle}
        title="Не вдалося завантажити профіль"
        text={error ? `Помилка: ${error}` : 'Спробуй закрити і знову відкрити застосунок.'}
      />
    )
  }

  const reliability = user.events_joined_count > 0
    ? `${Math.round((1 - user.no_show_count / user.events_joined_count) * 100)}%`
    : '—'

  return (
    <div className="page">
      {/* Hero */}
      <div style={{
        background: user.banner_url
          ? `linear-gradient(0deg, var(--accent-dark) 0%, rgba(0,0,0,.15) 100%), url(${user.banner_url}) center/cover no-repeat`
          : 'linear-gradient(135deg, var(--accent-dark) 0%, #7C3AED 100%)',
        padding: '20px 20px 18px',
        borderRadius: '0 0 28px 28px',
        position: 'relative',
      }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
          <button
            onClick={() => navigate('/profile/edit')}
            style={{
              background: 'rgba(255,255,255,.2)', border: 'none', borderRadius: 10,
              color: '#fff', padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}
          >
            <Pencil size={13} /> Редагувати
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14 }}>
          <Avatar name={user.first_name} url={user.avatar_url} size={72} />

          <div style={{ flex: 1, color: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 22, fontWeight: 800 }}>
                {user.first_name || 'Користувач'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 5, flexWrap: 'wrap', alignItems: 'center' }}>
              {user.username && <span style={{ fontSize: 12, opacity: .85 }}>@{user.username}</span>}
              {user.is_verified && (
                <span className="badge" style={{ background: 'rgba(255,255,255,.25)', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <BadgeCheck size={13} /> Верифікований
                </span>
              )}
              {user.is_pro && (
                <span className="badge" style={{ background: '#F59E0B', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <Star size={11} fill="currentColor" /> PRO
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <Stars rating={user.rating_avg} />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{user.rating_avg}</span>
              <span style={{ fontSize: 12, opacity: .75 }}>({user.rating_count} відгуків)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ padding: '14px 16px 0' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <StatBlock value={user.events_created_count} label="Організував" />
          <StatBlock value={user.events_joined_count} label="Взяв участь" />
          <StatBlock value={reliability} label="Надійність" onClick={() => navigate(`/users/${user.id}/archive`)} />
        </div>
      </div>

      {/* Bio */}
      {user.bio && (
        <div style={{ margin: '16px 16px 0' }} className="card">
          <div style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: .06 }}>Про себе</div>
            <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.5 }}>{user.bio}</p>
          </div>
        </div>
      )}

      {/* Share app */}
      <div style={{ margin: '12px 16px 0', display: 'flex', gap: 8 }}>
        <button
          className="btn btn-ghost"
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          onClick={shareApp}
        >
          <Share2 size={16} /> Поділитися застосунком
        </button>
        <button
          className="btn btn-ghost"
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          onClick={() => navigate('/events/history')}
        >
          <History size={16} /> Минулі заходи
        </button>
      </div>

      <div style={{ margin: '12px 16px 0', display: 'flex', gap: 8 }}>
        <button
          className="btn btn-ghost"
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          onClick={() => navigate('/venues/mine')}
        >
          <MapPin size={16} /> {myVenuesCount ? 'Мої локації' : 'Стати партнером'}
        </button>
        <button
          className="btn btn-ghost"
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          onClick={() => navigate('/clubs/mine')}
        >
          <Repeat size={16} /> Мої клуби
        </button>
      </div>

      <div className="card" style={{ margin: '12px 16px 0', padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Gift size={16} color="var(--accent)" />
            <span style={{ fontWeight: 700, fontSize: 14 }}>Запроси друга</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 800, fontSize: 15, color: 'var(--blue)' }}>
            <Gem size={16} fill="var(--blue)" /> {user.wave_points ?? 0}
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 10 }}>
          Друг реєструється за твоїм лінком — і коли він реально відвідає захід (і організатор підтвердить це після заходу), ви обидва отримуєте по {WAVE_REFERRAL_REWARD} {waveNoun(WAVE_REFERRAL_REWARD)}.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
          {WAVE_TIERS.map(({ threshold, label }) => {
            const unlocked = (user.wave_points ?? 0) >= threshold
            return (
              <div key={threshold} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: unlocked ? 'var(--text-1)' : 'var(--text-3)' }}>
                {unlocked ? <Check size={12} color="var(--blue)" /> : <span style={{ width: 12, textAlign: 'center' }}>·</span>}
                <span>{threshold} {waveNoun(threshold)} — {label}</span>
              </div>
            )
          })}
        </div>
        {referralStats && referralStats.referrals.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
              Запрошено: {referralStats.referred_count} · Отримано: {referralStats.waves_earned} {waveNoun(referralStats.waves_earned)}
            </div>
            {(showAllReferrals ? referralStats.referrals : referralStats.referrals.slice(0, 10)).map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar name={r.first_name} url={r.avatar_url} size={28} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{r.first_name}</span>
                {r.rewarded ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: 'var(--blue)' }}>
                    <Gem size={12} /> +{WAVE_REFERRAL_REWARD}
                  </span>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--text-3)' }}>ще не відвідав захід</span>
                )}
              </div>
            ))}
            {!showAllReferrals && referralStats.referrals.length > 10 && (
              <button
                className="btn btn-ghost"
                style={{ padding: '7px 10px', fontSize: 12 }}
                onClick={() => setShowAllReferrals(true)}
              >
                Показати всіх ({referralStats.referrals.length})
              </button>
            )}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-ghost"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13 }}
            onClick={copyReferralLink}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Скопійовано' : 'Копіювати лінк'}
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13 }}
            onClick={shareReferralLink}
          >
            <Share2 size={14} /> Поділитися
          </button>
        </div>
      </div>

      {user.is_admin && (
        <div style={{ margin: '12px 16px 0' }}>
          <button
            className="btn btn-ghost"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            onClick={() => navigate('/admin')}
          >
            <ShieldEllipsis size={16} /> Адмін-панель
          </button>
        </div>
      )}

      {/* Stars balance */}
      <div style={{ margin: '12px 16px 0' }} className="card">
        <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Star size={28} fill="var(--orange)" color="var(--orange)" />
            <div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{user.stars_balance} Stars</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)' }}>Ваш баланс</div>
            </div>
          </div>
          <button className="btn btn-ghost" style={{ padding: '10px 18px', fontSize: 13 }} onClick={() => setShowTopup(true)}>Поповнити</button>
        </div>
      </div>

      {/* Nudge card: first-time organizers get a create-event prompt, everyone
          else sees progress toward their next Waves-referral bonus tier. */}
      {user.events_created_count === 0 ? (
        <div style={{
          margin: '12px 16px 0',
          background: 'linear-gradient(135deg, #F59E0B, #EC4899)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px',
          color: '#fff',
        }}>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <PartyPopper size={18} /> Організуй свій перший захід
          </div>
          <div style={{ fontSize: 13, opacity: .9, marginBottom: 12 }}>
            Збери компанію на прогулянку, гру чи вечірку — це займе пару хвилин
          </div>
          <button
            className="btn"
            style={{ background: 'rgba(255,255,255,.25)', color: '#fff', padding: '10px 20px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={() => navigate('/create')}
          >
            <Sparkles size={14} /> Створити захід
          </button>
        </div>
      ) : (() => {
        const points = user.wave_points ?? 0
        const nextTier = WAVE_TIERS.find(t => points < t.threshold)
        if (!nextTier) return null
        const prevThreshold = WAVE_TIERS[WAVE_TIERS.indexOf(nextTier) - 1]?.threshold ?? 0
        const progress = Math.round(((points - prevThreshold) / (nextTier.threshold - prevThreshold)) * 100)
        return (
          <div style={{
            margin: '12px 16px 0',
            background: 'linear-gradient(135deg, #F59E0B, #EC4899)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px',
            color: '#fff',
          }}>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Gem size={18} /> До наступного бонусу
            </div>
            <div style={{ fontSize: 13, opacity: .9, marginBottom: 10 }}>
              Ще {nextTier.threshold - points} {waveNoun(nextTier.threshold - points)} — і відкриється: {nextTier.label.toLowerCase()}
            </div>
            <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,.25)', overflow: 'hidden', marginBottom: 12 }}>
              <div style={{ height: '100%', width: `${progress}%`, background: '#fff', borderRadius: 999 }} />
            </div>
            <button
              className="btn"
              style={{ background: 'rgba(255,255,255,.25)', color: '#fff', padding: '10px 20px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              onClick={shareReferralLink}
            >
              <Share2 size={14} /> Запросити друга
            </button>
          </div>
        )
      })()}

      {showTopup && (
        <TopupSheet onClose={() => setShowTopup(false)} onPaid={refreshMe} />
      )}

      {/* Verification */}
      {!user.is_verified && (
        <div style={{ margin: '12px 16px 0' }} className="card">
          <div style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <BadgeCheck size={18} color="var(--accent)" />
              <span style={{ fontWeight: 700, fontSize: 14 }}>Верифікація</span>
            </div>
            {verificationRequest?.status === 'pending' ? (
              <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Заявку надіслано, очікує на розгляд.</div>
            ) : verificationRequest?.status === 'rejected' ? (
              <>
                <div style={{ fontSize: 13, color: 'var(--red)', marginBottom: 8 }}>
                  Відхилено: {verificationRequest.reject_reason}
                </div>
                <button className="btn btn-ghost" style={{ width: '100%' }} onClick={() => setShowVerification(true)}>
                  Подати заявку знову
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 10 }}>
                  Підтверди, що це реальний профіль — отримай значок «Верифікований».
                </div>
                <button className="btn btn-ghost" style={{ width: '100%' }} onClick={() => setShowVerification(true)}>
                  Подати заявку
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {showVerification && (
        <VerificationSheet
          onClose={() => setShowVerification(false)}
          onSubmitted={setVerificationRequest}
        />
      )}

      <GiftsReceived userId={user.id} />

      {/* My events */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 12 }}>Мої заходи</div>
        {myEvents === null ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
            <Loader2 size={20} className="spin" color="var(--text-3)" />
          </div>
        ) : myEvents.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
            Поки що немає — створи перший захід через кнопку «Створити».
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {myEvents.map(e => {
              const cat = categories.find(c => c.id === e.category_id)
              const CatIcon = cat?.Icon
              return (
                <div
                  key={e.id}
                  className="card"
                  onClick={() => navigate(`/events/${e.id}`)}
                  style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                >
                  <div style={{ color: cat?.color, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {CatIcon && <CatIcon size={22} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</span>
                      {e.is_creator && (
                        <span className="badge" style={{ background: 'var(--accent-light)', color: 'var(--accent)', flexShrink: 0 }}>Організатор</span>
                      )}
                      {e.needs_review && (
                        <span className="badge" style={{ background: 'var(--orange-light)', color: 'var(--orange)', flexShrink: 0 }}>Оціни</span>
                      )}
                      {e.my_status === 'waitlisted' && (
                        <span className="badge" style={{ background: 'var(--orange-light)', color: 'var(--orange)', flexShrink: 0 }}>У черзі</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
                      {new Date(e.start_time).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <span style={{ fontSize: 18, color: 'var(--text-3)' }}>›</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Reviews */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 4 }}>
          Відгуки <span style={{ color: 'var(--text-3)', fontWeight: 500, fontSize: 14 }}>({user.rating_count})</span>
        </div>
        <ReviewsList userId={user.id} />
      </div>

      <div style={{ height: 20 }} />
    </div>
  )
}
