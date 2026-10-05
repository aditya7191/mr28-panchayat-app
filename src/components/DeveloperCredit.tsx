/** Developer credit — Aditya Solanki */
export function DeveloperCredit({ className = '' }: { className?: string }) {
  return (
    <p
      className={`text-center text-[11px] leading-snug text-navy/45 ${className}`}
      role="contentinfo"
    >
      <strong className="font-semibold text-navy/65">Aditya Solanki</strong>
      {' '}
      (Developer / ડેવલપર)
    </p>
  )
}
