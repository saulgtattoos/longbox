import AppShell from '../components/layout/AppShell'

export default function Dashboard() {
  return (
    <AppShell>
      <div style={{ padding: '1.5rem', color: 'var(--text)' }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', color: 'var(--gold)' }}>
          Dashboard
        </h1>
      </div>
    </AppShell>
  )
}