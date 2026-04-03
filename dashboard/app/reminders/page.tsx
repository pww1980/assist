'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { isLoggedIn } from '@/lib/auth'
import { BottomNav } from '@/components/BottomNav'
import { useRealtime } from '@/components/RealtimeProvider'
import type { Reminder } from '@/lib/types'

const CHANNEL_LABELS: Record<string, string> = {
  push: 'Push',
  email: 'E-Mail',
  sms: 'SMS',
  telegram: 'Telegram',
  webhook: 'Webhook',
}

function formatDateTime(dt: string): string {
  const d = new Date(dt)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) {
    return `Heute, ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`
  }
  return d.toLocaleString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function isPast(dt: string): boolean {
  return new Date(dt) < new Date()
}

export default function RemindersPage() {
  const router = useRouter()
  const { subscribe } = useRealtime()
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)

  const loadReminders = useCallback(async () => {
    try {
      const data = (await api.get('/api/reminders?sent=false')) as Reminder[]
      const sorted = [...data].sort(
        (a, b) => new Date(a.remind_at).getTime() - new Date(b.remind_at).getTime()
      )
      setReminders(sorted)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isLoggedIn()) { router.push('/login/'); return }
    loadReminders()
  }, [router, loadReminders])

  useEffect(() => {
    return subscribe((event) => {
      if (event.event.startsWith('reminder.')) loadReminders()
    })
  }, [subscribe, loadReminders])

  return (
    <main className="min-h-screen bg-slate-900 pb-20">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-slate-100">Erinnerungen</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {reminders.length} ausstehende {reminders.length === 1 ? 'Erinnerung' : 'Erinnerungen'}
          </p>
        </div>

        {loading ? (
          <div className="text-center text-slate-400 py-12">Laden...</div>
        ) : reminders.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center">
              <svg className="w-7 h-7 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <p className="text-slate-500">Keine ausstehenden Erinnerungen</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reminders.map((reminder) => {
              const past = isPast(reminder.remind_at)
              return (
                <div
                  key={reminder.id}
                  className={`bg-slate-800 rounded-xl p-4 flex gap-3 ${
                    past ? 'opacity-60' : ''
                  }`}
                >
                  {/* Bell icon */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                    past ? 'bg-slate-700' : 'bg-amber-500/20'
                  }`}>
                    <svg
                      className={`w-5 h-5 ${past ? 'text-slate-500' : 'text-amber-400'}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-medium text-slate-100 capitalize">
                        {reminder.type.replace(/_/g, ' ')}
                      </span>
                      {past && (
                        <span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full">
                          Überfällig
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-400 mt-0.5 truncate">
                      Ref: {reminder.target_ref}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className={`text-sm ${past ? 'text-red-400' : 'text-slate-300'}`}>
                          {formatDateTime(reminder.remind_at)}
                        </span>
                      </div>
                      <span className="w-1 h-1 rounded-full bg-slate-600" />
                      <span className="text-sm text-slate-400">
                        {CHANNEL_LABELS[reminder.channel] ?? reminder.channel}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  )
}
