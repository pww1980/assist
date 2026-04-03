'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg className={`w-6 h-6 ${active ? 'text-indigo-400' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )
}

function CheckIcon({ active }: { active: boolean }) {
  return (
    <svg className={`w-6 h-6 ${active ? 'text-indigo-400' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  )
}

function CalendarIcon({ active }: { active: boolean }) {
  return (
    <svg className={`w-6 h-6 ${active ? 'text-indigo-400' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

export function BottomNav() {
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/'
    return pathname.startsWith(path)
  }

  return (
    <>
      {/* Drawer Overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-slate-800 rounded-t-2xl transition-transform duration-300 ${
          drawerOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="w-10 h-1 bg-slate-600 rounded-full mx-auto mt-3 mb-4" />
        <nav className="px-4 pb-6 space-y-1">
          <Link
            href="/shopping/"
            onClick={() => setDrawerOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-colors ${
              isActive('/shopping') ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-300 hover:bg-slate-700'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Einkaufsliste
          </Link>
          <Link
            href="/ideas/"
            onClick={() => setDrawerOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-colors ${
              isActive('/ideas') ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-300 hover:bg-slate-700'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Ideen
          </Link>
          <Link
            href="/reminders/"
            onClick={() => setDrawerOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-colors ${
              isActive('/reminders') ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-300 hover:bg-slate-700'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            Erinnerungen
          </Link>
        </nav>
      </div>

      {/* Bottom Navigation Bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur border-t border-slate-800"
        style={{ height: '60px', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center justify-around h-full max-w-lg mx-auto px-2">
          <Link href="/" className="flex flex-col items-center gap-0.5 min-w-[48px] min-h-[48px] justify-center">
            <HomeIcon active={isActive('/')} />
            <span className={`text-xs ${isActive('/') ? 'text-indigo-400' : 'text-slate-500'}`}>Übersicht</span>
          </Link>
          <Link href="/todos/" className="flex flex-col items-center gap-0.5 min-w-[48px] min-h-[48px] justify-center">
            <CheckIcon active={isActive('/todos')} />
            <span className={`text-xs ${isActive('/todos') ? 'text-indigo-400' : 'text-slate-500'}`}>Todos</span>
          </Link>
          <Link href="/events/" className="flex flex-col items-center gap-0.5 min-w-[48px] min-h-[48px] justify-center">
            <CalendarIcon active={isActive('/events')} />
            <span className={`text-xs ${isActive('/events') ? 'text-indigo-400' : 'text-slate-500'}`}>Termine</span>
          </Link>
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex flex-col items-center gap-0.5 min-w-[48px] min-h-[48px] justify-center"
          >
            <MenuIcon />
            <span className="text-xs text-slate-500">Mehr</span>
          </button>
        </div>
      </nav>
    </>
  )
}
