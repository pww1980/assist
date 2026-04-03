'use client'

interface Props {
  priority: 1 | 2 | 3
}

const PRIORITY_CONFIG = {
  1: { label: 'Hoch', className: 'bg-red-500/20 text-red-400 border border-red-500/30' },
  2: { label: 'Mittel', className: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' },
  3: { label: 'Niedrig', className: 'bg-slate-500/20 text-slate-400 border border-slate-500/30' },
}

export function PriorityBadge({ priority }: Props) {
  const config = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG[3]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}
