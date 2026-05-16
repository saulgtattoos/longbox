import { useEffect, useRef, useState } from 'react'
import { supabase } from '../services/supabaseClient'

export default function CameraScanner({ onScanComplete, onClose }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const [photos, setPhotos] = useState([])
  const [status, setStatus] = useState('idle')
  const [statusText, setStatusText] = useState('FRAME THE COVER AND SHOOT')
  const [flash, setFlash] = useState(false)
  const [facingMode, setFacingMode] = useState('environment')

  const readingMessages = [
    'EXTRACTING DETAILS...',
    'READING COVER DATA...',
    'IDENTIFYING SERIES...',
    'WRITING TO VAULT...',
    'ALMOST DONE...',
  ]
  const [messageIndex, setMessageIndex] = useState(0)
  const messageTimerRef = useRef(null)

  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [facingMode])

  function startReadingMessages() {
    setMessageIndex(0)
    messageTimerRef.current = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % readingMessages.length)
    }, 1200)
  }

  function stopReadingMessages() {
    if (messageTimerRef.current) {
      clearInterval(messageTimerRef.current)
      messageTimerRef.current = null
    }
  }

  async function startCamera() {
    stopCamera()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
    } catch (err) {
      setStatus('error')
      setStatusText('CAMERA ACCESS DENIED')
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }

  function flipCamera() {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')
  }

  function capturePhoto() {
    if (status === 'reading' || photos.length >= 6) return
    setFlash(true)
    setTimeout(() => setFlash(false), 150)
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)
    const preview = canvas.toDataURL('image/jpeg', 0.7)
    const base64 = preview.split(',')[1]
    setPhotos(prev => [...prev, { base64, preview }])
  }

  function removePhoto(index) {
    setPhotos(prev => prev.filter((_, i) => i !== index))
  }

  async function uploadToSupabase(base64, filename) {
    try {
      const blob = await fetch("data:image/jpeg;base64," + base64).then(r => r.blob())
      const { error } = await supabase.storage
        .from('covers')
        .upload(filename, blob, { contentType: 'image/jpeg', upsert: true })
      if (error) throw error
      const { data: urlData } = supabase.storage.from('covers').getPublicUrl(filename)
      return urlData.publicUrl
    } catch (err) {
      console.error('[CameraScanner] Upload failed:', err)
      return null
    }
  }

  async function handleRead() {
    if (photos.length === 0 || status === 'reading') return
    setStatus('reading')
    startReadingMessages()

    try {
      const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_KEY

      const imageContent = photos.map((photo, i) => ([
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: photo.base64 } },
        { type: 'text', text: "Photo " + (i + 1) + " of " + photos.length + "." }
      ])).flat()

      imageContent.push({
        type: 'text',
        text: 'These are photos of a comic book. Some may be front covers, back covers, CGC labels, or barcodes. Extract all visible information and combine into one record. Determine which photo is the front cover and which is the back. Return ONLY a raw JSON object, no markdown, no explanation. Fields: title, issue, publisher, year, condition (CGC grade if visible otherwise estimate), variant (true or false), purchasePrice (empty string), estimatedValue (empty string), notes (writer, artist, signatures, CGC info, first appearances), frontPhotoIndex (0-based index of front cover photo), backPhotoIndex (0-based index of back cover photo or -1 if not present).'
      })

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: imageContent }]
        })
      })

      const data = await response.json()
      const text = data.content[0].text
      const cleaned = text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(cleaned)

      const timestamp = Date.now()
      const frontIndex = parsed.frontPhotoIndex ?? 0
      const backIndex = parsed.backPhotoIndex ?? -1
      const frontPhoto = photos[frontIndex] || photos[0]
      const backPhoto = backIndex >= 0 ? photos[backIndex] : null

      const frontUrl = frontPhoto ? await uploadToSupabase(frontPhoto.base64, timestamp + "_front.jpg") : null
      const backUrl = backPhoto ? await uploadToSupabase(backPhoto.base64, timestamp + "_back.jpg") : null

      const formData = {
        title: parsed.title || '',
        issue: parsed.issue || '',
        publisher: parsed.publisher || '',
        year: parsed.year || '',
        condition: parsed.condition || '9.2',
        variant: parsed.variant || false,
        purchasePrice: parsed.purchasePrice || '',
        estimatedValue: parsed.estimatedValue || '',
        notes: parsed.notes || '',
      }

      stopReadingMessages()
      setStatus('done')
      setStatusText('DONE')
      stopCamera()
      setTimeout(() => onScanComplete(formData, frontUrl, backUrl), 600)

    } catch (err) {
      console.error('[CameraScanner] Read failed:', err)
      stopReadingMessages()
      setStatus('error')
      setStatusText('READ FAILED — TRY AGAIN')
      setTimeout(() => { setStatus('idle'); setStatusText('FRAME THE COVER AND SHOOT') }, 2000)
    }
  }

  const isReading = status === 'reading'
  const isDone = status === 'done'
  const isError = status === 'error'
  const canRead = photos.length > 0 && !isReading && !isDone

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 300, display: 'flex', flexDirection: 'column' }}>
      {flash && <div style={{ position: 'absolute', inset: 0, background: 'white', zIndex: 400, pointerEvents: 'none' }} />}

      <video ref={videoRef} autoPlay playsInline muted style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Top bar */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3rem 1.5rem 1rem', background: 'linear-gradient(to bottom, rgba(0,0,0,0.75), transparent)' }}>
        <button onClick={() => { stopCamera(); onClose() }} style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(201,169,110,0.4)', borderRadius: '6px', color: 'var(--gold)', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', letterSpacing: '0.1em', padding: '0.5rem 1rem', cursor: 'pointer' }}>CLOSE</button>
        <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1rem', color: 'var(--gold)', letterSpacing: '0.05em' }}>SCAN</p>
        <button onClick={flipCamera} style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(201,169,110,0.4)', borderRadius: '6px', color: 'var(--gold)', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', letterSpacing: '0.1em', padding: '0.5rem 1rem', cursor: 'pointer' }}>FLIP</button>
      </div>

      {/* Frame guides with pulsing gold ring when reading */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 5 }}>
        <div style={{ width: '75%', aspectRatio: '2/3', position: 'relative', maxHeight: '65vh' }}>
          {[
            { top: 0, left: 0, borderTop: '3px solid', borderLeft: '3px solid' },
            { top: 0, right: 0, borderTop: '3px solid', borderRight: '3px solid' },
            { bottom: 0, left: 0, borderBottom: '3px solid', borderLeft: '3px solid' },
            { bottom: 0, right: 0, borderBottom: '3px solid', borderRight: '3px solid' },
          ].map((style, i) => (
            <div key={i} style={{
              position: 'absolute',
              width: '32px',
              height: '32px',
              borderColor: isDone ? 'var(--success)' : isReading ? 'var(--gold)' : 'rgba(201,169,110,0.6)',
              animation: isReading ? 'cornerPulse 1.2s ease-in-out infinite' : 'none',
              animationDelay: i * 0.15 + 's',
              transition: 'border-color 0.3s',
              ...style,
            }} />
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ position: 'relative', zIndex: 10, marginTop: 'auto', padding: '1rem 1.5rem 3rem', background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>

        {/* Thumbnails */}
        {photos.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', width: '100%', paddingBottom: '0.25rem', justifyContent: 'center' }}>
            {photos.map((photo, i) => (
              <div key={i} style={{ position: 'relative', flexShrink: 0 }}>
                <img src={photo.preview} alt={"Photo " + (i + 1)} style={{ width: '56px', height: '72px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--gold)' }} />
                <button onClick={() => removePhoto(i)} style={{ position: 'absolute', top: '-6px', right: '-6px', width: '18px', height: '18px', borderRadius: '50%', background: 'var(--red)', border: 'none', color: 'white', fontSize: '0.6rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                <div style={{ position: 'absolute', bottom: '2px', left: '2px', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.5rem', color: 'white', background: 'rgba(0,0,0,0.6)', padding: '1px 3px', borderRadius: '2px' }}>{i + 1}</div>
              </div>
            ))}
          </div>
        )}

        {/* Status */}
        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.65rem', letterSpacing: '0.15em', color: isDone ? 'var(--success)' : isError ? 'var(--red)' : 'var(--gold)', transition: 'color 0.3s', textAlign: 'center', minHeight: '1rem' }}>
          {isReading ? readingMessages[messageIndex] : statusText}
        </p>

        {/* Controls — always centered */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', gap: '2rem' }}>

          {/* Spacer to keep capture button centered when READ button appears */}
          <div style={{ width: photos.length > 0 ? '90px' : '0px', transition: 'width 0.2s' }} />

          {/* Capture button — always in center */}
          <button
            onClick={capturePhoto}
            disabled={isReading || isDone || photos.length >= 6}
            style={{ width: '72px', height: '72px', borderRadius: '50%', border: '3px solid var(--gold)', background: 'rgba(201,169,110,0.15)', cursor: isReading || isDone || photos.length >= 6 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)', opacity: photos.length >= 6 ? 0.4 : 1, flexShrink: 0 }}
          >
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: isReading || isDone ? 'rgba(201,169,110,0.3)' : 'var(--gold)' }} />
          </button>

          {/* READ button — appears to the right when photos exist */}
          <div style={{ width: '90px' }}>
            {photos.length > 0 && (
              <button
                onClick={handleRead}
                disabled={!canRead}
                style={{ background: canRead ? 'var(--gold)' : 'rgba(201,169,110,0.3)', color: 'var(--ink)', border: 'none', borderRadius: '8px', padding: '0.6rem 0.75rem', fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.05em', cursor: canRead ? 'pointer' : 'not-allowed', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
              >
                {isReading ? (
                  <div style={{ width: '12px', height: '12px', border: '2px solid var(--ink)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                ) : "READ " + photos.length}
              </button>
            )}
          </div>
        </div>

        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.55rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em' }}>
          {photos.length === 0 ? 'TAP TO SHOOT' : photos.length + ' OF 6 PHOTOS'}
        </p>
      </div>

      <style>{`
        @keyframes cornerPulse {
          0%, 100% { opacity: 1; border-color: rgba(201,169,110,0.9); }
          50% { opacity: 0.3; border-color: rgba(201,169,110,0.2); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
