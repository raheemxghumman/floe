import { useEffect, useState } from 'react'
import { ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react'
import { sendReset, signIn, signUp, usernameAvailable } from '../lib/account'

type Mode = 'signin' | 'signup' | 'reset'

export function AuthForm({ allowSignup = true, onDone }: { allowSignup?: boolean; onDone?: () => void }) {
  const [mode, setMode] = useState<Mode>('signin')
  const [identifier, setIdentifier] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [nameFree, setNameFree] = useState<boolean | null>(null)

  useEffect(() => {
    if (mode !== 'signup' || !/^[a-zA-Z0-9_]{3,20}$/.test(username)) { setNameFree(null); return }
    const t = window.setTimeout(() => void usernameAvailable(username).then(setNameFree), 350)
    return () => clearTimeout(t)
  }, [username, mode])

  const go = (m: Mode) => { setMode(m); setError(''); setNotice('') }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setError(''); setNotice('')
    try {
      if (mode === 'signin') { await signIn(identifier, password); onDone?.() }
      else if (mode === 'signup') {
        const needsConfirm = await signUp(email, username, password)
        if (needsConfirm) { setNotice(`Almost there! We sent a confirmation link to ${email}. Open it, then sign in here.`); setMode('signin'); setIdentifier(username) }
        else onDone?.()
      } else {
        await sendReset(email)
        setNotice('If that email has an account, a reset link is on its way.')
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      {mode !== 'reset' && allowSignup && (
        <div className="seg" style={{ ['--i' as string]: mode === 'signin' ? 0 : 1 }}>
          <span className="seg-ind" />
          <button type="button" className={mode === 'signin' ? 'on' : ''} onClick={() => go('signin')}>Sign in</button>
          <button type="button" className={mode === 'signup' ? 'on' : ''} onClick={() => go('signup')}>Create account</button>
        </div>
      )}
      {mode === 'reset' && <p className="auth-title">Reset your password</p>}

      {mode === 'signin' && (
        <label className="field">
          <span>Email or username</span>
          <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" required autoFocus />
        </label>
      )}
      {(mode === 'signup' || mode === 'reset') && (
        <label className="field">
          <span>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </label>
      )}
      {mode === 'signup' && (
        <label className="field">
          <span>Username {nameFree === true && <em className="ok">available</em>}{nameFree === false && <em className="bad">taken</em>}</span>
          <input value={username} onChange={(e) => setUsername(e.target.value.replace(/\s/g, ''))} autoComplete="username" required
            pattern="[a-zA-Z0-9_]{3,20}" title="3–20 letters, numbers or _" />
        </label>
      )}
      {mode !== 'reset' && (
        <label className="field">
          <span>Password</span>
          <span className="pw">
            <input type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={mode === 'signup' ? 8 : undefined} required />
            <button type="button" className="icon-btn ghost xs" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>
              {show ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </span>
        </label>
      )}

      {error && <p className="auth-msg bad">{error}</p>}
      {notice && <p className="auth-msg ok">{notice}</p>}

      <button className="btn auth-submit" disabled={busy || (mode === 'signup' && nameFree === false)}>
        {busy ? <Loader2 size={16} className="spin" /> : <>{mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'} <ArrowRight size={16} /></>}
      </button>

      <div className="auth-links">
        {mode === 'signin' && <button type="button" className="text-btn" onClick={() => go('reset')}>Forgot password?</button>}
        {mode === 'reset' && <button type="button" className="text-btn" onClick={() => go('signin')}>Back to sign in</button>}
      </div>
    </form>
  )
}
