interface Props { 
  score: number; 
  label: string; 
}

export default function RiskGauge({ score, label }: Props) {
  const radius = 80;
  const circumference = Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  
  const colors: Record<string, string> = {
    LOW: "#10b981", 
    MEDIUM: "#f59e0b",
    HIGH: "#ef4444", 
    CRITICAL: "#dc2626",
  };
  
  const color = colors[label] ?? "#6b7280";
  
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }} className="py-6">
      <svg width="200" height="120" viewBox="0 0 200 120">
        <defs>
          <filter id="gauge-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Track */}
        <path d="M 20,100 A 80,80 0 0,1 180,100"
          fill="none" stroke="#101322" strokeWidth="16" strokeLinecap="round" />
        {/* Fill */}
        <path d="M 20,100 A 80,80 0 0,1 180,100"
          fill="none" stroke={color} strokeWidth="16" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          filter="url(#gauge-glow)"
          style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)" }} />
        <text x="100" y="85" textAnchor="middle" fill="white" fontSize="36" fontWeight="900" className="drop-shadow-lg">
          {score}
        </text>
        <text x="100" y="108" textAnchor="middle" fill="#6b7280" fontSize="12" fontWeight="600" className="uppercase tracking-widest">
          Risk Score
        </text>
      </svg>
      <div className="mt-2 text-xs font-extrabold uppercase tracking-widest px-4 py-1.5 rounded-full border border-zinc-800" style={{ color, backgroundColor: `${color}1A`, borderColor: `${color}33` }}>
        {label} RISK
      </div>
    </div>
  );
}
