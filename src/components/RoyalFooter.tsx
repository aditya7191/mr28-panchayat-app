import { DeveloperCredit } from './DeveloperCredit'

export function RoyalFooter({ className = '' }: { className?: string }) {
  return (
    <footer className={`overflow-hidden rounded-2xl text-center text-white royal-pattern ${className}`}>
      <div className="gold-rule" />
      <div className="px-4 py-4">
        <p className="font-display text-lg font-bold gold-text">જય રોહિદાસ બાપુ</p>
        <p className="text-xs tracking-[0.2em] text-saffron-light/80 uppercase">Jay Rohidas Baapu</p>
        <div className="mx-auto my-3 h-px w-16 bg-saffron-light/40" />
        <DeveloperCredit className="!text-white/60 [&_strong]:!text-white/85" />
      </div>
    </footer>
  )
}
