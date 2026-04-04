'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { isLoggedIn } from '@/lib/auth'
import { BottomNav } from '@/components/BottomNav'
import { AddModal } from '@/components/AddModal'
import { useRealtime } from '@/components/RealtimeProvider'
import type { Idea } from '@/lib/types'

type Tab = 'active' | 'archived'

function formatDate(dt: string): string {
  return new Date(dt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function IdeasPage() {
  const router = useRouter()
  const { subscribe } = useRealtime()
  const [tab, setTab] = useState<Tab>('active')
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const loadIdeas = useCallback(async () => {
    try {
      const data = (await api.get('/api/ideas')) as Idea[]
      setIdeas(data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isLoggedIn()) { router.push('/login/'); return }
    loadIdeas()
  }, [router, loadIdeas])

  useEffect(() => {
    return subscribe((event) => {
      if (event.event.startsWith('idea.')) loadIdeas()
    })
  }, [subscribe, loadIdeas])

  async function archiveIdea(idea: Idea) {
    try {
      await api.patch(`/api/ideas/${idea.id}`, { status: 'archived' })
      setIdeas((prev) =>
        prev.map((i) => (i.id === idea.id ? { ...i, status: 'archived' } : i))
      )
    } catch { /* ignore */ }
  }

  async function restoreIdea(idea: Idea) {
    try {
      await api.patch(`/api/ideas/${idea.id}`, { status: 'active' })
      setIdeas((prev) =>
        prev.map((i) => (i.id === idea.id ? { ...i, status: 'active' } : i))
      )
    } catch { /* ignore */ }
  }

  async function addIdea(data: Record<string, unknown>) {
    const created = await api.post('/api/ideas', { ...data, status: 'active' }) as Idea
    setIdeas((prev) => [created, ...prev])
  }

  const filtered = ideas.filter((i) => i.status === tab)

  return (
    <main className="min-h-screen bg-slate-900 pb-20">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <h1 className="text-2xl font-bold text-slate-100 mb-4">Ideen</h1>

        {/* Tabs */}
        <div className="flex bg-slate-800 rounded-xl p-1 mb-5">
          <button
            onClick={() => setTab('active')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              tab === 'active' ? 'bg-indigo-500 text-white' : 'text-slate-400'
            }`}
          >
            Aktiv ({ideas.filter((i) => i.status === 'active').length})
          </button>
          <button
            onClick={() => setTab('archived')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              tab === 'archived' ? 'bg-indigo-500 text-white' : 'text-slate-400'
            }`}
          >
            Archiviert ({ideas.filter((i) => i.status === 'archived').length})
          </button>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="text-center text-slate-400 py-12">Laden...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-slate-500 py-12">
            {tab === 'active' ? 'Keine aktiven Ideen' : 'Keine archivierten Ideen'}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filtered.map((idea) => (
              <div key={idea.id} className="bg-slate-800 rounded-xl shadow-sm p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-base font-semibold text-slate-100 leading-snug flex-1">
                    {idea.title}
                  </h3>
                  {idea.status === 'active' ? (
                    <button
                      onClick={() => archiveIdea(idea)}
                      className="flex-shrink-0 text-slate-400 hover:text-slate-200 p-1"
                      title="Archivieren"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                    </button>
                  ) : (
                    <button
                      onClick={() => restoreIdea(idea)}
                      className="flex-shrink-0 text-slate-400 hover:text-indigo-400 p-1"
                      title="Wiederherstellen"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  )}
                </div>
                <p className="text-sm text-slate-400 leading-relaxed line-clamp-4">{idea.content}</p>
                {idea.tags && idea.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {idea.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-slate-700 text-slate-400 rounded-full text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-slate-600 mt-3">{formatDate(idea.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-20 right-4 w-14 h-14 bg-indigo-500 rounded-full shadow-lg flex items-center justify-center z-20"
        aria-label="Idee hinzufügen"
      >
        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {showModal && (
        <AddModal type="idea" onClose={() => setShowModal(false)} onSave={addIdea} />
      )}

      <BottomNav />
    </main>
  )
}
