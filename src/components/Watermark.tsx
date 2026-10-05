/** Subtle branded watermark. Uses original /logo.png as-is (do not edit the logo). */
export function Watermark({
  contained = false,
  hideOnPrint = false,
}: {
  /** When true, fills a relative parent (e.g. receipt card) instead of the viewport. */
  contained?: boolean
  /** Hide when printing (e.g. page shell behind a receipt that has its own on-card mark). */
  hideOnPrint?: boolean
}) {
  return (
    <div
      className={[
        'app-watermark pointer-events-none flex items-center justify-center overflow-hidden',
        contained
          ? 'absolute inset-0 z-0'
          : 'fixed inset-x-0 top-0 bottom-0 z-0 mx-auto max-w-lg',
        hideOnPrint ? 'no-print' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-hidden="true"
    >
      {/* Keep clear of sticky header (~64px) and bottom nav (~64px + safe area) on page mode */}
      <div
        className={`watermark-mark flex flex-col items-center opacity-[0.11] ${
          contained
            ? 'w-[min(52%,180px)]'
            : 'w-[min(58vw,220px)] -translate-y-2'
        }`}
      >
        <img
          src={`${import.meta.env.BASE_URL}logo.png`}
          alt=""
          className="h-auto w-full object-contain select-none"
          draggable={false}
        />
        <p className="mt-1.5 text-center text-[9px] font-medium leading-snug text-navy">
          મીરા રોડ સ્થાનિક પંચાયત-૨૮
        </p>
        <p className="mt-0.5 text-center text-[11px] font-semibold tracking-wider text-navy">
          MR28
        </p>
      </div>
    </div>
  )
}
