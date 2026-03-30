// src/components/Auth.tsx
import React, { useState } from 'react'
import { auth, MeResponse } from '../api'

interface Props {
  onLogin: (user: MeResponse) => void
}

export default function Auth({ onLogin }: Props) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const user = isSignUp
        ? await auth.signup(email, password)
        : await auth.login(email, password)
      onLogin(user)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Masthead */}
        <div style={styles.masthead}>
          <span style={styles.rule} />
          <h1 style={styles.wordmark}>WriteOnce</h1>
          <span style={styles.rule} />
        </div>
        <p style={styles.tagline}>Blog engine · IR-first</p>

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoFocus
          />

          <label style={styles.label} style2={{ marginTop: '0.9rem' }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{ marginTop: '0.9rem' }}
          />

          {error && (
            <div className="status-bar err" style={{ marginTop: '0.8rem' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ marginTop: '1.2rem', width: '100%' }}
          >
            {loading ? 'Working…' : isSignUp ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <button
          className="btn-ghost"
          onClick={() => { setIsSignUp(v => !v); setError(null) }}
          style={{ marginTop: '0.8rem', width: '100%' }}
        >
          {isSignUp ? 'Already have an account? Sign in' : 'No account? Sign up'}
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--paper)',
    padding: '2rem',
  },
  card: {
    width: '100%',
    maxWidth: '360px',
    background: '#fff',
    border: '1px solid var(--paper-dark)',
    borderRadius: '4px',
    padding: '2.5rem 2rem',
    boxShadow: 'var(--shadow)',
  },
  masthead: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.8rem',
    marginBottom: '0.3rem',
  },
  wordmark: {
    fontFamily: 'var(--display)',
    fontSize: '1.6rem',
    fontWeight: 600,
    letterSpacing: '-0.01em',
    whiteSpace: 'nowrap',
    color: 'var(--ink)',
  },
  rule: {
    flex: 1,
    display: 'block',
    height: '1px',
    background: 'var(--paper-dark)',
  },
  tagline: {
    fontFamily: 'var(--mono)',
    fontSize: '0.68rem',
    letterSpacing: '0.1em',
    color: 'var(--ink-light)',
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: '1.8rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    fontFamily: 'var(--mono)',
    fontSize: '0.7rem',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--ink-light)',
    marginBottom: '0.35rem',
  },
}
