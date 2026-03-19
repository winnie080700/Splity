export function BrandLogo({ className = "h-11 w-11" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="splity-green" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#67e8a5" />
          <stop offset="100%" stopColor="#58dca6" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="44" fill="url(#splity-green)" />
      <path fill="#2f3137" d="M47 18h31l-12 12H50L39 41l21 19-12 12-30-29 29-25Z" />
      <path fill="#2f3137" d="M73 48h29L90 60l12 12-20 21H47l13-12h17l11-10-11-11h-16l12-12Z" />
      <path fill="#2f3137" d="M88 14 35 106l-7 2 53-92z" />
      <path fill="#fff" d="M90 18 37 110l8-3 53-92z" />
      <path fill="url(#splity-green)" d="M50 30h24l-8 8H53l-7 7 14 13-8 8-22-21 20-15Z" />
      <path fill="url(#splity-green)" d="M77 52h15l-8 8 8 8-16 17H53l8-8h12l8-9-8-8h-9l8-8Z" />
    </svg>
  );
}
