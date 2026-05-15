import { useState, useEffect } from 'react'
import AppShell from '../components/layout/AppShell'
import { supabase } from '../services/supabaseClient'

export default function Export() {
  const [comics, setComics] = useState([])
  const [exported, setExported] = useState(false)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.from('comics').select('*')
      if (error) console.error('Export load error:', error)
      else setComics(data.map(c => ({
        ...c,
        purchasePrice: c.purchase_price,
        estimatedValue: c.estimated_value,
      })))
    }
    load()
  }, [])

  function downloadCSV() {
    if (comics.length === 0) {
      alert('No comics in collection yet.')
      return
    }

    const headers = ['Title', 'Issue', 'Publisher', 'Year', 'Condition', 'Variant', 'Purchase Price', 'Estimated Value', 'Notes']
    const rows = comics.map(c => [
      c.title || '',
      c.issue || '',
      c.publisher || '',
      c.year || '',
      c.condition || '',
      c.variant ? 'Yes' : 'No',
      c.purchasePrice || '',
      c.estimatedValue || '',
      c.notes || '',
    ])

    const csv = [headers, ...rows]
      .map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `roberts-vault-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setExported(true)
    setTimeout(() => setExported(false), 3000)
  }

  const totalValue = comics.reduce((sum, c) => sum + (parseFloat(c.estimatedValue) || 0), 0)
  const totalPaid = comics.reduce((sum, c) => sum + (parseFloat(c.purchasePrice) || 0), 0)
  const gain = totalValue - totalPaid
  const publishers = [...new Set(comics.map(c => c.publisher).filter(Boolean))]

  return (
    <AppShell>
      <div style={{ padding: '1.5rem', maxWidth: '600px', margin: '0 auto' }}>

        <h2 style={{
          fontFamily: 'Syne, sans-serif',
          fontWeight: 800,
          fontSize: '1.4rem',
          color: 'var(--gold)',
          marginBottom: '1.5rem',
          letterSpacing: '0.05em',
        }}>
          EXPORT
        </h2>

        <div style={{
          background: 'var(--surface)',
          border: '1px solid #2a2a27',
          borderRadius: '8px',
          padding: '1.25rem',
          marginBottom: '1.5rem',
        }}>
          <p style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '0.65rem',
            color: 'var(--muted)',
            letterSpacing: '0.1em',
            marginBottom: '1rem',
          }}>
            COLLECTION SUMMARY
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.6rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>TOTAL COMICS</p>
              <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.5rem', color: 'var(--text)' }}>{comics.length}</p>
            </div>
            <div>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.6rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>TOTAL VALUE</p>
              <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.5rem', color: 'var(--success)' }}>${totalValue.toLocaleString()}</p>
            </div>
            <div>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.6rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>TOTAL PAID</p>
              <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.5rem', color: 'var(--gold)' }}>${totalPaid.toLocaleString()}</p>
            </div>
            <div>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.6rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>GAIN</p>
              <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.5rem', color: gain >= 0 ? 'var(--success)' : 'var(--red)' }}>
                {gain >= 0 ? '+' : ''}${gain.toLocaleString()}
              </p>
            </div>
          </div>

          {publishers.length > 0 && (
            <div>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.6rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>PUBLISHERS</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {publishers.map(pub => (
                  <span key={pub} style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '0.6rem',
                    color: 'var(--gold)',
                    background: 'var(--surface2)',
                    border: '1px solid #333',
                    borderRadius: '4px',
                    padding: '0.2rem 0.5rem',
                  }}>
                    {pub}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={downloadCSV}
          style={{
            width: '100%',
            background: exported ? 'var(--success)' : 'var(--gold)',
            color: 'var(--ink)',
            border: 'none',
            borderRadius: '8px',
            padding: '1rem',
            fontFamily: 'Syne, sans-serif',
            fontWeight: 700,
            fontSize: '1rem',
            letterSpacing: '0.05em',
            cursor: 'pointer',
            transition: 'background 0.3s',
            marginBottom: '1rem',
          }}
        >
          {exported ? 'DOWNLOADED' : 'DOWNLOAD CSV'}
        </button>

        <p style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '0.6rem',
          color: 'var(--muted)',
          textAlign: 'center',
          lineHeight: 1.6,
        }}>
          CSV includes all fields and opens in Excel, Google Sheets, or any spreadsheet app.
        </p>

      </div>
    </AppShell>
  )
}