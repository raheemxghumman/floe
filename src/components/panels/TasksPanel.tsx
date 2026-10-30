import { useState } from 'react'
import { Check, Target, Timer, Trash2 } from 'lucide-react'
import { useStore } from '../../store'
import { FloatingPanel } from './FloatingPanel'

export function TasksPanel() {
  const tasks = useStore((s) => s.tasks)
  const activeId = useStore((s) => s.activeTaskId)
  const { addTask, toggleTask, removeTask, editTask, setActiveTask, clearDone, setTaskEst } = useStore.getState()
  const eta = useStore((s) => s.settings.timer.taskEta)
  const [text, setText] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const done = tasks.filter((t) => t.done).length
  const ordered = [...tasks.filter((t) => !t.done), ...tasks.filter((t) => t.done)]

  return (
    <FloatingPanel
      id="tasks"
      width={340}
      left={24}
      title={<>Tasks <span className="muted">{done}/{tasks.length}</span></>}
      actions={done > 0 && <button className="text-btn" onClick={clearDone}>Clear done</button>}
    >
      <form className="task-add" onSubmit={(e) => { e.preventDefault(); addTask(text); setText('') }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a task and press Enter" maxLength={140} />
      </form>
      {tasks.length > 0 && (
        <div className="task-meter"><div style={{ transform: `scaleX(${tasks.length ? done / tasks.length : 0})` }} /></div>
      )}
      <ul className="task-list">
        {ordered.length === 0 && <li className="empty">Nothing here yet. What’s the one thing that matters today?</li>}
        {ordered.map((t) => (
          <li key={t.id} className={`task ${t.done ? 'done' : ''} ${t.id === activeId ? 'active' : ''}`}>
            <button className="check" onClick={() => toggleTask(t.id)} aria-label={t.done ? 'Mark not done' : 'Mark done'}>
              <Check size={12} strokeWidth={3} />
            </button>
            {editing === t.id ? (
              <input
                className="task-edit"
                autoFocus
                defaultValue={t.text}
                onBlur={(e) => { editTask(t.id, e.target.value.trim() || t.text); setEditing(null) }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') (e.target as HTMLInputElement).blur() }}
              />
            ) : (
              <span className="task-text" onDoubleClick={() => setEditing(t.id)}>{t.text}</span>
            )}
            {eta && !t.done && (
              <label className="est" title="Estimate in minutes (Task ETA mode)">
                <input type="number" min={1} max={600} value={t.est ?? ''} placeholder="min" onChange={(e) => setTaskEst(t.id, e.target.value ? Number(e.target.value) : undefined)} />
              </label>
            )}
            {t.pomos > 0 && <span className="pomo-count" title="Focus sessions"><Timer size={11} />{t.pomos}</span>}
            {!t.done && (
              <button
                className={`icon-btn ghost xs target ${t.id === activeId ? 'on' : ''}`}
                onClick={() => setActiveTask(t.id === activeId ? null : t.id)}
                aria-label="Focus on this task"
                title="Focus on this"
              >
                <Target size={14} />
              </button>
            )}
            <button className="icon-btn ghost xs del" onClick={() => removeTask(t.id)} aria-label="Delete"><Trash2 size={14} /></button>
          </li>
        ))}
      </ul>
    </FloatingPanel>
  )
}
