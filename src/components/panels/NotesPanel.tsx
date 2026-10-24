import { useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useNow, useStore } from '../../store'
import { FloatingPanel } from './FloatingPanel'

function ago(ms: number) {
  const s = Math.round(ms / 1000)
  if (s < 10) return 'just now'
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export function NotesPanel() {
  const notes = useStore((s) => s.notes)
  const activeId = useStore((s) => s.activeNoteId)
  const { addNote, updateNote, removeNote, setActiveNote } = useStore.getState()
  const minute = useNow((s) => Math.floor(s.now / 10_000))
  const note = notes.find((n) => n.id === activeId) ?? notes[0]

  useEffect(() => {
    // read live state: StrictMode runs this twice and the closure would still see 0 notes
    if (!useStore.getState().notes.length) addNote()
  }, [notes.length, addNote])

  const titleOf = (body: string) => body.split('\n')[0].trim().slice(0, 24) || 'Untitled'

  return (
    <FloatingPanel
      id="notes"
      width={360}
      left={24 + 340 + 16}
      title="Notes"
      actions={<button className="icon-btn ghost xs" onClick={addNote} aria-label="New note"><Plus size={15} /></button>}
    >
      {notes.length > 1 && (
        <div className="note-tabs">
          {notes.map((n) => (
            <button key={n.id} className={n.id === note?.id ? 'on' : ''} onClick={() => setActiveNote(n.id)}>{titleOf(n.body)}</button>
          ))}
        </div>
      )}
      {note && (
        <>
          <textarea
            className="note-area"
            value={note.body}
            placeholder={'Brain dump, ideas, links…\nFirst line becomes the title.'}
            onChange={(e) => updateNote(note.id, e.target.value)}
          />
          <div className="note-foot">
            <span className="muted" data-tick={minute}>
              {note.body.trim() ? `${note.body.trim().split(/\s+/).length} words · saved ${ago(Date.now() - note.updatedAt)}` : 'Autosaves as you type'}
            </span>
            <button className="icon-btn ghost xs" onClick={() => removeNote(note.id)} aria-label="Delete note"><Trash2 size={14} /></button>
          </div>
        </>
      )}
    </FloatingPanel>
  )
}
