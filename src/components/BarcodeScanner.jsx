import { useEffect, useRef, useState } from 'react'
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode'

/**
 * BarcodeScanner.jsx
 * Captures the full 17-digit comic barcode (12-digit UPC-A + 5-digit supplemental)
 * Props:
 *   onScanSuccess(rawCode: string) — called once on successful scan
 *   onClose() — called when user dismisses the scanner
 */
export default function BarcodeScanner({ onScanSuccess, onClose }) {
  const scannerRef = useRef(null)
  const [status, setStatus] = useState('ALIGN BARCODE WITHIN FRAME')
  const [error, setError] = useState(null)

  useEffect(() => {
    const config = {
      fps: 15,
      // Wide rectangle optimized for comic barcodes
      qrbox: { width: 320, height: 120 },
      aspectRatio: 1.777778,
      formatsToSupport: [
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.EAN_13,
      ],
      rememberLastUsedCamera: true,
      experimentalFeatures: {
        useBarCodeDetectorIfSupported: true,
      },
    }

    const scanner = new Html5QrcodeScanner('barcode-reader', config, false)
    scannerRef.current = scanner

    scanner.render(
      (decodedText) => {
        setStatus('SCANNED')
        scanner.clear()
        onScanSuccess(decodedText)
      },
      () => {
        // Suppress per-frame errors — scanner is still seeking
      }
    )

    return () => {
      scannerRef.current?.clear().catch(() => {})
    }
  }, [onScanSuccess])

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(14,14,13,0.96)',
      zIndex: 200,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
    }}>
      {/* Header */}
      <div style={{
        width: '100%',
        maxWidth: '420px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.25rem',
      }}>
        <div>
          <p style={{
            fontFamily: 'Syne, sans-serif',
            fontWeight: 800,
            fontSize: '1.1rem',
            color: 'var(--gold)',
            letterSpacing: '0.05em',
          }}>
            SCAN BARCODE
          </p>
          <p style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '0.6rem',
            color: 'var(--muted)',
            letterSpacing: '0.1em',
            marginTop: '0.2rem',
          }}>
            UPC + 5 DIGIT SUPPLEMENTAL
          </p>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'var(--surface2)',
            border: '1px solid #333',
            borderRadius: '6px',
            color: 'var(--muted)',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '0.7rem',
            padding: '0.4rem 0.75rem',
            cursor: 'pointer',
            letterSpacing: '0.05em',
          }}
        >
          CLOSE
        </button>
      </div>

      {/* Scanner window */}
      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: 'var(--surface)',
        border: '1px solid var(--gold)',
        borderRadius: '8px',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Corner accents */}
        {['topLeft', 'topRight', 'bottomLeft', 'bottomRight'].map(corner => (
          <div key={corner} style={{
            position: 'absolute',
            width: '20px',
            height: '20px',
            borderColor: 'var(--gold)',
            borderStyle: 'solid',
            borderWidth: corner.includes('top') ? '2px 0 0 0' : '0 0 2px 0',
            ...(corner.includes('Left') ? { left: 0, borderLeftWidth: '2px' } : { right: 0, borderRightWidth: '2px' }),
            ...(corner.includes('top') ? { top: 0 } : { bottom: 0 }),
            zIndex: 10,
          }} />
        ))}

        <div
          id="barcode-reader"
          style={{ width: '100%' }}
        />

        {/* Scan line animation */}
        <style>{`
          @keyframes scanline {
            0% { top: 20%; }
            50% { top: 75%; }
            100% { top: 20%; }
          }
          .scan-line {
            position: absolute;
            left: 10%;
            right: 10%;
            height: 2px;
            background: linear-gradient(90deg, transparent, #c9a96e, transparent);
            animation: scanline 2s ease-in-out infinite;
            pointer-events: none;
            z-index: 5;
          }
          /* Override html5-qrcode default styles to match vault theme */
          #barcode-reader video {
            border-radius: 0 !important;
          }
          #barcode-reader__scan_region {
            background: transparent !important;
          }
          #barcode-reader__dashboard {
            padding: 0.75rem 1rem !important;
            background: var(--surface) !important;
            border-top: 1px solid #2a2a27 !important;
          }
          #barcode-reader__dashboard_section_csr button,
          #barcode-reader__dashboard_section_swaplink {
            font-family: 'JetBrains Mono', monospace !important;
            font-size: 0.65rem !important;
            letter-spacing: 0.08em !important;
            background: var(--surface2) !important;
            color: var(--gold) !important;
            border: 1px solid #333 !important;
            border-radius: 4px !important;
            padding: 0.4rem 0.75rem !important;
            cursor: pointer !important;
          }
          #barcode-reader__header_message {
            display: none !important;
          }
          #barcode-reader__status_span {
            font-family: 'JetBrains Mono', monospace !important;
            font-size: 0.6rem !important;
            color: var(--muted) !important;
            letter-spacing: 0.1em !important;
          }
        `}</style>

        <div className="scan-line" />
      </div>

      {/* Status */}
      <div style={{
        marginTop: '1.25rem',
        textAlign: 'center',
      }}>
        <p style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '0.65rem',
          color: status === 'SCANNED' ? 'var(--success)' : 'var(--gold)',
          letterSpacing: '0.15em',
        }}>
          {status}
        </p>
        {error && (
          <p style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '0.6rem',
            color: 'var(--red)',
            marginTop: '0.5rem',
            letterSpacing: '0.1em',
          }}>
            {error}
          </p>
        )}
      </div>

      {/* Tip */}
      <div style={{
        marginTop: '1.5rem',
        background: 'var(--surface)',
        border: '1px solid #2a2a27',
        borderRadius: '6px',
        padding: '0.75rem 1rem',
        maxWidth: '420px',
        width: '100%',
      }}>
        <p style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '0.6rem',
          color: 'var(--muted)',
          letterSpacing: '0.08em',
          lineHeight: 1.6,
        }}>
          TIP: Hold the barcode at the bottom of the cover steady for 1 to 2 seconds. Make sure all 17 digits are inside the frame.
        </p>
      </div>
    </div>
  )
}
