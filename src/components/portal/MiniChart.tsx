type Props = {
  className?: string;
  colorA?: string;
  colorB?: string;
  gradientId?: string;
};

export default function MiniChart({
  className,
  colorA = "#06b6d4",
  colorB = "#6366f1",
  gradientId = "chartGrad",
}: Props) {
  return (
    <svg
      viewBox="0 0 400 140"
      className={className ?? "h-36 w-full"}
      preserveAspectRatio="none"
      role="img"
      aria-label="Haftalık trend"
    >
      <defs>
        <linearGradient id={`${gradientId}Line`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor={colorA} />
          <stop offset="100%" stopColor={colorB} />
        </linearGradient>
        <linearGradient id={`${gradientId}Fill`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={colorA} stopOpacity="0.28" />
          <stop offset="100%" stopColor={colorB} stopOpacity="0" />
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
        fill={`url(#${gradientId}Fill)`}
      />
      <path
        d="M0,100 C40,85 70,50 110,62 C150,75 180,110 220,90 C260,72 290,35 330,42 C360,48 380,35 400,28"
        fill="none"
        stroke={`url(#${gradientId}Line)`}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M0,110 C40,104 80,85 120,90 C160,96 200,80 240,82 C280,84 320,68 360,62 C380,58 390,55 400,52"
        fill="none"
        stroke={colorB}
        strokeOpacity="0.45"
        strokeWidth="1.5"
        strokeDasharray="3 3"
      />
    </svg>
  );
}
