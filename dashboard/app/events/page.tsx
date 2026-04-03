'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { isLoggedIn } from '@/lib/auth'
import { BottomNav } from '@/components/BottomNav'
import { AddModal } from '@/components/AddModal'
import { useRealtime } from '@/components/RealtimeProvider'
import type { CalendarEvent } from '@/lib/types'

function formatDateTime(dt: string): string {
  return new Date(dt).toLocaleString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatTime(dt: string): string {
  return new Date(dt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

function formatDateHeader(dt: string): string {
  return new Date(dt).toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function isSameDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString()
}

export default function EventsPage() {
  const router = useRouter()
  const { subscribe } = useRealtime()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const loadEvents = useCallback(async () => {
    try {
      const data = (await api.get('/api/events?upcoming=true')) as CalendarEvent[]
      const sorted = [...data].sort(
        (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      )
      setEvents(sorted)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isLoggedIn()) { router.push('/login/'); return }
    loadEvents()
  }, [router, loadEvents])

  useEffect(() => {
    return subscribe((event) => {
      if (event.event.startsWith('event.')) loadEvents()
    })
  }, [subscribe, loadEvents])

  async function addEvent(data: Record<string, unknown>) {
    const created = await api.post('/api/events', data) as CalendarEvent
    setEvents((prev) => {
      const next = [...prev, created].sort(
        (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      )
      return next
    })
  }

  // Group events by day
  const grouped: { dateKey: string; label: string; items: CalendarEvent[] }[] = []
  events.forEach((ev) => {
    const last = grouped[grouped.length - 1]
    if (last && isSameDay(last.dateKey, ev.start_time)) {
      last.items.push(ev)
    } else {
      grouped.push({ dateKey: ev.start_time, label: formatDateHeader(ev.start_time), items: [ev] })
    }
  })

  return (
    <main className="min-h-screen bg-slate-900 pb-20">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <h1 className="text-2xl font-bold text-slate-100 mb-5">Termine</h1>

        {loading ? (
          <div className="text-center text-slate-400 py-12">Laden...</div>
        ) : events.length === 0 ? (
          <div className="text-center text-slate-500 py-12">Keine bevorstehenden Termine</div>
        ) : (
          grouped.map((group) => (
            <div key={group.dateKey} className="mb-5">
              <p className="text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wide">
                {group.label}
              </p>
              <div className="space-y-3">
                {group.items.map((ev) => (
                  <div key={ev.id} className="bg-slate-800 rounded-xl p-4 flex gap-3">
                    {/* Time column */}
                    <div className="flex-shrink-0 text-right w-14">
                      <p className="text-sm font-semibold text-indigo-400">{formatTime(ev.start_time)}</p>
                      {ev.end_time && (
                        <p className="text-xs text-slate-500">{formatTime(ev.end_time)}</p>
                      )}
                    </div>
                    {/* Divider */}
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 mt-0.5" />
                      <div className="flex-1 w-0.5 bg-slate-700 min-h-[16px]" />
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0 pb-1">
                      <p className="text-base font-medium text-slate-100 leading-snug">{ev.title}</p>
                      {ev.location && (
                        <div className="flex items-center gap-1 mt-1">
                          <svg className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="text-xs text-slate-400 truncate">{ev.location}</span>
                        </div>
                      )}
                      {ev.description && (
                        <p className="text-sm text-slate-400 mt-1 line-clamp-2">{ev.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-20 right-4 w-14 h-14 bg-indigo-500 rounded-full shadow-lg flex items-center justify-center z-20"
        aria-label="Termin hinzufügen"
      >
        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {showModal && (
        <AddModal type="event" onClose={() => setShowModal(false)} onSave={addEvent} />
      )}

      <BottomNav />
    </main>
  )
}
