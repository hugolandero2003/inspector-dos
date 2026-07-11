export function FleetIllustration() {
  return (
    <svg
      viewBox="0 0 320 200"
      className="w-full h-auto"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background gradient reference */}
      <defs>
        <linearGradient id="busGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#059669" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="truckGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#059669" stopOpacity="0.03" />
        </linearGradient>
      </defs>

      {/* Large truck - right side */}
      <g opacity="0.85">
        {/* Body */}
        <rect x="220" y="80" width="85" height="45" rx="6" fill="url(#truckGrad)" stroke="#10b981" strokeWidth="1.5" />
        {/* Cabin */}
        <rect x="220" y="70" width="25" height="15" rx="3" fill="#10b981" opacity="0.25" stroke="#059669" strokeWidth="1" />
        {/* Windows */}
        <rect x="223" y="72" width="7" height="6" fill="#e0f2fe" opacity="0.6" rx="1" />
        <rect x="233" y="72" width="7" height="6" fill="#e0f2fe" opacity="0.6" rx="1" />
        {/* Wheels */}
        <circle cx="232" cy="126" r="5" fill="#1f2937" />
        <circle cx="290" cy="126" r="5" fill="#1f2937" />
        {/* Accent line */}
        <line x1="220" y1="95" x2="305" y2="95" stroke="#10b981" strokeWidth="1.5" opacity="0.4" />
      </g>

      {/* Medium van - center */}
      <g opacity="0.9" transform="translate(-20, 15)">
        {/* Body */}
        <rect x="160" y="90" width="65" height="38" rx="5" fill="url(#busGrad)" stroke="#10b981" strokeWidth="1.5" />
        {/* Side door */}
        <rect x="175" y="95" width="30" height="28" rx="2" fill="none" stroke="#10b981" strokeWidth="1" opacity="0.6" />
        {/* Windows */}
        <rect x="165" y="94" width="8" height="8" fill="#e0f2fe" opacity="0.5" rx="1" />
        <rect x="177" y="94" width="14" height="8" fill="#e0f2fe" opacity="0.5" rx="1" />
        <rect x="196" y="94" width="8" height="8" fill="#e0f2fe" opacity="0.5" rx="1" />
        <rect x="208" y="94" width="11" height="8" fill="#e0f2fe" opacity="0.5" rx="1" />
        {/* Wheels */}
        <circle cx="178" cy="129" r="4.5" fill="#1f2937" />
        <circle cx="220" cy="129" r="4.5" fill="#1f2937" />
      </g>

      {/* Small car - left side */}
      <g opacity="0.8" transform="translate(10, 5)">
        {/* Body */}
        <path
          d="M 50 110 L 60 100 L 100 100 L 110 110 Z"
          fill="url(#truckGrad)"
          stroke="#10b981"
          strokeWidth="1.5"
        />
        {/* Windows */}
        <path d="M 64 101 L 74 101 L 72 106 L 66 106 Z" fill="#e0f2fe" opacity="0.5" />
        <path d="M 78 101 L 96 101 L 94 106 L 80 106 Z" fill="#e0f2fe" opacity="0.5" />
        {/* Wheels */}
        <circle cx="65" cy="112" r="4" fill="#1f2937" />
        <circle cx="100" cy="112" r="4" fill="#1f2937" />
        {/* Accent */}
        <line x1="50" y1="108" x2="110" y2="108" stroke="#10b981" strokeWidth="1" opacity="0.3" />
      </g>

      {/* Decorative dots - status indicators */}
      <g opacity="0.4">
        <circle cx="40" cy="30" r="2.5" fill="#10b981" />
        <circle cx="80" cy="25" r="2" fill="#10b981" />
        <circle cx="140" cy="35" r="2.5" fill="#10b981" />
        <circle cx="200" cy="28" r="2" fill="#10b981" />
        <circle cx="270" cy="32" r="2.5" fill="#10b981" />
      </g>

      {/* Connecting lines - network effect */}
      <g stroke="#10b981" strokeWidth="0.8" opacity="0.15" strokeDasharray="2,2">
        <line x1="60" y1="50" x2="100" y2="90" />
        <line x1="120" y1="55" x2="160" y2="95" />
        <line x1="200" y1="50" x2="240" y2="85" />
      </g>
    </svg>
  );
}
