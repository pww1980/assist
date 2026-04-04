'use client'

import type { Todo } from '@/lib/types'
import { PriorityBadge } from './PriorityBadge'

interface Props {
  todo: Todo
  onToggle: () => void
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function isOverdue(dateStr?: string): boolean {
  if (!dateStr) return false
  return new Date(dateStr) < new Date(new Date().toDateString())
}

export function TodoCard({ todo, onToggle }: Props) {
  const overdue = !todo.completed && isOverdue(todo.due_date)

  return (
    <div className="bg-slate-800 rounded-xl shadow-sm p-4 mb-3 flex items-start gap-3">
      <button
        onClick={onToggle}
        aria-label={todo.completed ? 'Als offen markieren' : 'Als erledigt markieren'}
        className={`flex-shrink-0 w-12 h-12 rounded-full border-2 flex items-center justify-center transition-colors ${
          todo.completed
            ? 'bg-indigo-500 border-indigo-500 text-white'
            : 'border-slate-500 text-transparent hover:border-indigo-400'
        }`}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-base font-medium leading-snug ${todo.completed ? 'line-through text-slate-500' : 'text-slate-100'}`}>
          {todo.title}
        </p>
        {todo.description && (
          <p className="text-sm text-slate-400 mt-0.5 line-clamp-2">{todo.description}</p>
        )}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <PriorityBadge priority={todo.priority} />
          {todo.due_date && (
            <span className={`text-xs ${overdue ? 'text-red-400 font-semibold' : 'text-slate-400'}`}>
              {overdue ? '⚠ ' : ''}{formatDate(todo.due_date)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
