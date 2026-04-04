'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { isLoggedIn } from '@/lib/auth'
import { BottomNav } from '@/components/BottomNav'
import { TodoCard } from '@/components/TodoCard'
import { useRealtime } from '@/components/RealtimeProvider'
import type { Todo, CalendarEvent, ShoppingItem, Reminder } from '@/lib/types'

function formatToday(): string {
  return new Date().toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatTime(dt: string): string {
  return new Date(dt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Guten Morgen'
  if (h < 18) return 'Guten Tag'
  return 'Guten Abend'
}

export default function DashboardPage() {
  const router = useRouter()
  const { subscribe } = useRealtime()

  const [todos, setTodos] = useState<Todo[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [shopping, setShopping] = useState<ShoppingItem[]>([])
  const [reminderCount, setReminderCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const [todosData, eventsData, shoppingData, remindersData] = await Promise.all([
        api.get('/api/todos?completed=false'),
        api.get('/api/events?date=today'),
        api.get('/api/shopping?checked=false'),
        api.get('/api/reminders?sent=false'),
      ])
      setTodos((todosData as Todo[]).slice(0, 5))
      setEvents(eventsData as CalendarEvent[])
      setShopping((shoppingData as ShoppingItem[]).slice(0, 5))
      setReminderCount((remindersData as Reminder[]).length)
    } catch {
      // silently handle errors
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push('/login/')
      return
    }
    loadData()
  }, [router, loadData])

  useEffect(() => {
    return subscribe((event) => {
      if (
        event.event.startsWith('todo.') ||
        event.event.startsWith('event.') ||
        event.event.startsWith('shopping.') ||
        event.event.startsWith('reminder.')
      ) {
        loadData()
      }
    })
  }, [subscribe, loadData])

  async function toggleTodo(todo: Todo) {
    try {
      await api.patch(`/api/todos/${todo.id}`, { completed: !todo.completed })
      setTodos((prev) =>
        prev.map((t) => (t.id === todo.id ? { ...t, completed: !t.completed } : t))
      )
    } catch {
      // ignore
    }
  }

  async function toggleShopping(item: ShoppingItem) {
    try {
      await api.patch(`/api/shopping/${item.id}`, { checked: !item.checked })
      setShopping((prev) =>
        prev.map((s) => (s.id === item.id ? { ...s, checked: !s.checked } : s))
      )
    } catch {
      // ignore
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Laden...</div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-slate-900 pb-20">
      <div className="max-w-lg mx-auto px-4 pt-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-100">{getGreeting()}</h1>
          <p className="text-slate-400 text-sm mt-0.5">{formatToday()}</p>
        </div>

        {/* Reminder Alert */}
        {reminderCount > 0 && (
          <div
            className="bg-amber-500/20 border border-amber-500/30 rounded-xl px-4 py-3 mb-5 flex items-center gap-3 cursor-pointer"
            onClick={() => router.push('/reminders/')}
          >
            <svg className="w-5 h-5 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="text-amber-300 text-sm font-medium">
              {reminderCount} aktive {reminderCount === 1 ? 'Erinnerung' : 'Erinnerungen'}
            </span>
          </div>
        )}

        {/* Todos */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-slate-200">Offene Todos</h2>
            <button
              onClick={() => router.push('/todos/')}
              className="text-indigo-400 text-sm font-medium"
            >
              Alle anzeigen
            </button>
          </div>
          {todos.length === 0 ? (
            <div className="bg-slate-800 rounded-xl p-6 text-center text-slate-500 text-sm">
              Keine offenen Todos
            </div>
          ) : (
            todos.map((todo) => (
              <TodoCard key={todo.id} todo={todo} onToggle={() => toggleTodo(todo)} />
            ))
          )}
        </section>

        {/* Events today */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-slate-200">Heutige Termine</h2>
            <button
              onClick={() => router.push('/events/')}
              className="text-indigo-400 text-sm font-medium"
            >
              Alle anzeigen
            </button>
          </div>
          {events.length === 0 ? (
            <div className="bg-slate-800 rounded-xl p-6 text-center text-slate-500 text-sm">
              Keine Termine heute
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((ev) => (
                <div key={ev.id} className="bg-slate-800 rounded-xl p-4 flex gap-3">
                  <div className="flex-shrink-0 w-1 rounded-full bg-indigo-500 self-stretch" />
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-medium text-slate-100 leading-snug">{ev.title}</p>
                    <p className="text-sm text-slate-400 mt-0.5">
                      {formatTime(ev.start_time)}
                      {ev.end_time ? ` – ${formatTime(ev.end_time)}` : ''}
                    </p>
                    {ev.location && (
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{ev.location}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Shopping */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-slate-200">Einkaufsliste</h2>
            <button
              onClick={() => router.push('/shopping/')}
              className="text-indigo-400 text-sm font-medium"
            >
              Alle anzeigen
            </button>
          </div>
          {shopping.length === 0 ? (
            <div className="bg-slate-800 rounded-xl p-6 text-center text-slate-500 text-sm">
              Einkaufsliste ist leer
            </div>
          ) : (
            <div className="bg-slate-800 rounded-xl overflow-hidden">
              {shopping.map((item, idx) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 px-4 py-3 ${idx !== shopping.length - 1 ? 'border-b border-slate-700' : ''}`}
                >
                  <button
                    onClick={() => toggleShopping(item)}
                    className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${
                      item.checked ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-500 text-transparent hover:border-indigo-400'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <div className="flex-1 min-w-0">
                    <span className={`text-base ${item.checked ? 'line-through text-slate-500' : 'text-slate-100'}`}>
                      {item.title}
                    </span>
                    {(item.quantity != null || item.unit) && (
                      <span className="text-sm text-slate-400 ml-2">
                        {item.quantity} {item.unit}
                      </span>
                    )}
                  </div>
                  {item.category && (
                    <span className="text-xs text-slate-500 flex-shrink-0">{item.category}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <BottomNav />
    </main>
  )
}
