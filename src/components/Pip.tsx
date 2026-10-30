import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Pause, PictureInPicture2, Play, SkipForward } from 'lucide-react'
import { fmtTimer, MODE_LABEL, useStore } from '../store'
import { useSession } from './clocks'

interface DocPip { requestWindow(o: { width: number; height: number }): Promise<Window>; window: Window | null }
const docPip = () => (window as unknown as { documentPictureInPicture?: DocPip }).documentPictureInPicture

/** Chrome and Edge only: an always-on-top mini window with the timer. */
export const pipSupported = () => !!docPip()

function PipTimer() {
  const { timer, left, progress, stopwatch } = useSession()
  const task = useStore((s) => s.tasks.find((t) => t.id === s.activeTaskId))
  const showTask = useStore((s) => s.settings.timer.pipTask)
  const { toggle, skip } = useStore.getState()
  return (
    <div className={`pip mode-${timer.mode}`}>
      <div className="pip-top"><span>{stopwatch ? 'Stopwatch' : MODE_LABEL[timer.mode]}</span><span className="pip-logo">floe</span></div>
      <div className="pip-time">{fmtTimer(left)}</div>
      {showTask && task && <div className="pip-task">{task.text}</div>}
      <div className="pip-bar"><div style={{ width: `${progress * 100}%` }} /></div>
      <div className="pip-ctrl">
        <button onClick={toggle} aria-label={timer.running ? 'Pause' : 'Start'}>{timer.running ? <Pause size={16} /> : <Play size={16} />}</button>
        <button onClick={skip} aria-label="Skip"><SkipForward size={16} /></button>
      </div>
    </div>
  )
}

export function PipButton() {
  const [win, setWin] = useState<Window | null>(null)
  useEffect(() => () => { win?.close() }, [win])
  if (!pipSupported()) return null

  const open = async () => {
    const pip = docPip()!
    const w = await pip.requestWindow({ width: 300, height: 190 })
    // copy our styles (and Google Fonts links) into the new window
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        const style = w.document.createElement('style')
        style.textContent = Array.from(sheet.cssRules).map((r) => r.cssText).join('\n')
        w.document.head.appendChild(style)
      } catch {
        if (sheet.href) { const l = w.document.createElement('link'); l.rel = 'stylesheet'; l.href = sheet.href; w.document.head.appendChild(l) }
      }
    }
    w.document.body.className = 'pip-body'
    w.addEventListener('pagehide', () => setWin(null))
    setWin(w)
  }

  return (
    <>
      <button className={`icon-btn glass ${win ? 'on' : ''}`} onClick={() => (win ? win.close() : void open())} aria-label="Picture-in-picture timer" data-tip="Floating timer">
        <PictureInPicture2 size={18} />
      </button>
      {win && createPortal(<PipTimer />, win.document.body)}
    </>
  )
}
