import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import { supabase } from '../services/supabaseClient'

export default function Inventory() {
  const [comics, setComics] = useState([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [valueLookup, setValueLookup] = useState({})
  const navigate = useNavigate()

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data, error } = await supabase.from('comics').select('*').order('id', { ascending: false })
    if (error) console.error('Load error:', error)
    else setComics(data.map(c => ({
      ...c,
      purchasePrice: c.purchase_price,
      estimatedValue: c.estimated_value,
    })))
  }

  async function deleteComic(id) {
    await supabase.from('comics').delete().eq('id', id)
    setComics(prev => prev.filter(c => c.id !== id))
    setSelected(null)
    setDeleteTarget(null)
  }

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

        {deleteTarget && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
          }}>
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--red)',
              borderRadius: '8px',
              padding: '1.5rem',
              maxWidth: '340px',
              width: '100%',
            }}>
              <p style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '0.6rem',
                color: 'var(--red)',
                letterSpacing: '0.1em',
                marginBottom: '0.75rem',
              }}>
                DELETE COMIC
              </p>
              <p style={{
                fontFamily: 'Syne, sans-serif',
                fontWeight: 700,
                fontSize: '1rem',
                color: 'var(--text)',
                marginBottom: '0.5rem',
              }}>
                {deleteTarget.title} {deleteTarget.issue && `#${deleteTarget.issue}`}
              </p>
              <p style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.85rem',
                color: 'var(--muted)',
                marginBottom: '1.5rem',
                lineHeight: 1.5,
              }}>
                This will permanently remove this comic from your vault. This cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => setDeleteTarget(null)}
                  style={{
                    flex: 1,
                    background: 'var(--surface2)',
                    color: 'var(--text)',
                    border: '1px solid #333',
                    borderRadius: '6px',
                    padding: '0.65rem',
                    fontFamily: 'Syne, sans-serif',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  CANCEL
                </button>
                <button
                  onClick={() => deleteComic(deleteTarget.id)}
                  style={{
                    flex: 1,
                    background: 'var(--red)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.65rem',
                    fontFamily: 'Syne, sans-serif',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  DELETE
                </button>
              </div>
            </div>
          </div>
        )}

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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filtered.map(comic => (
            <div
              key={comic.id}
              onClick={() => setSelected(selected?.id === comic.id ? null : comic)}
              style={{
                background: selected?.id === comic.id ? 'var(--surface2)' : 'var(--surface)',
                border: `1px solid ${selected?.id === comic.id ? 'var(--gold)' : '#2a2a27'}`,
                borderRadius: '8px',
                padding: '1rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem', alignItems: 'start' }}>
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

              {selected?.id === comic.id && (
                <div style={{
                  display: 'flex',
                  gap: '0.75rem',
                  marginTop: '1rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid #333',
                }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate('/add', { state: { comic } })
                    }}
                    style={{
                      flex: 1,
                      background: 'var(--gold)',
                      color: 'var(--ink)',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.6rem',
                      fontFamily: 'Syne, sans-serif',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                    }}
                  >
                    EDIT
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteTarget(comic)
                    }}
                    style={{
                      flex: 1,
                      background: 'var(--red)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.6rem',
                      fontFamily: 'Syne, sans-serif',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                    }}
                  >
                    DELETE
                  </button>
                  <button
  onClick={async (e) => {
    e.stopPropagation()
    setValueLookup(prev => ({ ...prev, [comic.id]: 'loading' }))
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 500,
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          messages: [{
            role: 'user',
            content: `Search eBay sold listings and comic price guides for the current market value of: ${comic.title} #${comic.issue} ${comic.publisher} ${comic.year} in condition ${comic.condition}. Return a single sentence with the estimated current market value range based on recent sales.`
          }]
        })
      })
      const data = await response.json()
      const text = data.content.filter(b => b.type === 'text').map(b => b.text).join(' ')
      setValueLookup(prev => ({ ...prev, [comic.id]: text || 'No data found' }))
    } catch (err) {
      setValueLookup(prev => ({ ...prev, [comic.id]: 'Lookup failed' }))
    }
  }}
  style={{
    width: '100%',
    background: 'var(--surface)',
    color: 'var(--gold)',
    border: '1px solid var(--gold)',
    borderRadius: '6px',
    padding: '0.6rem',
    fontFamily: 'Syne, sans-serif',
    fontWeight: 700,
    fontSize: '0.8rem',
    cursor: 'pointer',
  }}
>
  {valueLookup[comic.id] === 'loading' ? 'SEARCHING...' : 'GET CURRENT VALUE'}
</button>
{valueLookup[comic.id] && valueLookup[comic.id] !== 'loading' && (
  <div style={{
    width: '100%',
    background: 'var(--surface2)',
    border: '1px solid #333',
    borderRadius: '6px',
    padding: '0.75rem',
  }}>
    <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.6rem', color: 'var(--muted)', marginBottom: '0.35rem', letterSpacing: '0.1em' }}>CURRENT MARKET VALUE</p>
    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', color: 'var(--success)', lineHeight: 1.5 }}>{valueLookup[comic.id]}</p>
  </div>
)}
                </div>
              )}
            </div>
          ))}
        </div>

      </div>
    </AppShell>
  )
}