'use client'

import { useState } from 'react'

type ModalType = 'todo' | 'event' | 'idea' | 'shopping_item'

interface Props {
  type: ModalType
  onClose: () => void
  onSave: (data: Record<string, unknown>) => Promise<void>
}

const TYPE_LABELS: Record<ModalType, string> = {
  todo: 'Todo hinzufügen',
  event: 'Termin hinzufügen',
  idea: 'Idee hinzufügen',
  shopping_item: 'Einkaufsartikel hinzufügen',
}

export function AddModal({ type, onClose, onSave }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fields, setFields] = useState<Record<string, string>>({})

  function set(key: string, value: string) {
    setFields((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const data: Record<string, unknown> = { ...fields }
      if (type === 'todo' && fields.priority) {
        data.priority = parseInt(fields.priority, 10)
      }
      if (type === 'shopping_item' && fields.quantity) {
        data.quantity = parseFloat(fields.quantity)
      }
      await onSave(data)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-slate-800 rounded-t-2xl w-full max-w-lg p-6 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-slate-600 rounded-full mx-auto mb-5" />
        <h2 className="text-lg font-semibold text-slate-100 mb-4">{TYPE_LABELS[type]}</h2>

        {error && (
          <div className="bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg px-3 py-2 text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Common: title */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">Titel *</label>
            <input
              required
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-3 text-base text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              placeholder="Titel eingeben..."
              value={fields.title ?? ''}
              onChange={(e) => set('title', e.target.value)}
            />
          </div>

          {type === 'todo' && (
            <>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Beschreibung</label>
                <textarea
                  rows={2}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-3 text-base text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                  placeholder="Optionale Beschreibung..."
                  value={fields.description ?? ''}
                  onChange={(e) => set('description', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Fälligkeit</label>
                  <input
                    type="date"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-3 text-base text-slate-100 focus:outline-none focus:border-indigo-500"
                    value={fields.due_date ?? ''}
                    onChange={(e) => set('due_date', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Priorität</label>
                  <select
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-3 text-base text-slate-100 focus:outline-none focus:border-indigo-500"
                    value={fields.priority ?? '2'}
                    onChange={(e) => set('priority', e.target.value)}
                  >
                    <option value="1">Hoch</option>
                    <option value="2">Mittel</option>
                    <option value="3">Niedrig</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {type === 'event' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Start *</label>
                  <input
                    required
                    type="datetime-local"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                    value={fields.start_time ?? ''}
                    onChange={(e) => set('start_time', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Ende</label>
                  <input
                    type="datetime-local"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                    value={fields.end_time ?? ''}
                    onChange={(e) => set('end_time', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Ort</label>
                <input
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-3 text-base text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  placeholder="Ort eingeben..."
                  value={fields.location ?? ''}
                  onChange={(e) => set('location', e.target.value)}
                />
              </div>
            </>
          )}

          {type === 'idea' && (
            <div>
              <label className="block text-sm text-slate-400 mb-1">Inhalt *</label>
              <textarea
                required
                rows={4}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-3 text-base text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                placeholder="Deine Idee..."
                value={fields.content ?? ''}
                onChange={(e) => set('content', e.target.value)}
              />
            </div>
          )}

          {type === 'shopping_item' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Menge</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-3 text-base text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    placeholder="1"
                    value={fields.quantity ?? ''}
                    onChange={(e) => set('quantity', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Einheit</label>
                  <input
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-3 text-base text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    placeholder="Stück, kg, l..."
                    value={fields.unit ?? ''}
                    onChange={(e) => set('unit', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Kategorie</label>
                <input
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-3 text-base text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  placeholder="Obst, Gemüse, Haushalt..."
                  value={fields.category ?? ''}
                  onChange={(e) => set('category', e.target.value)}
                />
              </div>
            </>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-slate-600 text-slate-300 text-base font-medium"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-indigo-500 text-white text-base font-medium disabled:opacity-50"
            >
              {loading ? 'Speichern...' : 'Speichern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
