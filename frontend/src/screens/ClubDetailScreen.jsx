import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Loader2, AlertTriangle, Users, Bell, BellOff, Pencil, Rocket, Clock } from 'lucide-react'
import BackButton from '../components/BackButton.jsx'
import { apiFetch } from '../lib/api.js'

const WEEKDAYS = ['неділю', 'понеділок', 'вівторок', 'середу', 'четвер', 'п\'ятницю', 'суботу']

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// weekday: 0=Нд..6=Сб, matches JS Date#getDay() exactly — no conversion needed.
function nextOccurrence(weekday, timeOfDay) {
  if (weekday == null) return null
  const now = new Date()
  const [hh, mm] = (timeOfDay || '19:00').split(':').map(Number)
  const result = new Date(now)
  result.setHours(hh || 0, mm || 0, 0, 0)
  let diff = (weekday - now.getDay() + 7) % 7
  if (diff === 0 && result <= now) diff = 7
  result.setDate(now.getDate() + diff)
  return result
}

function EventRow({ event, onClick }) {
  return (
    <div className="card" style={{ padding: 12, marginBottom: 8, cursor: 'pointer' }} onClick={onClick}>
      <div style={{ fontWeight: 700, fontSize: 14 }}>{event.title}</div>
      <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
        <Clock size={11} /> {formatDate(event.start_time)}
      </div>
    </div>
  )
}

export default function ClubDetailScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [club, setClub] = useState(null)
  const [status, setStatus] = useState('pending')
  const [errorMsg, setErrorMsg] = useState(null)
  const [subscribing, setSubscribing] = useState(false)

  function load() {
    apiFetch(`/clubs/${id}`)
      .then(({ club }) => { setClub(club); setStatus('ok') })
      .catch(err => { setErrorMsg(err.message); setStatus('error') })
  }

  useEffect(load, [id])

  async function toggleSubscribe() {
    if (subscribing) return
    setSubscribing(true)
    try {
      await apiFetch(`/clubs/${id}/${club.is_subscribed ? 'unsubscribe' : 'subscribe'}`, { method: 'POST' })
      setClub(c => ({
        ...c, is_subscribed: !c.is_subscribed,
        subscriber_count: c.subscriber_count + (c.is_subscribed ? -1 : 1),
      }))
    } catch (err) {
      setErrorMsg(err.message)
    } finally {
      setSubscribing(false)
    }
  }

  function handleCreateNext() {
    const params = new URLSearchParams({ club_id: id })
    const next = nextOccurrence(club.weekday, club.time_of_day)
    if (next) params.set('suggested_date', next.toISOString().slice(0, 16))
    navigate(`/create?${params.toString()}`)
  }

  if (status === 'pending') {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader2 size={28} className="spin" color="var(--text-3)" />
      </div>
    )
  }

  if (status === 'error' || !club) {
    return (
      <div className="page" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 10, minHeight: '60vh', paddingLeft: 32, paddingRight: 32, textAlign: 'center',
      }}>
        <AlertTriangle size={28} color="var(--text-3)" />
        <div style={{ fontWeight: 700, fontSize: 15 }}>{errorMsg || 'Клуб не знайдено'}</div>
      </div>
    )
  }

  return (
    <div className="page">
      {club.cover_image_url && (
        <img src={club.cover_image_url} alt="" style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} />
      )}

      <div style={{ padding: '16px 16px 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <BackButton />
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>{club.title}</h1>
          <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Users size={12} /> {club.subscriber_count}</span>
            {club.weekday != null && <span>Щотижня в {WEEKDAYS[club.weekday]}{club.time_of_day ? `, ${club.time_of_day}` : ''}</span>}
          </div>
        </div>
      </div>

      {club.description && (
        <div style={{ margin: '0 16px 16px' }}>
          <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.5 }}>{club.description}</p>
        </div>
      )}

      <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {errorMsg && <div style={{ color: 'var(--red)', fontSize: 13, textAlign: 'center' }}>{errorMsg}</div>}
        {!club.is_creator && (
          <button
            className="btn"
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: subscribing ? .6 : 1,
              background: club.is_subscribed ? 'var(--green-light)' : 'var(--accent)',
              color: club.is_subscribed ? 'var(--green)' : '#fff',
            }}
            disabled={subscribing}
            onClick={toggleSubscribe}
          >
            {club.is_subscribed ? <><BellOff size={16} /> Відписатись</> : <><Bell size={16} /> Підписатись</>}
          </button>
        )}
        {club.is_creator && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13 }}
              onClick={handleCreateNext}
            >
              <Rocket size={14} /> Наступний захід
            </button>
            <button
              className="btn btn-ghost" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13 }}
              onClick={() => navigate(`/clubs/${id}/edit`)}
            >
              <Pencil size={14} /> Редагувати
            </button>
          </div>
        )}
      </div>

      <div style={{ padding: '0 16px' }}>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 8 }}>Найближчі заходи</div>
        {club.upcoming_events.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16 }}>Поки немає запланованих</div>
        ) : (
          <div style={{ marginBottom: 16 }}>
            {club.upcoming_events.map(e => (
              <EventRow key={e.id} event={e} onClick={() => navigate(`/events/${e.id}`)} />
            ))}
          </div>
        )}

        {club.past_events.length > 0 && (
          <>
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 8 }}>Минулі заходи</div>
            <div style={{ paddingBottom: 24 }}>
              {club.past_events.map(e => (
                <EventRow key={e.id} event={e} onClick={() => navigate(`/events/${e.id}`)} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
