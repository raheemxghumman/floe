// How people reach the owner for an account or Spotify access. Override per deployment via env.
export const OWNER_NAME = (import.meta.env.VITE_OWNER_NAME as string | undefined)?.trim() || 'Raheem'
export const OWNER_EMAIL = (import.meta.env.VITE_OWNER_EMAIL as string | undefined)?.trim() || 'raheemxghumman@gmail.com'
/** International format, digits only (wa.me requires no "+", spaces or dashes). */
export const OWNER_WHATSAPP = ((import.meta.env.VITE_OWNER_WHATSAPP as string | undefined)?.trim() || '923368886124').replace(/\D/g, '')

export const SITE_URL = () => `${window.location.origin}/app`

export const prettyWhatsApp = () => `+${OWNER_WHATSAPP.slice(0, 2)} ${OWNER_WHATSAPP.slice(2, 5)} ${OWNER_WHATSAPP.slice(5)}`

export function whatsappLink(message: string) {
  return `https://wa.me/${OWNER_WHATSAPP}?text=${encodeURIComponent(message)}`
}

export function mailtoLink(subject: string, body: string) {
  return `mailto:${OWNER_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

export interface AccessRequest { name: string; email: string; username: string; about: string }

export function accessRequestMessage(r: AccessRequest) {
  const lines = [
    `Hi ${OWNER_NAME}! 👋 I'd like access to floe focus (${SITE_URL()}).`,
    '',
    `Name: ${r.name.trim()}`,
    `Email: ${r.email.trim()}`,
  ]
  if (r.username.trim()) lines.push(`Preferred username: ${r.username.trim()}`)
  if (r.about.trim()) lines.push(`About me: ${r.about.trim()}`)
  lines.push('', 'Thank you!')
  return lines.join('\n')
}

export function spotifyAccessMessage(name: string, username: string) {
  return [
    `Hi ${OWNER_NAME}! 🎧 Could you enable Spotify for my floe focus account?`,
    '',
    `floe username: ${username || '-'}`,
    `Name: ${name || '-'}`,
    'Spotify account email: (please fill in)',
  ].join('\n')
}
