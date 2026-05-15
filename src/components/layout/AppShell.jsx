import { Link, useLocation } from 'react-router-dom'

const navItems = [
  { path: '/', label: 'Dashboard', icon: '⊞' },
  { path: '/inventory', label: 'Inventory', icon: '📦' },
  { path: '/add', label: 'Add Comic', icon: '+' },
  { path: '/export', label: 'Export', icon: '↗' },
]

export default function AppShell({ children }) {
  const location = useLocation()

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
    }}>

      {/* Header */}
      <header style={{
        background: 'var(--surface)',
        borderBottom: '2px solid var(--gold)',
        padding: '1rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <h1 style={{
            fontFamily: 'Syne, sans-serif',
            fontWeight: 800,
            fontSize: '1.5rem',
            color: 'var(--gold)',
            letterSpacing: '0.1em',
          }}>
            ROBERT'S VAULT
          </h1>
          <p style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '0.6rem',
            color: 'var(--muted)',
            letterSpacing: '0.15em',
          }}>
            COMIC INVENTORY SYSTEM
          </p>
        </div>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '0.7rem',
          color: 'var(--muted)',
        }}>
          v1.0
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        flex: 1,
        overflowY: 'auto',
        paddingBottom: '5rem',
      }}>
        {children}
      </main>

      {/* Bottom Nav */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'var(--surface)',
        borderTop: '2px solid var(--gold)',
        display: 'flex',
        justifyContent: 'space-around',
        padding: '0.75rem 0',
        zIndex: 100,
      }}>
        {navItems.map(item => {
          const active = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.25rem',
                textDecoration: 'none',
                color: active ? 'var(--gold)' : 'var(--muted)',
                transition: 'color 0.2s',
              }}
            >
              <span style={{ fontSize: '1.25rem' }}>{item.icon}</span>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '0.6rem',
                letterSpacing: '0.1em',
              }}>
                {item.label.toUpperCase()}
              </span>
            </Link>
          )
        })}
      </nav>

    </div>
  )
}