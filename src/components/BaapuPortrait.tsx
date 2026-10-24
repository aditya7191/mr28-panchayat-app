/** Sant Rohidas Baapu portrait in a gold + silver arch with soft glow. */
export function BaapuPortrait({ size = 'lg', caption = true }: { size?: 'lg' | 'sm'; caption?: boolean }) {
  const dim = size === 'lg' ? 'h-40 w-32' : 'h-24 w-20'
  return (
    <figure className="flex flex-col items-center">
      <div className={`baapu-arch relative ${dim}`}>
        <img
          src={`${import.meta.env.BASE_URL}baapu.webp`}
          alt="Sant Rohidas Baapu"
          className="absolute inset-x-0 bottom-0 mx-auto h-[96%] w-auto object-contain object-bottom drop-shadow-[0_4px_8px_rgba(0,0,0,0.35)]"
          loading="eager"
          decoding="async"
        />
      </div>
      {caption && <figcaption className="mt-1.5 text-center leading-tight">
        <span className="block text-[13px] font-extrabold hero-title">જય રોહિદાસ બાપુ</span>
        <span className="block text-[10px] font-semibold tracking-wide text-[#d9dde3]">Jay Rohidas Baapu</span>
      </figcaption>}
    </figure>
  )
}
