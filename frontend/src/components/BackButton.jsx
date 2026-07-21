import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

export default function BackButton({ to }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => to ? navigate(to) : navigate(-1)}
      style={{
        width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
        background: 'var(--card)', border: '1.5px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', color: 'var(--text)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <ChevronLeft size={22} />
    </button>
  )
}
