import { useState } from 'react'
import { ArrowLeft, Mail, Send } from 'lucide-react'
import { AuthForm } from './AuthForm'
import { accessRequestMessage, mailtoLink, OWNER_EMAIL, prettyWhatsApp, whatsappLink, type AccessRequest } from '../lib/owner'

export function WhatsAppGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .2-1.2c-.1-.1-.3-.2-.5-.3Z" />
    </svg>
  )
}

function RequestForm({ onBack }: { onBack: () => void }) {
  const [r, setR] = useState<AccessRequest>({ name: '', email: '', username: '', about: '' })
  const set = (k: keyof AccessRequest) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setR({ ...r, [k]: e.target.value })
  const ready = r.name.trim().length > 1 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email.trim())
  const message = accessRequestMessage(r)

  return (
    <form className="req-form" onSubmit={(e) => { e.preventDefault(); if (ready) window.open(whatsappLink(message), '_blank', 'noopener') }}>
      <button type="button" className="text-btn req-back" onClick={onBack}><ArrowLeft size={14} /> Back to sign in</button>
      <div>
        <h2 className="gate-title">Ask for an account</h2>
        <p className="muted small">Tell the owner a little about you. We’ll open WhatsApp with everything written out, so you just tap send.</p>
      </div>
      <label className="field"><span>Your name</span><input value={r.name} onChange={set('name')} required autoFocus maxLength={60} /></label>
      <label className="field"><span>Email</span><input type="email" value={r.email} onChange={set('email')} required maxLength={120} /></label>
      <label className="field"><span>Preferred username <em className="muted">optional</em></span>
        <input value={r.username} onChange={(e) => setR({ ...r, username: e.target.value.replace(/\s/g, '') })} maxLength={20} />
      </label>
      <label className="field"><span>What will you use floe for? <em className="muted">optional</em></span>
        <textarea value={r.about} onChange={set('about')} rows={2} maxLength={240} placeholder="e.g. studying for exams, deep work at my job" />
      </label>
      {ready && (
        <div className="req-preview" aria-label="Message preview">
          <span className="muted small">Message preview</span>
          <pre>{message}</pre>
        </div>
      )}
      <button className="btn wa req-send" disabled={!ready}><WhatsAppGlyph size={18} /> Send request on WhatsApp</button>
      <a className={`btn ghost req-mail ${ready ? '' : 'disabled'}`} href={ready ? mailtoLink('floe focus access request', message) : undefined} aria-disabled={!ready}>
        <Mail size={15} /> Email it instead
      </a>
    </form>
  )
}

/** Shown on /app until someone signs in. Everything (including the trial of the timer) sits behind an account. */
export function AuthGate() {
  const [mode, setMode] = useState<'auth' | 'request'>('auth')
  return (
    <div className="gate">
      <div className="gate-brand">
        <a href="/" className="gate-logo">floe</a>
        <p>A quiet room for loud minds.</p>
      </div>
      <div className="gate-card" key={mode}>
        {mode === 'auth' ? (
          <>
            <div>
              <h2 className="gate-title">Welcome back</h2>
              <p className="muted small">Sign in with your email or username. Your tasks, notes, themes and stats follow you everywhere.</p>
            </div>
            <AuthForm />
            <div className="gate-sep"><span>No account yet?</span></div>
            <button className="btn wa gate-ask" onClick={() => setMode('request')}>
              <WhatsAppGlyph size={18} /> Ask the owner for an account
            </button>
          </>
        ) : (
          <RequestForm onBack={() => setMode('auth')} />
        )}
        <p className="gate-contact muted small">
          Owner: <a href={`mailto:${OWNER_EMAIL}`}>{OWNER_EMAIL}</a> · WhatsApp <a href={whatsappLink('Hi! I have a question about floe focus.')} target="_blank" rel="noreferrer">{prettyWhatsApp()}</a>
        </p>
      </div>
      <p className="gate-foot muted small"><Send size={12} /> Accounts are free. Everything syncs across your devices.</p>
    </div>
  )
}
