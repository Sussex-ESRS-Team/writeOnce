// src/components/App.tsx
import { useEffect, useState } from 'react'
import Auth from './Auth'
import Editor from './Editor'
import { auth, MeResponse } from '../api'

type AppState =
  | { stage: 'loading' }
  | { stage: 'auth' }
  | { stage: 'app'; user: MeResponse }

export default function App() {
  const [state, setState] = useState<AppState>({ stage: 'loading' })

  // On mount, check for an existing session
  useEffect(() => {
    auth.me()
      .then(user => setState({ stage: 'app', user }))
      .catch(() => setState({ stage: 'auth' }))
  }, [])

  if (state.stage === 'loading') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', fontFamily: 'var(--mono)', fontSize: '0.8rem',
        color: 'var(--ink-light)',
      }}>
        Loading…
      </div>
    )
  }

  if (state.stage === 'auth') {
    return (
      <Auth
        onLogin={user => setState({ stage: 'app', user })}
      />
    )
  }

  return (
    <Editor
      userId={state.user.id}
      userEmail={state.user.email}
      onLogout={async () => {
        await auth.logout().catch(() => {})
        setState({ stage: 'auth' })
      }}
    />
  )
}
