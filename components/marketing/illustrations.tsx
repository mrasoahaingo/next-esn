/* Editorial line illustrations for the marketing landing.
 * Server components, pure SVG. Colours reference theme tokens via var(--…)
 * so they adapt to light/dark automatically. No raster assets, no stock. */

const SANS = { fontFamily: 'var(--font-geist-sans)' } as const;
const MONO = {
  fontFamily: 'var(--font-geist-mono)',
  fontVariantNumeric: 'tabular-nums',
} as const;

type Props = { className?: string };

/* Hero — a positioning result rendered as a clean card illustration. */
export function PositioningArt({ className }: Props) {
  return (
    <svg
      viewBox="0 0 360 300"
      role="img"
      aria-label="Aperçu d’un positionnement : consultant, score de correspondance, points forts et écarts."
      className={className}
      style={SANS}
    >
      <rect x="6" y="10" width="348" height="280" rx="18" fill="var(--card)" stroke="var(--border)" />

      <text x="26" y="42" fontSize="10" letterSpacing="1.6" fill="var(--muted-foreground)">
        POSITIONNEMENT
      </text>
      <rect x="252" y="28" width="80" height="22" rx="11" fill="var(--primary)" fillOpacity="0.12" />
      <text x="292" y="43" fontSize="10" fontWeight="600" textAnchor="middle" fill="var(--primary)">
        Validé
      </text>

      <circle cx="44" cy="84" r="18" fill="var(--primary)" fillOpacity="0.15" />
      <text x="44" y="89" fontSize="13" fontWeight="600" textAnchor="middle" fill="var(--primary)">
        AM
      </text>
      <text x="72" y="80" fontSize="13" fontWeight="600" fill="var(--foreground)">
        Alex Martin
      </text>
      <text x="72" y="98" fontSize="10.5" fill="var(--muted-foreground)">
        Lead Front-end · React / TypeScript
      </text>

      <rect x="26" y="122" width="308" height="70" rx="12" fill="var(--secondary)" stroke="var(--border)" />
      <text x="42" y="150" fontSize="11" fill="var(--muted-foreground)">
        Correspondance
      </text>
      <text x="318" y="155" fontSize="26" fontWeight="600" textAnchor="end" fill="var(--primary)" style={MONO}>
        84%
      </text>
      <rect x="42" y="166" width="276" height="8" rx="4" fill="var(--line)" />
      <rect x="42" y="166" width="232" height="8" rx="4" fill="var(--primary)" />

      <rect x="26" y="208" width="150" height="64" rx="12" fill="var(--secondary)" stroke="var(--border)" />
      <text x="42" y="234" fontSize="10.5" fontWeight="600" fill="var(--primary)">
        Points forts
      </text>
      <text x="42" y="252" fontSize="10" fill="var(--muted-foreground)">
        Stack alignée · 8 ans
      </text>

      <rect x="184" y="208" width="150" height="64" rx="12" fill="var(--secondary)" stroke="var(--border)" />
      <text x="200" y="234" fontSize="10.5" fontWeight="600" fill="var(--muted-foreground)">
        Écarts
      </text>
      <text x="200" y="252" fontSize="10" fill="var(--muted-foreground)">
        1 certif à confirmer
      </text>
    </svg>
  );
}

/* Extraction — document with skeleton lines flowing into extracted tags. */
export function ExtractionArt({ className }: Props) {
  const tags = ['React', 'Senior', 'FR · EN', '8 ans'];
  return (
    <svg viewBox="0 0 320 200" role="presentation" className={className} style={SANS} aria-hidden="true">
      <rect x="20" y="22" width="118" height="156" rx="10" fill="var(--card)" stroke="var(--border)" />
      <rect x="36" y="40" width="68" height="8" rx="4" fill="var(--muted-foreground)" fillOpacity="0.55" />
      {[70, 92, 114, 136, 158].map((y, i) => (
        <rect key={y} x="36" y={y} width={[86, 60, 78, 48, 70][i]} height="6" rx="3" fill="var(--line)" />
      ))}

      <path d="M 150 100 H 188" stroke="var(--muted-foreground)" strokeWidth="1.5" />
      <path d="M 182 94 L 190 100 L 182 106" fill="none" stroke="var(--muted-foreground)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

      {tags.map((t, i) => (
        <g key={t}>
          <rect x="206" y={34 + i * 36} width="94" height="26" rx="13" fill="var(--primary)" fillOpacity="0.1" stroke="var(--primary)" strokeOpacity="0.4" />
          <text x="253" y={51 + i * 36} fontSize="11.5" fontWeight="500" textAnchor="middle" fill="var(--primary)">
            {t}
          </text>
        </g>
      ))}
    </svg>
  );
}

/* Mission — a brief with key points called out by accent checks. */
export function MissionArt({ className }: Props) {
  return (
    <svg viewBox="0 0 320 200" role="presentation" className={className} style={SANS} aria-hidden="true">
      <rect x="40" y="18" width="240" height="164" rx="12" fill="var(--card)" stroke="var(--border)" />
      <rect x="64" y="40" width="120" height="9" rx="4.5" fill="var(--muted-foreground)" fillOpacity="0.5" />
      {[78, 110, 142].map((y, i) => (
        <g key={y}>
          <rect x="64" y={y} width={[150, 134, 120][i]} height="7" rx="3.5" fill="var(--line)" />
          <circle cx="248" cy={y + 3} r="11" fill="var(--primary)" fillOpacity="0.15" />
          <path
            d={`M ${243} ${y + 3} l 3 3 l 6 -7`}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      ))}
    </svg>
  );
}

/* Matching — a half-gauge dialed to the correspondence score. */
export function GaugeArt({ className }: Props) {
  return (
    <svg viewBox="0 0 320 200" role="presentation" className={className} style={SANS} aria-hidden="true">
      <path d="M 50 168 A 110 110 0 0 1 270 168" fill="none" stroke="var(--line)" strokeWidth="16" strokeLinecap="round" pathLength={100} />
      <path
        d="M 50 168 A 110 110 0 0 1 270 168"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="16"
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray="84 100"
      />
      <text x="160" y="150" fontSize="40" fontWeight="600" textAnchor="middle" fill="var(--primary)" style={MONO}>
        84%
      </text>
      <text x="160" y="184" fontSize="12" textAnchor="middle" fill="var(--muted-foreground)">
        Correspondance
      </text>
    </svg>
  );
}
