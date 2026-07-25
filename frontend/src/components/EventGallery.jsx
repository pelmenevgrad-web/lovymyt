import { useState, useEffect, useRef } from 'react'
import { Camera, X, Loader2, Trash2 } from 'lucide-react'
import { apiFetch } from '../lib/api.js'
import { compressImage } from '../lib/image.js'

// Shown once an event is completed — participants/organizer drop photos as a
// shared memory of the event. Same compressImage -> data URL -> upload
// pattern as venue/club covers, just against /events/:id/photos.
export default function EventGallery({ eventId, canUpload, myUserId }) {
  const [photos, setPhotos] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [viewerUrl, setViewerUrl] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    apiFetch(`/events/${eventId}/photos`)
      .then(({ photos }) => setPhotos(photos))
      .catch(err => console.error('[EventGallery] failed to load photos:', err.message))
  }, [eventId])

  async function handlePick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || uploading) return
    setUploading(true)
    setError(null)
    try {
      const photo = await compressImage(file)
      const { photo: created } = await apiFetch(`/events/${eventId}/photos`, {
        method: 'POST',
        body: JSON.stringify({ photo }),
      })
      setPhotos(list => [created, ...(list ?? [])])
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(photoId) {
    setPhotos(list => list.filter(p => p.id !== photoId))
    try {
      await apiFetch(`/events/${eventId}/photos/${photoId}`, { method: 'DELETE' })
    } catch (err) {
      console.error('[EventGallery] delete failed:', err.message)
    }
  }

  if (photos === null) return null
  if (photos.length === 0 && !canUpload) return null

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: .06, marginBottom: 8 }}>
        Фото заходу
      </div>
      {error && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 8 }}>{error}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        {canUpload && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              aspectRatio: '1', borderRadius: 'var(--radius-sm)', border: '1.5px dashed var(--border)',
              background: 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--text-3)',
            }}
          >
            {uploading ? <Loader2 size={20} className="spin" /> : <Camera size={20} />}
          </button>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handlePick} />
        {photos.map(p => (
          <div key={p.id} style={{ position: 'relative', aspectRatio: '1' }}>
            <img
              src={p.image_url} alt=""
              onClick={() => setViewerUrl(p.image_url)}
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
            />
            {(p.user?.id === myUserId || canUpload) && (
              <button
                onClick={() => handleDelete(p.id)}
                style={{
                  position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%',
                  background: 'rgba(0,0,0,.55)', border: 'none', color: '#fff', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0,
                }}
              >
                <Trash2 size={11} />
              </button>
            )}
          </div>
        ))}
      </div>

      {viewerUrl && (
        <div
          onClick={() => setViewerUrl(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.9)', zIndex: 1100,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }}
        >
          <button
            onClick={() => setViewerUrl(null)}
            style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
          >
            <X size={26} />
          </button>
          <img src={viewerUrl} alt="" style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 'var(--radius-md)' }} />
        </div>
      )}
    </div>
  )
}
