export function EarthLeafIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="70" stroke="currentColor" strokeWidth="2" opacity="0.15" />
      <path
        d="M100 60c-22 0-40 18-40 40s18 40 40 40 40-18 40-40"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.3"
      />
      <path
        d="M100 50c15 10 25 28 20 48-18-3-33-15-38-32-2-7 3-15 18-16z"
        fill="currentColor"
        opacity="0.5"
      />
      <line x1="100" y1="50" x2="82" y2="98" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
    </svg>
  )
}

export function WindTurbineIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 160" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="50" y1="60" x2="50" y2="150" stroke="currentColor" strokeWidth="3" opacity="0.5" />
      <circle cx="50" cy="60" r="4" fill="currentColor" opacity="0.6" />
      <path d="M50 60 L50 15 M50 60 L20 78 M50 60 L80 78" stroke="currentColor" strokeWidth="2.5" opacity="0.5" strokeLinecap="round" />
    </svg>
  )
}

export function SolarPanelIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 140 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="30" width="100" height="55" rx="2" stroke="currentColor" strokeWidth="2" opacity="0.4" />
      <line x1="20" y1="48" x2="120" y2="48" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <line x1="20" y1="66" x2="120" y2="66" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <line x1="53" y1="30" x2="53" y2="85" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <line x1="86" y1="30" x2="86" y2="85" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <line x1="70" y1="85" x2="70" y2="98" stroke="currentColor" strokeWidth="2.5" opacity="0.4" />
    </svg>
  )
}