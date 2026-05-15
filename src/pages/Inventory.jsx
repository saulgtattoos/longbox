import { useState, useEffect } from 'react'
import AppShell from '../components/layout/AppShell'

export default function Inventory() {
  const [comics, setComics] = useState([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('longbox_comics') || '[]')
    setComics(stored)
  }, [])

  const filtered = comics.filter(c =>
    c.title?.toLowerCase().includes(search.toLowerCase()) ||
    c.publisher?.toLowerCase().includes(search.toLowerCase()) ||
    c.issue?.toString().includes(search)
  )

  const totalValue = comics.reduce((sum, c) => sum + (parseFloat(c.estimatedValue) || 0), 0)
  const totalPaid = comics.reduce((sum, c) => sum + (parseFloat(c.purchasePrice) || 0), 0)

  const conditionColor = (condition) => {
    const val = parseFloat(condition)
    if (val >= 9.0) return 'var(--success)'
    if (val >= 7.0) return 'var(--gold)'
    if (val >= 4.0) return '#c0832b'
    return 'var(--red)'
  }

  return (
    <AppShell>
      <div style={{ padding: '1.5rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{
            fontFamily: 'Syne, sans-serif',
            fontWeight: 800,
            fontSize: '1.4rem',
            color: 'var(--gold)',
            letterSpacing: '0.05em',
          }}>
            INVENTORY
          </h2>
          <p style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '0.65rem',
            color: 'var(--muted)',
            marginTop: '0.25rem',
          }}>
            {comics.length} COMICS IN COLLECTION
          </p>
        </div>

        {/* Stats Row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}>
          <div style={{
            background: 'var(--surface)',
            border: '1px solid #333',
            borderRadius: '8px',
            padding: '1rem',
          }}>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.6rem', color: 'var(--muted)', marginBottom: '0.35rem' }}>TOTAL VALUE</p>
            <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.3rem', color: 'var(--success)' }}>
              ${totalValue.toLocaleString()}
            </p>
          </div>
          <div style={{
            background: 'var(--surface)',
            border: '1px solid #333',
            borderRadius: '8px',
            padding: '1rem',
          }}>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.6rem', color: 'var(--muted)', marginBottom: '0.35rem' }}>TOTAL PAID</p>
            <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.3rem', color: 'var(--gold)' }}>
              ${totalPaid.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search by title, publisher, issue..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%',
            background: 'var(--surface2)',
            border: '1px solid #333',
            borderRadius: '6px',
            padding: '0.65rem 0.75rem',
            color: 'var(--text)',
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.9rem',
            outline: 'none',
            marginBottom: '1.5rem',
          }}
        />

        {/* Empty State */}
        {comics.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</p>
            <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: 'var(--muted)', fontSize: '1rem' }}>
              NO COMICS YET
            </p>
            <p style={{ fontFamily: 'Inter, sans-serif', color: 'var(--muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
              Add your first comic using the + tab below
            </p>
          </div>
        )}

        {/* Comic Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filtered.map(comic => (
            <div
              key={comic.id}
              style={{
                background: 'var(--surface)',
                border: '1px solid #2a2a27',
                borderRadius: '8px',
                padding: '1rem',
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: '0.5rem',
                alignItems: 'start',
              }}
            >
              <div>
                <p style={{
                  fontFamily: 'Syne, sans-serif',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  color: 'var(--text)',
                  marginBottom: '0.25rem',
                }}>
                  {comic.title} {comic.issue && `#${comic.issue}`}
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {comic.publisher && (
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.6rem', color: 'var(--muted)' }}>
                      {comic.publisher}
                    </span>
                  )}
                  {comic.year && (
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.6rem', color: 'var(--muted)' }}>
                      {comic.year}
                    </span>
                  )}
                  {comic.variant && (
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.6rem', color: 'var(--gold)' }}>
                      VARIANT
                    </span>
                  )}
                </div>
                {comic.notes && (
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.4rem' }}>
                    {comic.notes}
                  </p>
                )}
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: conditionColor(comic.condition),
                  marginBottom: '0.35rem',
                }}>
                  {comic.condition}
                </div>
                {comic.estimatedValue && (
                  <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: 'var(--success)' }}>
                    ${comic.estimatedValue}
                  </div>
                )}
                {comic.purchasePrice && (
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.6rem', color: 'var(--muted)' }}>
                    paid ${comic.purchasePrice}
                  </div>
                )}
              </div>

            </div>
          ))}
        </div>

      </div>
    </AppShell>
  )
}