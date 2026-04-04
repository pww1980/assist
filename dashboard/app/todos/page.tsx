'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { isLoggedIn } from '@/lib/auth'
import { BottomNav } from '@/components/BottomNav'
import { TodoCard } from '@/components/TodoCard'
import { AddModal } from '@/components/AddModal'
import { useRealtime } from '@/components/RealtimeProvider'
import type { Todo } from '@/lib/types'

type Tab = 'open' | 'done'

export default function TodosPage() {
  const router = useRouter()
  const { subscribe } = useRealtime()
  const [tab, setTab] = useState<Tab>('open')
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const loadTodos = useCallback(async () => {
    try {
      const data = (await api.get('/api/todos')) as Todo[]
      setTodos(data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isLoggedIn()) { router.push('/login/'); return }
    loadTodos()
  }, [router, loadTodos])

  useEffect(() => {
    return subscribe((event) => {
      if (event.event.startsWith('todo.')) loadTodos()
    })
  }, [subscribe, loadTodos])

  async function toggleTodo(todo: Todo) {
    try {
      await api.patch(`/api/todos/${todo.id}`, { completed: !todo.completed })
      setTodos((prev) =>
        prev.map((t) => (t.id === todo.id ? { ...t, completed: !t.completed } : t))
      )
    } catch { /* ignore */ }
  }

  async function addTodo(data: Record<string, unknown>) {
    const created = await api.post('/api/todos', { ...data, completed: false }) as Todo
    setTodos((prev) => [created, ...prev])
  }

  const filtered = todos.filter((t) => (tab === 'open' ? !t.completed : t.completed))

  return (
    <main className="min-h-screen bg-slate-900 pb-20">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <h1 className="text-2xl font-bold text-slate-100 mb-4">Todos</h1>

        {/* Tabs */}
        <div className="flex bg-slate-800 rounded-xl p-1 mb-5">
          <button
            onClick={() => setTab('open')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              tab === 'open' ? 'bg-indigo-500 text-white' : 'text-slate-400'
            }`}
          >
            Offen ({todos.filter((t) => !t.completed).length})
          </button>
          <button
            onClick={() => setTab('done')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              tab === 'done' ? 'bg-indigo-500 text-white' : 'text-slate-400'
            }`}
          >
            Erledigt ({todos.filter((t) => t.completed).length})
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center text-slate-400 py-12">Laden...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-slate-500 py-12">
            {tab === 'open' ? 'Keine offenen Todos' : 'Keine erledigten Todos'}
          </div>
        ) : (
          filtered.map((todo) => (
            <TodoCard key={todo.id} todo={todo} onToggle={() => toggleTodo(todo)} />
          ))
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-20 right-4 w-14 h-14 bg-indigo-500 rounded-full shadow-lg flex items-center justify-center z-20"
        aria-label="Todo hinzufügen"
      >
        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {showModal && (
        <AddModal type="todo" onClose={() => setShowModal(false)} onSave={addTodo} />
      )}

      <BottomNav />
    </main>
  )
}
