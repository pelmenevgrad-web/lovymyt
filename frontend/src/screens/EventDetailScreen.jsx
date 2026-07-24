import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Clock, MapPin, Users, PawPrint, Baby, BadgeCheck, Zap,
  Loader2, AlertTriangle, Check, Gift, CreditCard, Handshake, UserPlus, Venus, Mars, Pencil, MessageCircle, Flag, UserX, Star,
} from 'lucide-react'
import { STATUS_META } from '../data/mockData.js'
import { useCategories } from '../context/CategoriesContext.jsx'
import { Avatar, AvatarStack, CategoryBadges } from '../components/EventCard.jsx'
import BackButton from '../components/BackButton.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { apiFetch } from '../lib/api.js'
import { appLink, shareViaTelegram } from '../lib/telegram.js'
import { formatCountdown } from '../lib/format.js'

function SupplyItem({ supply, userId, onClaim }) {
  const myClaim = supply.claims.find(c => c.user_id === userId)
  const [editing, setEditing] = useState(false)
  const [amount, setAmount] = useState(myClaim?.amount ?? '')
  const [saving, setSaving] = useState(false)
  const pct = Math.min(100, Math.round((supply.claimed_amount / supply.needed_amount) * 100))

  async function save() {
    setSaving(true)
    await onClaim(supply.id, Number(amount) || 0)
    setSaving(false)
    setEditing(false)
  }

  return (
    <div className="card" style={{ padding: 12, marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>{supply.name}</span>
        <span style={{ fontSize: 12, color: 'var(--text-2)', flexShrink: 0 }}>
          {supply.claimed_amount}/{supply.needed_amount}{supply.unit ? ` ${supply.unit}` : ''}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ flex: 1, height: 6, borderRadius: 99, background: 'var(--border)' }}>
          <div style={{ width: `${pct}%`, height: '100%', borderRadius: 99, background: pct >= 100 ? 'var(--green)' : 'var(--accent)' }} />
        </div>
        <AvatarStack people={supply.claims.map(c => ({ id: c.user_id, first_name: c.first_name, avatar_url: c.avatar_url }))} size={18} />
      </div>

      {editing ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="number" min={0} autoFocus
            placeholder="Скільки принесеш?"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 13 }} disabled={saving} onClick={save}>OK</button>
        </div>
      ) : (
        <button
          className="chip"
          onClick={() => setEditing(true)}
          style={{
            background: myClaim ? 'var(--green-light)' : 'var(--card)',
            color: myClaim ? 'var(--green)' : 'var(--text)',
            border: '1.5px solid ' + (myClaim ? 'var(--green)' : 'var(--border)'),
          }}
        >
          {myClaim ? `Я принесу: ${myClaim.amount}${supply.unit ? ` ${supply.unit}` : ''}` : 'Я принесу…'}
        </button>
      )}
    </div>
  )
}

function ParticipantRow({ person, isCreator, canManage, onDecline }) {
  const navigate = useNavigate()
  const [declining, setDeclining] = useState(false)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!reason.trim() || saving) return
    setSaving(true)
    await onDecline(person.id, reason.trim())
    setSaving(false)
    setDeclining(false)
  }

  return (
    <div className="card" style={{ padding: 10, marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, cursor: 'pointer' }}
          onClick={() => navigate(`/users/${person.id}`)}
        >
          <Avatar name={person.first_name} url={person.avatar_url} size={30} />
          <span style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {person.first_name}
          </span>
          {isCreator && (
            <span className="badge" style={{ background: 'var(--accent-light)', color: 'var(--accent)', flexShrink: 0 }}>Організатор</span>
          )}
        </div>
        {canManage && !isCreator && (
          <button
            onClick={() => setDeclining(d => !d)}
            style={{ background: 'none', border: 'none', color: 'var(--red)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}
          >
            <UserX size={14} /> Відмовити
          </button>
        )}
      </div>
      {declining && (
        <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
          <input
            autoFocus placeholder="Причина відмови" value={reason}
            onChange={e => setReason(e.target.value)} style={{ flex: 1 }}
          />
          <button
            className="btn" style={{ background: 'var(--red)', color: '#fff', padding: '8px 14px', fontSize: 13, opacity: saving ? .6 : 1 }}
            disabled={saving || !reason.trim()} onClick={submit}
          >
            OK
          </button>
        </div>
      )}
    </div>
  )
}

const BUDGET_LABEL = {
  free: { label: 'Безкоштовно', Icon: Gift },
  each_pays: { label: 'Кожен платить за себе', Icon: CreditCard },
  shared: { label: 'Складчина', Icon: Handshake },
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleString('uk-UA', {
    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  })
}

function ConditionRow({ Icon, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <Icon size={17} color="var(--text-2)" />
      <span style={{ fontSize: 14 }}>{children}</span>
    </div>
  )
}

export default function EventDetailScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { categories } = useCategories()
  const [event, setEvent] = useState(null)
  const [status, setStatus] = useState('pending') // pending | ok | error
  const [joining, setJoining] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [confirmingLeave, setConfirmingLeave] = useState(false)
  const [joinError, setJoinError] = useState(null)
  const [supplies, setSupplies] = useState([])
  const [participants, setParticipants] = useState([])
  const [confirmingComplete, setConfirmingComplete] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [completeError, setCompleteError] = useState(null)
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState(null)
  const [continuing, setContinuing] = useState(false)
  const [, forceTick] = useState(0)

  // Keeps the countdown to start ticking without needing a full data refetch
  useEffect(() => {
    const timer = setInterval(() => forceTick(t => t + 1), 30_000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    apiFetch(`/events/${id}`)
      .then(({ event }) => { setEvent(event); setStatus('ok') })
      .catch(() => setStatus('error'))
    apiFetch(`/events/${id}/supplies`)
      .then(({ supplies }) => setSupplies(supplies))
      .catch(err => console.error('[EventDetail] failed to load supplies:', err.message))
    apiFetch(`/events/${id}/participants`)
      .then(({ participants }) => setParticipants(participants))
      .catch(err => console.error('[EventDetail] failed to load participants:', err.message))
  }, [id])

  async function handleDeclineParticipant(userId, reason) {
    try {
      await apiFetch(`/events/${id}/participants/${userId}/decline`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      })
      setParticipants(prev => prev.filter(p => p.id !== userId))
      setEvent(e => ({ ...e, current_participants: Math.max(0, e.current_participants - 1) }))
    } catch (err) {
      console.error('[EventDetail] decline failed:', err.message)
    }
  }

  async function handleClaim(supplyId, amount) {
    try {
      await apiFetch(`/events/${id}/supplies/${supplyId}/claim`, {
        method: 'POST',
        body: JSON.stringify({ amount }),
      })
      const { supplies: fresh } = await apiFetch(`/events/${id}/supplies`)
      setSupplies(fresh)
    } catch (err) {
      console.error('[EventDetail] claim failed:', err.message)
    }
  }

  async function handleContinueAnyway() {
    if (continuing) return
    setContinuing(true)
    try {
      const { event: updated } = await apiFetch(`/events/${id}/continue-anyway`, { method: 'POST' })
      setEvent(updated)
    } catch (err) {
      console.error('[EventDetail] continue-anyway failed:', err.message)
    } finally {
      setContinuing(false)
    }
  }

  async function handleComplete() {
    setCompleting(true)
    setCompleteError(null)
    try {
      const { event: updated } = await apiFetch(`/events/${id}/complete`, { method: 'POST' })
      setEvent(updated)
      setConfirmingComplete(false)
    } catch (err) {
      setCompleteError(err.message)
    } finally {
      setCompleting(false)
    }
  }

  async function handleCancel() {
    setCancelling(true)
    setCancelError(null)
    try {
      const { event: updated } = await apiFetch(`/events/${id}/cancel`, { method: 'POST' })
      setEvent(updated)
      setConfirmingCancel(false)
    } catch (err) {
      setCancelError(err.message)
    } finally {
      setCancelling(false)
    }
  }

  async function handleJoin() {
    if (joining) return
    setJoining(true)
    setJoinError(null)
    try {
      await apiFetch(`/events/${id}/join`, { method: 'POST' })
      setEvent(e => ({ ...e, my_status: 'accepted', current_participants: e.current_participants + (e.my_status === 'accepted' ? 0 : 1) }))
    } catch (err) {
      setJoinError(err.message)
    } finally {
      setJoining(false)
    }
  }

  async function handleLeave() {
    if (leaving) return
    setLeaving(true)
    setJoinError(null)
    try {
      await apiFetch(`/events/${id}/leave`, { method: 'POST' })
      setEvent(e => ({ ...e, my_status: 'left', current_participants: Math.max(0, e.current_participants - 1) }))
      setConfirmingLeave(false)
    } catch (err) {
      setJoinError(err.message)
    } finally {
      setLeaving(false)
    }
  }

  if (status === 'pending') {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader2 size={28} className="spin" color="var(--text-3)" />
      </div>
    )
  }

  if (status === 'error' || !event) {
    return (
      <div className="page" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 10, minHeight: '60vh', paddingLeft: 32, paddingRight: 32, textAlign: 'center',
      }}>
        <AlertTriangle size={28} color="var(--text-3)" />
        <div style={{ fontWeight: 700, fontSize: 15 }}>Захід не знайдено</div>
      </div>
    )
  }

  const cat = categories.find(c => c.id === event.category_id) ?? categories[0]
  const eventCategoryIds = event.category_ids ?? [event.category_id]
  const statusMeta = STATUS_META[event.status] ?? STATUS_META.planned
  const budget = BUDGET_LABEL[event.budget_type] ?? BUDGET_LABEL.free
  const pct = Math.round((event.current_participants / event.max_participants) * 100)
  const alreadyJoined = event.my_status === 'accepted'
  const eventStarted = new Date(event.start_time) < new Date()
  const isEnded = event.status === 'completed' || event.status === 'cancelled'
  const canReview = eventStarted && (event.is_creator || alreadyJoined)
  const belowMinimum = event.min_participants
    && event.current_participants < event.min_participants
    && (event.status === 'planned' || event.status === 'gathering')
    && !event.force_continue

  function handleInvite() {
    shareViaTelegram(
      appLink(`event_${event.id}`),
      `Приєднуйся до заходу «${event.title}» в ЛовиМить! ${formatDateTime(event.start_time)} • ${event.address_text}`,
    )
  }

  return (
    <div className="page">
      {/* Cover photo */}
      {event.cover_image_url && (
        <img
          src={event.cover_image_url} alt=""
          style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }}
        />
      )}

      {/* Header */}
      <div style={{ padding: '16px 16px 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <BackButton />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
          <span className="badge" style={{ background: statusMeta.bg, color: statusMeta.color }}>
            {event.status === 'active' && '● '}{statusMeta.label}
          </span>
          {event.status === 'active' && event.late_join_allowed && (
            <span className="badge" style={{ background: 'var(--green-light)', color: 'var(--green)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <Zap size={11} /> Можна приєднатися
            </span>
          )}
        </div>
        {event.is_creator && (
          <button
            onClick={() => navigate(`/events/${id}/edit`)}
            style={{
              background: 'var(--card)', color: 'var(--text)', border: '1.5px solid var(--border)', borderRadius: 10,
              padding: '7px 10px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 5, marginRight: 6,
            }}
          >
            <Pencil size={14} />
          </button>
        )}
        <button
          onClick={handleInvite}
          style={{
            background: 'var(--accent-light)', color: 'var(--accent)', border: 'none', borderRadius: 10,
            padding: '7px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 5,
          }}
        >
          <UserPlus size={14} /> Запросити
        </button>
      </div>

      <div style={{ padding: '8px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, flexShrink: 0,
            background: cat.color + '22', color: cat.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <cat.Icon size={24} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.25 }}>{event.title}</h1>
            <div style={{ marginTop: 6 }}>
              <CategoryBadges ids={eventCategoryIds} categories={categories} />
            </div>
          </div>
          <span className="badge" style={{
            background: 'var(--accent-light)', color: 'var(--accent)', flexShrink: 0,
            fontSize: 12, padding: '5px 10px',
          }}>
            <Clock size={11} /> {formatCountdown(event.start_time)}
          </span>
        </div>

        {event.description && (
          <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.5, marginBottom: 16 }}>{event.description}</p>
        )}

        {/* Creator */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, cursor: 'pointer' }}
          onClick={() => navigate(`/users/${event.creator_id}`)}
        >
          <Avatar name={event.creator_name} url={event.creator_avatar_url} size={28} />
          <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Організатор: <strong style={{ color: 'var(--text)' }}>{event.creator_name}</strong></span>
          {event.creator_is_pro && <Star size={13} fill="#F59E0B" color="#F59E0B" />}
        </div>

        {/* Key facts */}
        <div className="card" style={{ padding: '4px 14px', marginBottom: 16 }}>
          <ConditionRow Icon={Clock}>{formatDateTime(event.start_time)}</ConditionRow>
          {event.end_time && (
            <ConditionRow Icon={Clock}>
              Тривалість: {event.duration_min_hours ? `${event.duration_min_hours}–` : 'до '}
              {Math.round((new Date(event.end_time) - new Date(event.start_time)) / 3_600_000)} год
            </ConditionRow>
          )}
          <ConditionRow Icon={MapPin}>{event.address_text}</ConditionRow>
          <ConditionRow Icon={Users}>
            {event.current_participants}/{event.max_participants} учасників
            {event.min_participants ? ` (мінімум ${event.min_participants})` : ''}
          </ConditionRow>
          <ConditionRow Icon={budget.Icon}>
            {budget.label}{event.budget_amount ? ` — ${event.budget_amount} грн` : ''}
          </ConditionRow>
          {(event.age_min || event.age_max) && (
            <ConditionRow Icon={Users}>
              Вік: {event.age_min ?? '0'}–{event.age_max ?? '∞'}
            </ConditionRow>
          )}
          {event.allowed_gender && event.allowed_gender !== 'any' && (
            <ConditionRow Icon={event.allowed_gender === 'male' ? Mars : Venus}>
              Тільки {event.allowed_gender === 'male' ? 'чоловіки' : 'жінки'}
            </ConditionRow>
          )}
          {(event.max_male || event.max_female) && (
            <ConditionRow Icon={Users}>
              Квоти:{event.max_female ? ` до ${event.max_female} жінок` : ''}{event.max_male ? `${event.max_female ? ',' : ''} до ${event.max_male} чоловіків` : ''}
            </ConditionRow>
          )}
        </div>

        {/* Participant progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <AvatarStack people={event.participant_avatars} size={22} />
          <div style={{ flex: 1, height: 6, borderRadius: 99, background: 'var(--border)' }}>
            <div style={{ width: `${pct}%`, height: '100%', borderRadius: 99, background: cat.color }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', flexShrink: 0 }}>{pct}%</span>
        </div>

        {/* Participants list */}
        {participants.length > 0 && (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: .06, marginBottom: 8 }}>
              Учасники
            </div>
            <div style={{ marginBottom: 16 }}>
              {participants.map(p => (
                <ParticipantRow
                  key={p.id}
                  person={p}
                  isCreator={p.id === event.creator_id}
                  canManage={event.is_creator && !isEnded}
                  onDecline={handleDeclineParticipant}
                />
              ))}
            </div>
          </>
        )}

        {/* Conditions */}
        {(event.conditions?.with_pets || event.conditions?.with_kids || event.conditions?.verified_only) && (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: .06, marginBottom: 8 }}>
              Умови участі
            </div>
            <div className="card" style={{ padding: '4px 14px', marginBottom: 16 }}>
              {event.conditions?.with_pets && <ConditionRow Icon={PawPrint}>Можна з тваринами</ConditionRow>}
              {event.conditions?.with_kids && <ConditionRow Icon={Baby}>Можна з дітьми</ConditionRow>}
              {event.conditions?.verified_only && <ConditionRow Icon={BadgeCheck}>Тільки верифіковані учасники</ConditionRow>}
            </div>
          </>
        )}

        {supplies.length > 0 && (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: .06, marginBottom: 8 }}>
              Що потрібно принести
            </div>
            <div style={{ marginBottom: 8 }}>
              {supplies.map(s => (
                <SupplyItem key={s.id} supply={s} userId={user?.id} onClaim={handleClaim} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Low turnout warning */}
      {belowMinimum && (
        <div style={{ margin: '0 16px 16px' }} className="card">
          <div style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <AlertTriangle size={16} color="var(--orange)" />
              <span style={{ fontWeight: 700, fontSize: 14 }}>Мало учасників</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: event.is_creator ? 10 : 0 }}>
              Зібралось {event.current_participants} з мінімум {event.min_participants} — якщо до початку заходу
              набір не заповниться, він автоматично скасується.
            </p>
            {event.is_creator && (
              <button
                className="btn btn-ghost" style={{ width: '100%', opacity: continuing ? .6 : 1 }}
                disabled={continuing} onClick={handleContinueAnyway}
              >
                {continuing ? 'Зберігаємо…' : 'Продовжити попри неповний набір'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Join CTA */}
      <div style={{ padding: '8px 16px 24px' }}>
        {joinError && (
          <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 8, textAlign: 'center' }}>{joinError}</div>
        )}
        {isEnded && (
          <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-3)', marginBottom: 8 }}>
            {event.status === 'cancelled' ? 'Захід скасовано' : 'Захід завершено'}
          </div>
        )}
        {event.is_creator ? (
          <>
            {!isEnded && (
              confirmingComplete ? (
                <div>
                  {completeError && (
                    <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 8, textAlign: 'center' }}>{completeError}</div>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn" style={{ flex: 1, background: 'var(--red)', color: '#fff', opacity: completing ? .6 : 1 }}
                      disabled={completing} onClick={handleComplete}
                    >
                      {completing ? 'Завершуємо…' : 'Так, завершити'}
                    </button>
                    <button className="btn btn-ghost" style={{ flex: 1 }} disabled={completing} onClick={() => setConfirmingComplete(false)}>
                      Скасувати
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="btn" style={{ width: '100%', background: 'var(--red-light)', color: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  onClick={() => setConfirmingComplete(true)}
                >
                  <Flag size={16} /> Завершити захід
                </button>
              )
            )}

            {!isEnded && !confirmingComplete && (
              confirmingCancel ? (
                <div style={{ marginTop: 8 }}>
                  {cancelError && (
                    <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 8, textAlign: 'center' }}>{cancelError}</div>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn" style={{ flex: 1, background: 'var(--red)', color: '#fff', opacity: cancelling ? .6 : 1 }}
                      disabled={cancelling} onClick={handleCancel}
                    >
                      {cancelling ? 'Скасовуємо…' : 'Так, скасувати захід'}
                    </button>
                    <button className="btn btn-ghost" style={{ flex: 1 }} disabled={cancelling} onClick={() => setConfirmingCancel(false)}>
                      Назад
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="btn btn-ghost"
                  style={{ width: '100%', marginTop: 8 }}
                  onClick={() => setConfirmingCancel(true)}
                >
                  Скасувати захід
                </button>
              )
            )}
          </>
        ) : alreadyJoined && !isEnded ? (
          confirmingLeave ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn" style={{ flex: 1, background: 'var(--red)', color: '#fff', opacity: leaving ? .6 : 1 }}
                disabled={leaving} onClick={handleLeave}
              >
                {leaving ? 'Виходимо…' : 'Так, скасувати участь'}
              </button>
              <button className="btn btn-ghost" style={{ flex: 1 }} disabled={leaving} onClick={() => setConfirmingLeave(false)}>
                Назад
              </button>
            </div>
          ) : (
            <button
              className="btn"
              style={{ width: '100%', background: 'var(--green-light)', color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              onClick={() => setConfirmingLeave(true)}
            >
              Ви приєднались <Check size={18} />
            </button>
          )
        ) : (
          <button
            className="btn btn-primary"
            style={{ width: '100%', opacity: joining || isEnded ? .6 : 1 }}
            disabled={joining || isEnded}
            onClick={handleJoin}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {joining ? 'Приєднуємось…' : <>Приєднатися <Check size={18} /></>}
            </span>
          </button>
        )}

        {(event.is_creator || alreadyJoined) && (
          <button
            className="btn btn-ghost"
            style={{ width: '100%', marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            onClick={() => navigate(`/events/${id}/chat`)}
          >
            <MessageCircle size={16} /> Чат заходу
          </button>
        )}

        {canReview && (
          <button
            className="btn btn-ghost"
            style={{ width: '100%', marginTop: 8 }}
            onClick={() => navigate(`/events/${id}/review`)}
          >
            Оцінити учасників
          </button>
        )}

        {event.status === 'completed' && (
          <button
            className="btn btn-ghost"
            style={{ width: '100%', marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            onClick={() => navigate(`/events/${id}/report`)}
          >
            <Flag size={16} /> Звіт заходу
          </button>
        )}
      </div>
    </div>
  )
}
