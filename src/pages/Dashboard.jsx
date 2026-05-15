import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'

export default function Dashboard() {
  const [comics, setComics] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('longbox_comics') || '[]')
    setComics(stored)
  }, [])

  const totalValue = comics.reduce((sum, c) => sum + (parseFloat(c.estimatedValue) || 0), 0)
  const totalPaid = comics.reduce((sum, c) => sum + (parseFloat(c.purchasePrice) || 0), 0)
  const gain = totalValue - totalPaid
  const publishers = [...new Set(comics.map(c => c.publisher).filter(Boolean))]
  const topComic = comics.sort((a, b) => (parseFloat(b.estimatedValue) || 0) - (parseFloat(a.estimatedValue) || 0))[0]

  const statCard = (label, value, color) => (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid #2a2a27',
      borderRadius: '8px',
      padding: '1rem',
    }}>
      <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.6rem', color: 'var(--muted)', marginBottom: '0.35rem', letterSpacing: '0.1em' }}>{label}</p>
      <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.3rem', color: color || 'var(--text)' }}>{value}</p>
    </div>
  )

  return (
    <AppShell>
      <div style={{ padding: '1.5rem' }}>

        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{
            fontFamily: 'Syne, sans-serif',
            fontWeight: 800,
            fontSize: '1.4rem',
            color: 'var(--gold)',
            letterSpacing: '0.05em',
          }}>
            ROBERT'S VAULT
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

        {comics.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</p>
            <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: 'var(--muted)', fontSize: '1rem', marginBottom: '0.5rem' }}>
              VAULT IS EMPTY
            </p>
            <p style={{ fontFamily: 'Inter, sans-serif', color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Start adding comics to see your collection stats here.
            </p>
            <button
              onClick={() => navigate('/add')}
              style={{
                background: 'var(--gold)',
                color: 'var(--ink)',
                border: 'none',
                borderRadius: '6px',
                padding: '0.75rem 1.5rem',
                fontFamily: 'Syne, sans-serif',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              ADD FIRST COMIC
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              {statCard('TOTAL VALUE', `$${totalValue.toLocaleString()}`, 'var(--success)')}
              {statCard('TOTAL PAID', `$${totalPaid.toLocaleString()}`, 'var(--gold)')}
              {statCard('GAIN', `${gain >= 0 ? '+' : ''}$${gain.toLocaleString()}`, gain >= 0 ? 'var(--success)' : 'var(--red)')}
              {statCard('TOTAL COMICS', comics.length, 'var(--text)')}
            </div>

            {topComic && (
              <div style={{
                background: 'var(--surface)',
                border: '1px solid var(--gold)',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1rem',
              }}>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.6rem', color: 'var(--gold)', marginBottom: '0.5rem', letterSpacing: '0.1em' }}>TOP VALUED COMIC</p>
                <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>
                  {topComic.title} {topComic.issue && `#${topComic.issue}`}
                </p>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.65rem', color: 'var(--success)', marginTop: '0.25rem' }}>
                  ${topComic.estimatedValue}
                </p>
              </div>
            )}

            {publishers.length > 0 && (
              <div style={{
                background: 'var(--surface)',
                border: '1px solid #2a2a27',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1rem',
              }}>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.6rem', color: 'var(--muted)', marginBottom: '0.75rem', letterSpacing: '0.1em' }}>PUBLISHERS IN VAULT</p>
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

            <button
              onClick={() => navigate('/add')}
              style={{
                width: '100%',
                background: 'var(--surface2)',
                border: '1px solid var(--gold)',
                borderRadius: '8px',
                padding: '0.85rem',
                fontFamily: 'Syne, sans-serif',
                fontWeight: 700,
                fontSize: '0.9rem',
                color: 'var(--gold)',
                cursor: 'pointer',
                letterSpacing: '0.05em',
              }}
            >
              ADD ANOTHER COMIC
            </button>
          </>
        )}

      </div>
    </AppShell>
  )
}