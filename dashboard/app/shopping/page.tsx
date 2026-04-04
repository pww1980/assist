'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { isLoggedIn } from '@/lib/auth'
import { BottomNav } from '@/components/BottomNav'
import { AddModal } from '@/components/AddModal'
import { useRealtime } from '@/components/RealtimeProvider'
import type { ShoppingItem } from '@/lib/types'

export default function ShoppingPage() {
  const router = useRouter()
  const { subscribe } = useRealtime()
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showChecked, setShowChecked] = useState(false)

  const loadItems = useCallback(async () => {
    try {
      const data = (await api.get('/api/shopping')) as ShoppingItem[]
      setItems(data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isLoggedIn()) { router.push('/login/'); return }
    loadItems()
  }, [router, loadItems])

  useEffect(() => {
    return subscribe((event) => {
      if (event.event.startsWith('shopping.')) loadItems()
    })
  }, [subscribe, loadItems])

  async function toggleItem(item: ShoppingItem) {
    try {
      await api.patch(`/api/shopping/${item.id}`, { checked: !item.checked })
      setItems((prev) =>
        prev.map((s) => (s.id === item.id ? { ...s, checked: !s.checked } : s))
      )
    } catch { /* ignore */ }
  }

  async function addItem(data: Record<string, unknown>) {
    const created = await api.post('/api/shopping', { ...data, checked: false }) as ShoppingItem
    setItems((prev) => [created, ...prev])
  }

  const displayed = showChecked ? items : items.filter((i) => !i.checked)

  // Group by category
  const grouped: Record<string, ShoppingItem[]> = {}
  displayed.forEach((item) => {
    const cat = item.category ?? 'Sonstiges'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(item)
  })
  const categories = Object.keys(grouped).sort()
  const isSingleGroup = categories.length === 1 && categories[0] === 'Sonstiges'

  const uncheckedCount = items.filter((i) => !i.checked).length

  return (
    <main className="min-h-screen bg-slate-900 pb-20">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Einkaufsliste</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {uncheckedCount} {uncheckedCount === 1 ? 'Artikel' : 'Artikel'} offen
            </p>
          </div>
          <button
            onClick={() => setShowChecked((v) => !v)}
            className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
              showChecked ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 bg-slate-800'
            }`}
          >
            {showChecked ? 'Alle' : 'Offen'}
          </button>
        </div>

        {loading ? (
          <div className="text-center text-slate-400 py-12">Laden...</div>
        ) : displayed.length === 0 ? (
          <div className="text-center text-slate-500 py-12">
            {showChecked ? 'Keine Artikel' : 'Alle Artikel abgehakt!'}
          </div>
        ) : (
          categories.map((cat) => (
            <div key={cat} className="mb-5">
              {!isSingleGroup && (
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 px-1">
                  {cat}
                </p>
              )}
              <div className="bg-slate-800 rounded-xl overflow-hidden">
                {grouped[cat].map((item, idx) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-4 px-4 py-3.5 ${
                      idx !== grouped[cat].length - 1 ? 'border-b border-slate-700' : ''
                    }`}
                  >
                    <button
                      onClick={() => toggleItem(item)}
                      className={`flex-shrink-0 w-12 h-12 rounded-full border-2 flex items-center justify-center transition-colors ${
                        item.checked
                          ? 'bg-indigo-500 border-indigo-500 text-white'
                          : 'border-slate-500 text-transparent hover:border-indigo-400'
                      }`}
                      aria-label={item.checked ? 'Als offen markieren' : 'Abhaken'}
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-base font-medium ${item.checked ? 'line-through text-slate-500' : 'text-slate-100'}`}>
                        {item.title}
                      </p>
                      {(item.quantity != null || item.unit) && (
                        <p className="text-sm text-slate-400">
                          {item.quantity != null ? item.quantity : ''} {item.unit ?? ''}
                        </p>
                      )}
                    </div>
                    {item.store_name && (
                      <span className="text-xs text-slate-500 flex-shrink-0">{item.store_name}</span>
                    )}
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
        aria-label="Artikel hinzufügen"
      >
        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {showModal && (
        <AddModal type="shopping_item" onClose={() => setShowModal(false)} onSave={addItem} />
      )}

      <BottomNav />
    </main>
  )
}
