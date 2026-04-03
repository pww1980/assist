import type { Metadata } from 'next'
import './globals.css'
import { RealtimeProvider } from '@/components/RealtimeProvider'

export const metadata: Metadata = {
  title: 'Persönlicher Assistent',
  description: 'Dashboard für persönliche Organisation',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de" className="dark">
      <body className="bg-slate-900 text-slate-100 min-h-screen">
        <RealtimeProvider>
          {children}
        </RealtimeProvider>
      </body>
    </html>
  )
}
