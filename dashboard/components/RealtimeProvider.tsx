'use client'

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { isLoggedIn, getAccessToken } from '@/lib/auth'
import { connectWS } from '@/lib/websocket'
import type { RealtimeEvent, RealtimeEventType } from '@/lib/types'

interface RealtimeContextValue {
  lastEvent: RealtimeEvent | null
  subscribe: (handler: (event: RealtimeEvent) => void) => () => void
}

const RealtimeContext = createContext<RealtimeContextValue>({
  lastEvent: null,
  subscribe: () => () => {},
})

export function useRealtime() {
  return useContext(RealtimeContext)
}

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null)
  const handlersRef = useRef<Set<(event: RealtimeEvent) => void>>(new Set())

  const subscribe = useCallback((handler: (event: RealtimeEvent) => void) => {
    handlersRef.current.add(handler)
    return () => handlersRef.current.delete(handler)
  }, [])

  useEffect(() => {
    if (!isLoggedIn()) return
    const token = getAccessToken()
    if (!token) return

    const disconnect = connectWS(token, (eventType, data) => {
      const ev: RealtimeEvent = {
        event: eventType as RealtimeEventType,
        data,
      }
      setLastEvent(ev)
      handlersRef.current.forEach((h) => h(ev))
    })

    return disconnect
  }, [])

  return (
    <RealtimeContext.Provider value={{ lastEvent, subscribe }}>
      {children}
    </RealtimeContext.Provider>
  )
}
