export function CaptureFieldIllustration() {
  return (
    <svg viewBox="0 0 280 200" className="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="phoneGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {/* Ground */}
      <rect x="0" y="160" width="280" height="40" fill="#f3f4f6" />

      {/* Truck in background */}
      <g opacity="0.3">
        <rect x="20" y="130" width="50" height="30" rx="3" fill="#d1d5db" />
        <circle cx="35" cy="160" r="3" fill="#1f2937" />
        <circle cx="55" cy="160" r="3" fill="#1f2937" />
      </g>

      {/* Driver figure */}
      <g transform="translate(140, 100)">
        {/* Head */}
        <circle cx="0" cy="-20" r="8" fill="#d2691e" />
        {/* Body */}
        <rect x="-6" y="-10" width="12" height="18" rx="2" fill="#10b981" opacity="0.7" />
        {/* Arm holding phone */}
        <line x1="8" y1="-5" x2="25" y2="-8" stroke="#d2691e" strokeWidth="2" />
        {/* Legs */}
        <line x1="-4" y1="8" x2="-4" y2="20" stroke="#2d3748" strokeWidth="2" />
        <line x1="4" y1="8" x2="4" y2="20" stroke="#2d3748" strokeWidth="2" />
      </g>

      {/* Phone - Main focus */}
      <g transform="translate(155, 65)">
        {/* Phone body */}
        <rect x="-22" y="0" width="44" height="70" rx="4" fill="#1f2937" stroke="#10b981" strokeWidth="1.5" />
        {/* Screen */}
        <rect x="-19" y="3" width="38" height="60" rx="2" fill="#f0f9ff" />
        {/* Screen content - form fields */}
        <rect x="-16" y="8" width="30" height="3" fill="#10b981" opacity="0.3" />
        <rect x="-16" y="15" width="30" height="2" fill="#10b981" opacity="0.2" />
        <rect x="-16" y="20" width="30" height="2" fill="#10b981" opacity="0.2" />
        <rect x="-16" y="28" width="30" height="3" fill="#10b981" opacity="0.3" />
        <rect x="-16" y="35" width="30" height="2" fill="#10b981" opacity="0.2" />
        <rect x="-16" y="40" width="30" height="2" fill="#10b981" opacity="0.2" />
        <rect x="-16" y="48" width="20" height="4" fill="#10b981" opacity="0.5" rx="2" />
        {/* Phone notch */}
        <rect x="-8" y="0" width="16" height="3" rx="1" fill="#0f172a" />
      </g>

      {/* Checkmark - validation */}
      <g transform="translate(95, 75)">
        <circle cx="0" cy="0" r="18" fill="#10b981" opacity="0.15" />
        <path d="M -8 0 L -2 6 L 8 -4" stroke="#10b981" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* Wifi signal - connectivity */}
      <g transform="translate(40, 50)" opacity="0.6">
        <path d="M 0 0 Q 8 -8 16 0" stroke="#10b981" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M 0 -8 Q 12 -18 24 -8" stroke="#10b981" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6" />
      </g>
    </svg>
  );
}

export function ValidationIllustration() {
  return (
    <svg viewBox="0 0 280 200" className="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="docGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {/* Background */}
      <rect x="0" y="0" width="280" height="200" fill="transparent" />

      {/* Document/Record stack */}
      <g transform="translate(85, 40)">
        {/* Bottom document */}
        <rect x="0" y="20" width="70" height="80" rx="3" fill="url(#docGrad)" stroke="#10b981" strokeWidth="1.5" opacity="0.6" />
        
        {/* Middle document */}
        <rect x="8" y="12" width="70" height="80" rx="3" fill="url(#docGrad)" stroke="#10b981" strokeWidth="1.5" opacity="0.75" />
        
        {/* Top document - highlighted */}
        <rect x="16" y="4" width="70" height="80" rx="3" fill="url(#docGrad)" stroke="#10b981" strokeWidth="2" />
        
        {/* Content lines on top document */}
        <line x1="22" y1="16" x2="78" y2="16" stroke="#10b981" strokeWidth="1.5" opacity="0.4" />
        <line x1="22" y1="25" x2="78" y2="25" stroke="#10b981" strokeWidth="1" opacity="0.3" />
        <line x1="22" y1="32" x2="50" y2="32" stroke="#10b981" strokeWidth="1" opacity="0.3" />
        
        {/* Checkmark on document */}
        <g transform="translate(65, 50)">
          <circle cx="0" cy="0" r="10" fill="#10b981" />
          <path d="M -4 0 L -1 3 L 3 -2" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        
        {/* Plate number */}
        <rect x="30" y="62" width="35" height="8" rx="2" fill="#10b981" opacity="0.2" stroke="#10b981" strokeWidth="1" />
        <text x="47" y="68" textAnchor="middle" fontSize="5" fontWeight="bold" fill="#10b981">ABC-123</text>
      </g>

      {/* Arrow pointing down */}
      <g transform="translate(140, 110)" opacity="0.5">
        <line x1="0" y1="0" x2="0" y2="30" stroke="#10b981" strokeWidth="2" />
        <path d="M -6 24 L 0 30 L 6 24" stroke="#10b981" strokeWidth="2" fill="none" />
      </g>

      {/* Database icon - storage */}
      <g transform="translate(115, 155)">
        <ellipse cx="0" cy="0" rx="28" ry="8" fill="none" stroke="#10b981" strokeWidth="2" opacity="0.6" />
        <line x1="-28" y1="0" x2="-28" y2="14" stroke="#10b981" strokeWidth="1.5" opacity="0.5" />
        <line x1="28" y1="0" x2="28" y2="14" stroke="#10b981" strokeWidth="1.5" opacity="0.5" />
        <ellipse cx="0" cy="14" rx="28" ry="8" fill="none" stroke="#10b981" strokeWidth="2" opacity="0.6" />
        <text x="0" y="8" textAnchor="middle" fontSize="6" fill="#10b981" opacity="0.7">BASE DE DATOS</text>
      </g>

      {/* Data points flowing */}
      <circle cx="30" cy="120" r="2" fill="#10b981" opacity="0.4" />
      <circle cx="50" cy="130" r="1.5" fill="#10b981" opacity="0.3" />
      <circle cx="70" cy="135" r="1" fill="#10b981" opacity="0.2" />
    </svg>
  );
}

export function PrivateAccessIllustration() {
  return (
    <svg viewBox="0 0 280 200" className="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lockGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {/* Background - portal/gateway feel */}
      <rect x="20" y="30" width="240" height="120" rx="8" fill="url(#lockGrad)" stroke="#10b981" strokeWidth="2" opacity="0.8" />

      {/* Lock icon - main */}
      <g transform="translate(140, 80)">
        {/* Lock body */}
        <rect x="-15" y="0" width="30" height="28" rx="2" fill="none" stroke="#10b981" strokeWidth="2" />
        
        {/* Lock shackle */}
        <path d="M -10 0 Q -10 -15 10 -15 Q 20 -15 20 0" fill="none" stroke="#10b981" strokeWidth="2" />
        
        {/* Keyhole */}
        <circle cx="0" cy="8" r="3.5" fill="none" stroke="#10b981" strokeWidth="1.5" />
        <circle cx="0" cy="16" r="2" fill="none" stroke="#10b981" strokeWidth="1.5" />
        
        {/* Lock glow */}
        <circle cx="0" cy="8" r="7" fill="#10b981" opacity="0.1" />
      </g>

      {/* User icons - authenticated users */}
      <g transform="translate(50, 110)">
        {/* User 1 */}
        <circle cx="0" cy="0" r="5" fill="#10b981" opacity="0.7" />
        <path d="M -8 12 Q -8 8 -4 8 Q 0 8 0 12" fill="#10b981" opacity="0.6" />
        <text x="0" y="24" textAnchor="middle" fontSize="5" fill="#10b981" opacity="0.5">AUTORIZADO</text>
      </g>

      <g transform="translate(240, 110)">
        {/* User 2 */}
        <circle cx="0" cy="0" r="5" fill="#10b981" opacity="0.7" />
        <path d="M -8 12 Q -8 8 -4 8 Q 0 8 0 12" fill="#10b981" opacity="0.6" />
        <text x="0" y="24" textAnchor="middle" fontSize="5" fill="#10b981" opacity="0.5">AUTORIZADO</text>
      </g>

      {/* X mark for unauthorized */}
      <g transform="translate(140, 160)" opacity="0.4">
        <circle cx="0" cy="0" r="8" fill="none" stroke="#ef4444" strokeWidth="1.5" />
        <line x1="-5" y1="-5" x2="5" y2="5" stroke="#ef4444" strokeWidth="1.5" />
        <line x1="5" y1="-5" x2="-5" y2="5" stroke="#ef4444" strokeWidth="1.5" />
        <text x="0" y="20" textAnchor="middle" fontSize="5" fill="#ef4444" opacity="0.6">NO AUTORIZADO</text>
      </g>

      {/* Shield decoration */}
      <g transform="translate(30, 45)" opacity="0.3">
        <path d="M 0 0 L 12 2 L 12 12 Q 6 16 0 14 Q -6 16 -12 12 L -12 2 Z" stroke="#10b981" strokeWidth="1.5" fill="none" />
      </g>

      <g transform="translate(250, 45)" opacity="0.3">
        <path d="M 0 0 L 12 2 L 12 12 Q 6 16 0 14 Q -6 16 -12 12 L -12 2 Z" stroke="#10b981" strokeWidth="1.5" fill="none" />
      </g>
    </svg>
  );
}
