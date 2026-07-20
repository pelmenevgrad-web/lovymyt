import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Star, Loader2, AlertTriangle, Check } from 'lucide-react'
import { Avatar } from '../components/EventCard.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { apiFetch } from '../lib/api.js'

function StarPicker({ value, onChange }) {
  return (
    <span style={{ display: 'inline-flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          onClick={() => onChange(i)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
        >
          <Star size={22} fill={i <= value ? 'var(--orange)' : 'none'} color={i <= value ? 'var(--orange)' : 'var(--border)'} />
        </button>
      ))}
    </span>
  )
}

export default function EventReviewScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [people, setPeople] = useState(null)
  const [status, setStatus] = useState('pending') // pending | ok | error
  const [ratings, setRatings] = useState({})
  const [comments, setComments] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    apiFetch(`/events/${id}/participants`)
      .then(({ participants }) => {
        setPeople(participants.filter(p => p.id !== user?.id))
        setStatus('ok')
      })
      .catch(() => setStatus('error'))
  }, [id, user?.id])

  async function handleSubmit() {
    const reviews = Object.entries(ratings)
      .filter(([, rating]) => rating > 0)
      .map(([to_user_id, rating]) => ({ to_user_id, rating, comment: comments[to_user_id] }))

    if (reviews.length === 0) {
      setSubmitError('Постав хоча б одну оцінку')
      return
    }

    setSubmitting(true)
    setSubmitError(null)
    try {
      await apiFetch(`/events/${id}/reviews`, {
        method: 'POST',
        body: JSON.stringify({ reviews }),
      })
      setDone(true)
    } catch (err) {
      setSubmitError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'pending') {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader2 size={28} className="spin" color="var(--text-3)" />
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="page" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 10, minHeight: '60vh', padding: '0 32px', textAlign: 'center',
      }}>
        <AlertTriangle size={28} color="var(--text-3)" />
        <div style={{ fontWeight: 700, fontSize: 15 }}>Не вдалося завантажити учасників</div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="page" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 12, minHeight: '60vh', padding: '0 32px', textAlign: 'center',
      }}>
        <Check size={32} color="var(--green)" />
        <div style={{ fontWeight: 700, fontSize: 16 }}>Дякуємо за оцінку!</div>
        <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => navigate('/')}>На карту</button>
      </div>
    )
  }

  return (
    <div className="page">
      <div style={{ padding: '16px 16px 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, lineHeight: 1, color: 'var(--text)' }}
        >‹</button>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>Оцінити учасників</h1>
          <p style={{ fontSize: 13, color: 'var(--text-2)' }}>Як пройшов захід? Постав оцінку тим, з ким зустрічався</p>
        </div>
      </div>

      {people.length === 0 ? (
        <div style={{ padding: '20px 16px', fontSize: 13, color: 'var(--text-3)', textAlign: 'center' }}>
          Тут нема кого оцінювати — крім тебе, на заході більше нікого не було.
        </div>
      ) : (
        <div style={{ padding: '8px 16px' }}>
          {people.map(person => (
            <div key={person.id} className="card" style={{ padding: '14px', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <Avatar name={person.first_name} url={person.avatar_url} size={36} />
                <span style={{ fontWeight: 700, fontSize: 14 }}>{person.first_name}</span>
              </div>
              <StarPicker
                value={ratings[person.id] ?? 0}
                onChange={v => setRatings(r => ({ ...r, [person.id]: v }))}
              />
              <textarea
                placeholder="Коментар (необов'язково)"
                rows={2}
                value={comments[person.id] ?? ''}
                onChange={e => setComments(c => ({ ...c, [person.id]: e.target.value }))}
                style={{ resize: 'none', marginTop: 10 }}
              />
            </div>
          ))}

          {submitError && (
            <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 8, textAlign: 'center' }}>{submitError}</div>
          )}

          <button
            className="btn btn-primary"
            style={{ width: '100%', opacity: submitting ? .6 : 1 }}
            disabled={submitting}
            onClick={handleSubmit}
          >
            {submitting ? 'Надсилаємо…' : 'Надіслати оцінки'}
          </button>
        </div>
      )}
    </div>
  )
}
