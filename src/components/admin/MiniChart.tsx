type Props = {
  className?: string;
};

export default function MiniChart({ className }: Props) {
  return (
    <svg
      viewBox="0 0 400 140"
      className={className ?? "h-36 w-full"}
      preserveAspectRatio="none"
      role="img"
      aria-label="Haftalık giriş trendi"
    >
      <defs>
        <linearGradient id="adminChartLine" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
        <linearGradient id="adminChartFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[28, 56, 84, 112].map((y) => (
        <line
          key={y}
          x1="0"
          x2="400"
          y1={y}
          y2={y}
          stroke="currentColor"
          strokeOpacity="0.08"
        />
      ))}
      <path
        d="M0,100 C40,85 70,50 110,62 C150,75 180,110 220,90 C260,72 290,35 330,42 C360,48 380,35 400,28 L400,140 L0,140 Z"
        fill="url(#adminChartFill)"
      />
      <path
        d="M0,100 C40,85 70,50 110,62 C150,75 180,110 220,90 C260,72 290,35 330,42 C360,48 380,35 400,28"
        fill="none"
        stroke="url(#adminChartLine)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M0,110 C40,104 80,85 120,90 C160,96 200,80 240,82 C280,84 320,68 360,62 C380,58 390,55 400,52"
        fill="none"
        stroke="#6366f1"
        strokeOpacity="0.45"
        strokeWidth="1.5"
        strokeDasharray="3 3"
      />
    </svg>
  );
}
