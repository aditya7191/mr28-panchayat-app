import type { ReactNode } from 'react'

export function StatCard({
  label,
  value,
  accent = 'navy',
  icon,
}: {
  label: string
  value: string | number
  accent?: 'navy' | 'saffron' | 'success' | 'danger'
  icon?: ReactNode
}) {
  const accents = {
    navy: 'border-navy/20 bg-white',
    saffron: 'border-saffron/30 bg-saffron/5',
    success: 'border-success/30 bg-success/5',
    danger: 'border-danger/30 bg-danger/5',
  }
  const valueColor = {
    navy: 'text-navy',
    saffron: 'text-saffron-dark',
    success: 'text-success',
    danger: 'text-danger',
  }
  return (
    <div className={`rounded-xl border p-3 shadow-sm ${accents[accent]}`}>
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-navy/60">
        {icon}
        {label}
      </div>
      <div className={`text-2xl font-bold ${valueColor[accent]}`}>{value}</div>
    </div>
  )
}
