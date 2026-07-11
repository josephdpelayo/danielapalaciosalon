/**
 * Check animado en círculo — el mismo motivo ya usado en
 * app/reservar/exito/page.tsx y app/confirmar/page.tsx, generalizado
 * a componente compartido.
 */
export function SuccessCheck({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" fill="none">
      <circle
        cx="26"
        cy="26"
        r="24"
        stroke="#81807F"
        strokeWidth="1.5"
        style={{
          strokeDasharray: 151,
          strokeDashoffset: 151,
          animation: 'drawCircle 0.5s ease-out forwards',
        }}
      />
      <path
        d="M15 27l7 7 15-15"
        stroke="#F5F0E8"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: 36,
          strokeDashoffset: 36,
          animation: 'drawCheck 0.35s ease-out 0.4s forwards',
        }}
      />
      <style>{`
        @keyframes drawCircle { to { stroke-dashoffset: 0; } }
        @keyframes drawCheck { to { stroke-dashoffset: 0; } }
      `}</style>
    </svg>
  );
}
