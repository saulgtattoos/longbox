import { useEffect, useRef, useState } from 'react'

/**
 * CameraScanner.jsx
 * Full screen camera scanner with Claude Vision built in.
 * User frames the comic cover or barcode, taps capture, Claude fills all fields.
 *
 * Props:
 *   onScanComplete(formData) — called with parsed comic data ready for form state
 *   onClose() — called when user dismisses
 */
export default function CameraScanner({ onScanComplete, onClose }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const [status, setStatus] = useState('idle') // idle | capturing | reading | done | error
  const [statusText, setStatusText] = useState('FRAME THE COVER OR BARCODE')
  const [flash, setFlash] = useState(false)
  const [facingMode, setFacingMode] = useState('environment') // back camera default

  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [facingMode])

  async function startCamera() {
    stopCamera()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        }
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

  async function handleCapture() {
    if (status === 'reading') return

    // Flash effect
    setFlash(true)
    setTimeout(() => setFlash(false), 150)

    setStatus('capturing')
    setStatusText('CAPTURING...')

    // Draw current video frame to canvas
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)

    // Convert to base64
    const base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1]

    setStatus('reading')
    setStatusText('CLAUDE IS READING...')

    try {
      const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_KEY

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
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: base64,
                }
              },
              {
                type: 'text',
                text: 'This is a comic book cover or back cover with a barcode. Extract all visible details. If you can see a barcode read the digits. Return ONLY a raw JSON object with no explanation, no markdown, no text before or after. Fields: title (string), issue (string), publisher (string), year (string), condition (CGC grade number like 9.2 estimated from visible wear), variant (true or false), purchasePrice (empty string), estimatedValue (string if price visible otherwise empty), notes (writer artist first appearance or other key details visible on cover).'
              }
            ]
          }]
        })
      })

      const data = await response.json()
      const text = data.content[0].text
      const cleaned = text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(cleaned)

      const formData = {
        title:          parsed.title          || '',
        issue:          parsed.issue          || '',
        publisher:      parsed.publisher      || '',
        year:           parsed.year           || '',
        condition:      parsed.condition      || '9.2',
        variant:        parsed.variant        || false,
        purchasePrice:  parsed.purchasePrice  || '',
        estimatedValue: parsed.estimatedValue || '',
        notes:          parsed.notes          || '',
      }

      setStatus('done')
      setStatusText('FIELDS FILLED')
      stopCamera()

      setTimeout(() => {
        onScanComplete(formData)
      }, 800)

    } catch (err) {
      console.error('[CameraScanner] Claude read failed:', err)
      setStatus('error')
      setStatusText('READ FAILED — TRY AGAIN')
      setTimeout(() => {
        setStatus('idle')
        setStatusText('FRAME THE COVER OR BARCODE')
      }, 2000)
    }
  }

  const isReading = status === 'reading'
  const isDone = status === 'done'
  const isError = status === 'error'

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#000',
      zIndex: 300,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Flash overlay */}
      {flash && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'white',
          zIndex: 400,
          pointerEvents: 'none',
        }} />
      )}

      {/* Video */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Top bar */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '3rem 1.5rem 1rem',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)',
      }}>
        <button
          onClick={() => { stopCamera(); onClose() }}
          style={{
            background: 'rgba(0,0,0,0.5)',
            border: '1px solid rgba(201,169,110,0.4)',
            borderRadius: '6px',
            color: 'var(--gold)',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '0.7rem',
            letterSpacing: '0.1em',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
          }}
        >
          CLOSE
        </button>

        <div style={{ textAlign: 'center' }}>
          <p style={{
            fontFamily: 'Syne, sans-serif',
            fontWeight: 800,
            fontSize: '1rem',
            color: 'var(--gold)',
            letterSpacing: '0.05em',
          }}>
            SCAN
          </p>
        </div>

        <button
          onClick={flipCamera}
          style={{
            background: 'rgba(0,0,0,0.5)',
            border: '1px solid rgba(201,169,110,0.4)',
            borderRadius: '6px',
            color: 'var(--gold)',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '0.7rem',
            letterSpacing: '0.1em',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
          }}
        >
          FLIP
        </button>
      </div>

      {/* Center frame guide */}
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: 5,
      }}>
        <div style={{
          width: '75%',
          aspectRatio: '2/3',
          position: 'relative',
          maxHeight: '70vh',
        }}>
          {/* Corner brackets */}
          {[
            { top: 0, left: 0, borderTop: '3px solid', borderLeft: '3px solid' },
            { top: 0, right: 0, borderTop: '3px solid', borderRight: '3px solid' },
            { bottom: 0, left: 0, borderBottom: '3px solid', borderLeft: '3px solid' },
            { bottom: 0, right: 0, borderBottom: '3px solid', borderRight: '3px solid' },
          ].map((style, i) => (
            <div key={i} style={{
              position: 'absolute',
              width: '28px',
              height: '28px',
              borderColor: isReading ? 'var(--gold)' : isDone ? 'var(--success)' : 'rgba(201,169,110,0.8)',
              transition: 'border-color 0.3s',
              ...style,
            }} />
          ))}

          {/* Scan line when reading */}
          {isReading && (
            <div style={{
              position: 'absolute',
              left: '5%',
              right: '5%',
              height: '2px',
              background: 'linear-gradient(90deg, transparent, var(--gold), transparent)',
              animation: 'scanline 1.5s ease-in-out infinite',
            }} />
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        marginTop: 'auto',
        padding: '1.5rem 1.5rem 3rem',
        background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.25rem',
      }}>
        {/* Status */}
        <p style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '0.65rem',
          letterSpacing: '0.15em',
          color: isDone ? 'var(--success)' : isError ? 'var(--red)' : 'var(--gold)',
          transition: 'color 0.3s',
        }}>
          {statusText}
        </p>

        {/* Capture button */}
        <button
          onClick={handleCapture}
          disabled={isReading || isDone}
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            border: `3px solid ${isDone ? 'var(--success)' : 'var(--gold)'}`,
            background: isReading
              ? 'rgba(201,169,110,0.2)'
              : isDone
              ? 'var(--success)'
              : 'rgba(201,169,110,0.15)',
            cursor: isReading || isDone ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s',
            backdropFilter: 'blur(4px)',
          }}
        >
          {isDone ? (
            <span style={{ fontSize: '1.75rem' }}>✓</span>
          ) : isReading ? (
            <div style={{
              width: '24px',
              height: '24px',
              border: '2px solid var(--gold)',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
          ) : (
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'var(--gold)',
            }} />
          )}
        </button>

        <p style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '0.55rem',
          color: 'rgba(255,255,255,0.4)',
          letterSpacing: '0.1em',
          textAlign: 'center',
        }}>
          COVER OR BARCODE
        </p>
      </div>

      <style>{`
        @keyframes scanline {
          0% { top: 10%; }
          50% { top: 85%; }
          100% { top: 10%; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
