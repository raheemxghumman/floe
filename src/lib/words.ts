const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function greeting(name: string, d: Date): [string, string] {
  const n = name.trim()
  const who = n ? `, ${n}` : ''
  const h = d.getHours()
  const day = d.getDay()
  const weekend = day === 0 || day === 6
  if (h < 5) return [`Burning the midnight oil${who}?`, 'Don’t forget to rest.']
  if (weekend && h >= 12) return [`Enjoying ${DAYS[day]}${who}?`, 'You’ve earned it!']
  if (h < 12) return [`Good morning${who}.`, day === 1 ? 'New week, fresh start.' : 'Let’s make today count.']
  if (h < 17) return [`Good afternoon${who}.`, day === 5 ? 'Almost the weekend. Finish strong.' : 'Keep the momentum going.']
  if (h < 21) return [`Good evening${who}.`, 'Time to wind down soon.']
  return [`Good night${who}.`, 'Tomorrow is a new page.']
}

export function pickQuote<T>(list: T[], rotateMins: number, now: number): T | undefined {
  if (!list.length) return undefined
  // rotate=0 → new quote on each page load
  const slot = rotateMins > 0 ? Math.floor(now / (rotateMins * 60_000)) : bootSeed
  // multiplicative hash so consecutive slots land far apart in the list
  return list[Math.abs(Math.imul(slot, 2654435761)) % list.length]
}
const bootSeed = Math.floor(Math.random() * 100000)
