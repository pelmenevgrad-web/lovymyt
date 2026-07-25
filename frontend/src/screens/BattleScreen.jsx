import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { io } from 'socket.io-client'
import { Loader2, AlertTriangle, Swords, Gem, Camera, Video, Check, X, ThumbsUp } from 'lucide-react'
import { Avatar } from '../components/EventCard.jsx'
import BackButton from '../components/BackButton.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { apiFetch, API_URL } from '../lib/api.js'
import { compressImage } from '../lib/image.js'

const MAX_VIDEO_SECONDS = 20
const MAX_VIDEO_MB = 15
const DONATE_PRESETS = [10, 25, 50]

function SideCard({ side, isLeading, isMe, onVote, onDonate, canAct, myVoteHere }) {
  return (
    <div
      className="card"
      style={{
        flex: 1, padding: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        border: isLeading ? '2px solid var(--accent)' : '1.5px solid var(--border)',
      }}
    >
      <Avatar name={side.organizer_name ?? '?'} url={side.organizer_avatar} size={44} />
      <div style={{ fontWeight: 700, fontSize: 13, textAlign: 'center' }}>{side.organizer_name}</div>
      <div style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'center' }}>{side.event_title}</div>
      <div style={{ fontWeight: 800, fontSize: 20 }}>{side.votes}</div>
      <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>голосів</div>
      {canAct && (
        <div style={{ display: 'flex', gap: 6, width: '100%' }}>
          <button
            className="chip"
            onClick={onVote}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 12,
              background: myVoteHere ? 'var(--accent)' : undefined, color: myVoteHere ? '#fff' : undefined,
            }}
          >
            <ThumbsUp size={12} /> {myVoteHere ? 'Твій голос' : 'Голос'}
          </button>
        </div>
      )}
      {!isMe && (
        <button className="chip" onClick={onDonate} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, width: '100%', justifyContent: 'center' }}>
          <Gem size={12} color="var(--blue)" /> Донат
        </button>
      )}
    </div>
  )
}

function DonateSheet({ sideName, onClose, onSubmit, error, submitting }) {
  const [amount, setAmount] = useState(DONATE_PRESETS[0])
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-end' }} onClick={onClose}>
      <div className="card" style={{ width: '100%', borderRadius: '20px 20px 0 0', padding: 20 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 17 }}>Донат за {sideName}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>
        {error && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 10, textAlign: 'center' }}>{error}</div>}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {DONATE_PRESETS.map(p => (
            <button
              key={p}
              className="chip"
              onClick={() => setAmount(p)}
              style={{ flex: 1, justifyContent: 'center', background: amount === p ? 'var(--accent)' : undefined, color: amount === p ? '#fff' : undefined }}
            >
              {p} ⭐
            </button>
          ))}
        </div>
        <input
          type="number" min={1} value={amount}
          onChange={e => setAmount(Math.max(1, Number(e.target.value) || 1))}
          style={{ marginBottom: 14 }}
        />
        <button
          className="btn btn-primary"
          style={{ width: '100%', opacity: submitting ? .6 : 1 }}
          disabled={submitting}
          onClick={() => onSubmit(amount)}
        >
          {submitting ? 'Надсилаємо…' : `Задонатити ${amount} ⭐`}
        </button>
      </div>
    </div>
  )
}

export default function BattleScreen() {
  const { id } = useParams()
  const { user, updateUser } = useAuth()
  const [battle, setBattle] = useState(null)
  const [posts, setPosts] = useState(null)
  const [status, setStatus] = useState('pending')
  const [errorMsg, setErrorMsg] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [donateSide, setDonateSide] = useState(null)
  const [donating, setDonating] = useState(false)
  const [posting, setPosting] = useState(false)
  const socketRef = useRef(null)
  const photoInputRef = useRef(null)
  const videoInputRef = useRef(null)

  const loadBattle = useCallback(() => {
    apiFetch(`/battles/${id}`)
      .then(({ battle }) => { setBattle(battle); setStatus('ok') })
      .catch(err => { setErrorMsg(err.message); setStatus('error') })
  }, [id])

  const loadPosts = useCallback(() => {
    apiFetch(`/battles/${id}/posts`).then(({ posts }) => setPosts(posts)).catch(() => {})
  }, [id])

  useEffect(() => { loadBattle(); loadPosts() }, [loadBattle, loadPosts])

  useEffect(() => {
    const socket = io(API_URL, { auth: { token: localStorage.getItem('lovymyt_token') } })
    socketRef.current = socket
    socket.emit('join_battle', id)
    socket.on('battle_update', loadBattle)
    socket.on('new_post', (post) => setPosts(prev => [post, ...(prev ?? [])]))
    return () => {
      socket.emit('leave_battle', id)
      socket.disconnect()
    }
  }, [id, loadBattle])

  async function handleAccept() {
    setActionError(null)
    try {
      await apiFetch(`/battles/${id}/accept`, { method: 'POST' })
      loadBattle()
    } catch (err) {
      setActionError(err.message)
    }
  }

  async function handleDecline() {
    setActionError(null)
    try {
      await apiFetch(`/battles/${id}/decline`, { method: 'POST' })
      loadBattle()
    } catch (err) {
      setActionError(err.message)
    }
  }

  async function handleVote(sideId) {
    setActionError(null)
    try {
      await apiFetch(`/battles/${id}/vote`, { method: 'POST', body: JSON.stringify({ side_id: sideId }) })
      loadBattle()
    } catch (err) {
      setActionError(err.message)
    }
  }

  async function handleDonate(amount) {
    if (donating) return
    setDonating(true)
    setActionError(null)
    try {
      await apiFetch(`/battles/${id}/donate`, {
        method: 'POST',
        body: JSON.stringify({ side_id: donateSide.organizer_id, amount }),
      })
      if (user.stars_balance != null) updateUser?.({ stars_balance: user.stars_balance - amount })
      setDonateSide(null)
      loadBattle()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setDonating(false)
    }
  }

  async function handlePickPhoto(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || posting) return
    setPosting(true)
    setActionError(null)
    try {
      const media = await compressImage(file)
      const { post } = await apiFetch(`/battles/${id}/posts`, {
        method: 'POST',
        body: JSON.stringify({ media, media_type: 'photo' }),
      })
      setPosts(prev => [post, ...(prev ?? [])])
    } catch (err) {
      setActionError(err.message)
    } finally {
      setPosting(false)
    }
  }

  async function handlePickVideo(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || posting) return
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
      setActionError(`Відео завелике — макс. ${MAX_VIDEO_MB}МБ, запиши коротший кружечок (до ${MAX_VIDEO_SECONDS}с)`)
      return
    }
    setPosting(true)
    setActionError(null)
    try {
      const media = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const { post } = await apiFetch(`/battles/${id}/posts`, {
        method: 'POST',
        body: JSON.stringify({ media, media_type: 'video' }),
        timeoutMs: 60_000,
      })
      setPosts(prev => [post, ...(prev ?? [])])
    } catch (err) {
      setActionError(err.message)
    } finally {
      setPosting(false)
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
        gap: 10, minHeight: '60vh', paddingLeft: 32, paddingRight: 32, textAlign: 'center',
      }}>
        <AlertTriangle size={28} color="var(--text-3)" />
        <div style={{ fontWeight: 700, fontSize: 15 }}>{errorMsg || 'Не вдалося відкрити баттл'}</div>
      </div>
    )
  }

  const isChallenger = battle.challenger.organizer_id === user?.id
  const isOpponent = battle.opponent.organizer_id === user?.id
  const isParticipant = isChallenger || isOpponent
  const canVote = battle.status === 'active' && !isParticipant
  const canPost = battle.status === 'active' && isParticipant
  const leading = battle.challenger.votes === battle.opponent.votes ? null
    : (battle.challenger.votes > battle.opponent.votes ? 'challenger' : 'opponent')

  return (
    <div className="page">
      <div style={{ padding: '16px 16px 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <BackButton />
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Swords size={18} /> Баттл заходів
          </h1>
          {battle.prize_pool > 0 && (
            <p style={{ fontSize: 13, color: 'var(--blue)', fontWeight: 700 }}>Призовий фонд: {battle.prize_pool} ⭐</p>
          )}
        </div>
      </div>

      {actionError && (
        <div style={{ margin: '0 16px 8px', color: 'var(--red)', fontSize: 13, textAlign: 'center' }}>{actionError}</div>
      )}

      <div style={{ display: 'flex', gap: 10, padding: '0 16px 16px' }}>
        <SideCard
          side={battle.challenger}
          isLeading={leading === 'challenger'}
          isMe={isChallenger}
          canAct={canVote}
          myVoteHere={battle.my_vote === battle.challenger.organizer_id}
          onVote={() => handleVote(battle.challenger.organizer_id)}
          onDonate={() => setDonateSide(battle.challenger)}
        />
        <div style={{ display: 'flex', alignItems: 'center', fontWeight: 800, color: 'var(--text-3)' }}>VS</div>
        <SideCard
          side={battle.opponent}
          isLeading={leading === 'opponent'}
          isMe={isOpponent}
          canAct={canVote}
          myVoteHere={battle.my_vote === battle.opponent.organizer_id}
          onVote={() => handleVote(battle.opponent.organizer_id)}
          onDonate={() => setDonateSide(battle.opponent)}
        />
      </div>

      {battle.status === 'pending' && isOpponent && (
        <div className="card" style={{ margin: '0 16px 16px', padding: 14, textAlign: 'center' }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Тебе викликали на баттл!</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={handleDecline}>Відхилити</button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleAccept}>
              <Check size={16} /> Прийняти
            </button>
          </div>
        </div>
      )}
      {battle.status === 'pending' && isChallenger && (
        <div style={{ margin: '0 16px 16px', fontSize: 13, color: 'var(--text-3)', textAlign: 'center' }}>
          Очікуємо, поки суперник прийме виклик…
        </div>
      )}
      {battle.status === 'declined' && (
        <div style={{ margin: '0 16px 16px', fontSize: 13, color: 'var(--text-3)', textAlign: 'center' }}>
          Виклик відхилено
        </div>
      )}
      {battle.status === 'completed' && (
        <div style={{ margin: '0 16px 16px', fontSize: 14, fontWeight: 700, textAlign: 'center' }}>
          {battle.winner_id ? '🏆 Баттл завершено!' : '🤝 Баттл завершено внічию'}
        </div>
      )}

      {canPost && (
        <div style={{ display: 'flex', gap: 8, padding: '0 16px 16px' }}>
          <input ref={photoInputRef} type="file" accept="image/*" hidden onChange={handlePickPhoto} />
          <input ref={videoInputRef} type="file" accept="video/*" capture="environment" hidden onChange={handlePickVideo} />
          <button className="chip" disabled={posting} onClick={() => photoInputRef.current?.click()} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Camera size={14} /> Фото
          </button>
          <button className="chip" disabled={posting} onClick={() => videoInputRef.current?.click()} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {posting ? <Loader2 size={14} className="spin" /> : <Video size={14} />} Кружечок
          </button>
        </div>
      )}

      <div style={{ padding: '0 16px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {(posts ?? []).map(p => (
          <div key={p.id} className="card" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
            {p.media_type === 'video' ? (
              <video src={p.media_url} controls style={{ width: '100%', display: 'block', maxHeight: 220 }} />
            ) : (
              <img src={p.media_url} alt="" style={{ width: '100%', display: 'block', maxHeight: 220, objectFit: 'cover' }} />
            )}
            <div style={{
              position: 'absolute', top: 6, left: 6, fontSize: 10, fontWeight: 700, color: '#fff',
              background: 'rgba(0,0,0,.55)', borderRadius: 6, padding: '2px 6px',
            }}>
              {p.side_id === battle.challenger.organizer_id ? battle.challenger.organizer_name : battle.opponent.organizer_name}
            </div>
          </div>
        ))}
        {posts && posts.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-3)', fontSize: 13, padding: 20 }}>
            Ще немає фото чи відео з баттлу
          </div>
        )}
      </div>

      {donateSide && (
        <DonateSheet
          sideName={donateSide.organizer_name}
          error={actionError}
          submitting={donating}
          onClose={() => setDonateSide(null)}
          onSubmit={handleDonate}
        />
      )}
    </div>
  )
}
