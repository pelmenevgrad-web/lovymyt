import { useState, useRef, useEffect, useCallback } from 'react'

// Lets the user drag a picked photo around inside a fixed-size frame to
// choose which part shows, then bakes the visible crop into a new image via
// canvas on every reposition — the result is what actually gets uploaded, so
// no separate "focal point" metadata needs to travel anywhere else in the app.
export default function ImagePositionPicker({
  src, width, height, shape = 'rect', onCropped, onEmptyClick, children,
}) {
  const frameRef = useRef(null)
  const sourceImgRef = useRef(null)
  const offsetRef = useRef({ x: 0, y: 0 })
  const dragRef = useRef(null)
  const [natural, setNatural] = useState(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)

  const clamp = useCallback((off, sc, nat, frameW, frameH) => {
    const sw = nat.w * sc, sh = nat.h * sc
    const minX = frameW - sw, minY = frameH - sh
    return { x: Math.min(0, Math.max(minX, off.x)), y: Math.min(0, Math.max(minY, off.y)) }
  }, [])

  const emitCrop = useCallback((nat, sc, off, frameW, frameH) => {
    const img = sourceImgRef.current
    if (!img || !frameW || !frameH) return
    const outW = Math.round(Math.min(1600, Math.max(400, frameW * 2)))
    const outH = Math.round(Math.min(1600, Math.max(400, frameH * 2)))
    const canvas = document.createElement('canvas')
    canvas.width = outW
    canvas.height = outH
    const ctx = canvas.getContext('2d')
    try {
      ctx.drawImage(
        img,
        -off.x / sc, -off.y / sc, frameW / sc, frameH / sc,
        0, 0, outW, outH,
      )
      onCropped(canvas.toDataURL('image/jpeg', 0.85))
    } catch {
      // Cross-origin image without CORS headers taints the canvas — happens
      // only for an already-saved photo the user hasn't re-picked this
      // session. Nothing to bake yet, so just leave the previous value be.
    }
  }, [onCropped])

  useEffect(() => {
    if (!src) { setNatural(null); sourceImgRef.current = null; return }
    let cancelled = false
    // data: URLs (freshly picked files) are already same-origin-safe for
    // canvas; only remote URLs (an existing saved photo) need a CORS probe,
    // and only if the bucket actually sends the header — otherwise fall
    // back to a plain load so the photo still displays (just not draggable
    // into a fresh crop until the user re-picks it).
    const isRemote = /^https?:/.test(src)

    function load(withCors) {
      const img = new Image()
      if (withCors) img.crossOrigin = 'anonymous'
      img.onload = () => {
        if (cancelled) return
        const frame = frameRef.current
        const frameW = frame?.clientWidth || width || img.naturalWidth
        const frameH = frame?.clientHeight || height || img.naturalHeight
        const nat = { w: img.naturalWidth, h: img.naturalHeight }
        const sc = Math.max(frameW / nat.w, frameH / nat.h)
        const off = { x: (frameW - nat.w * sc) / 2, y: (frameH - nat.h * sc) / 2 }
        sourceImgRef.current = img
        offsetRef.current = off
        setNatural(nat)
        setScale(sc)
        setOffset(off)
        if (withCors) emitCrop(nat, sc, off, frameW, frameH)
      }
      img.onerror = () => { if (!cancelled && withCors) load(false) }
      img.src = src
    }
    load(isRemote)
    return () => { cancelled = true }
    // Only re-run when the source photo itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src])

  function handlePointerDown(e) {
    if (!natural) {
      onEmptyClick?.()
      return
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
    dragRef.current = { startX: e.clientX, startY: e.clientY, base: offsetRef.current }
  }

  function handlePointerMove(e) {
    if (!dragRef.current || !natural) return
    const frame = frameRef.current
    const frameW = frame.clientWidth, frameH = frame.clientHeight
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    const next = clamp(
      { x: dragRef.current.base.x + dx, y: dragRef.current.base.y + dy },
      scale, natural, frameW, frameH,
    )
    offsetRef.current = next
    setOffset(next)
  }

  function handlePointerUp() {
    if (!dragRef.current) return
    dragRef.current = null
    setDragging(false)
    const frame = frameRef.current
    emitCrop(natural, scale, offsetRef.current, frame.clientWidth, frame.clientHeight)
  }

  return (
    <div
      ref={frameRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        position: 'relative', width: width ?? '100%', height,
        borderRadius: shape === 'circle' ? '50%' : 'var(--radius-lg)',
        overflow: 'hidden', touchAction: 'none', userSelect: 'none',
        cursor: !src ? 'pointer' : dragging ? 'grabbing' : 'grab',
        background: shape === 'circle' ? 'var(--accent-dark)' : 'var(--card)',
        flexShrink: 0,
      }}
    >
      {src && natural && (
        <img
          src={src}
          alt=""
          draggable={false}
          onDragStart={e => e.preventDefault()}
          style={{
            position: 'absolute', left: offset.x, top: offset.y,
            width: natural.w * scale, height: natural.h * scale,
            maxWidth: 'none', pointerEvents: 'none',
          }}
        />
      )}
      {!src && children}
    </div>
  )
}
