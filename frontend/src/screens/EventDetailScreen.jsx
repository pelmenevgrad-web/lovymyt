import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Clock, MapPin, Users, PawPrint, Baby, BadgeCheck, Zap,
  Loader2, AlertTriangle, Check, Gift, CreditCard, Handshake,
} from 'lucide-react'
import { CATEGORIES, STATUS_META } from '../data/mockData.js'
import { Avatar, AvatarStack } from '../components/EventCard.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { apiFetch } from '../lib/api.js'

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
  const [event, setEvent] = useState(null)
  const [status, setStatus] = useState('pending') // pending | ok | error
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState(null)
  const [supplies, setSupplies] = useState([])

  useEffect(() => {
    apiFetch(`/events/${id}`)
      .then(({ event }) => { setEvent(event); setStatus('ok') })
      .catch(() => setStatus('error'))
    apiFetch(`/events/${id}/supplies`)
      .then(({ supplies }) => setSupplies(supplies))
      .catch(err => console.error('[EventDetail] failed to load supplies:', err.message))
  }, [id])

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
        gap: 10, minHeight: '60vh', padding: '0 32px', textAlign: 'center',
      }}>
        <AlertTriangle size={28} color="var(--text-3)" />
        <div style={{ fontWeight: 700, fontSize: 15 }}>Захід не знайдено</div>
      </div>
    )
  }

  const cat = CATEGORIES.find(c => c.id === event.category_id) ?? CATEGORIES[0]
  const statusMeta = STATUS_META[event.status] ?? STATUS_META.planned
  const budget = BUDGET_LABEL[event.budget_type] ?? BUDGET_LABEL.free
  const pct = Math.round((event.current_participants / event.max_participants) * 100)
  const alreadyJoined = event.my_status === 'accepted'
  const eventStarted = new Date(event.start_time) < new Date()
  const canReview = eventStarted && (event.is_creator || alreadyJoined)

  return (
    <div className="page">
      {/* Header */}
      <div style={{ padding: '16px 16px 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, lineHeight: 1, color: 'var(--text)' }}
        >‹</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="badge" style={{ background: statusMeta.bg, color: statusMeta.color }}>
            {event.status === 'active' && '● '}{statusMeta.label}
          </span>
          {event.status === 'active' && event.late_join_allowed && (
            <span className="badge" style={{ background: 'var(--green-light)', color: 'var(--green)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <Zap size={11} /> Можна приєднатися
            </span>
          )}
        </div>
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
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>{cat.name}</div>
            <h1 style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.25 }}>{event.title}</h1>
          </div>
        </div>

        {/* Creator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Avatar name={event.creator_name} url={event.creator_avatar_url} size={28} />
          <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Організатор: <strong style={{ color: 'var(--text)' }}>{event.creator_name}</strong></span>
        </div>

        {/* Key facts */}
        <div className="card" style={{ padding: '4px 14px', marginBottom: 16 }}>
          <ConditionRow Icon={Clock}>{formatDateTime(event.start_time)}</ConditionRow>
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
        </div>

        {/* Participant progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <AvatarStack people={event.participant_avatars} size={22} />
          <div style={{ flex: 1, height: 6, borderRadius: 99, background: 'var(--border)' }}>
            <div style={{ width: `${pct}%`, height: '100%', borderRadius: 99, background: cat.color }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', flexShrink: 0 }}>{pct}%</span>
        </div>

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

        {event.description && (
          <div style={{ margin: '0 0 16px' }} className="card">
            <div style={{ padding: '14px 16px' }}>
              <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.5 }}>{event.description}</p>
            </div>
          </div>
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

      {/* Join CTA */}
      <div style={{ padding: '8px 16px 24px' }}>
        {joinError && (
          <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 8, textAlign: 'center' }}>{joinError}</div>
        )}
        {event.is_creator ? (
          <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-3)' }}>Це ваш захід</div>
        ) : (
          <button
            className="btn btn-primary"
            style={{ width: '100%', opacity: joining ? .6 : 1 }}
            disabled={joining || alreadyJoined}
            onClick={handleJoin}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {alreadyJoined ? <>Ви приєднались <Check size={18} /></> : joining ? 'Приєднуємось…' : <>Приєднатися <Check size={18} /></>}
            </span>
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
      </div>
    </div>
  )
}
