import Image from 'next/image';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://danielapalaciosalon.vercel.app';
const REGISTER_URL = `${BASE_URL}/tarjeta/registrar`;

export default function SalonLoyaltyPage() {
  const qrSrc = `/api/qr?data=${encodeURIComponent(REGISTER_URL)}`;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
      style={{ background: 'linear-gradient(160deg, #16181E 0%, #1e1a17 100%)' }}
    >
      {/* Header */}
      <div className="mb-10 text-center">
        <p className="text-[9px] tracking-[0.35em] uppercase text-[#81807F] mb-3">
          Daniela Palacio Hair Room
        </p>
        <h1
          className="text-4xl font-light text-[#F0EDE8] leading-tight"
          style={{ fontFamily: 'var(--font-display, serif)' }}
        >
          Tarjeta de<br />clienta frecuente
        </h1>
      </div>

      {/* QR card */}
      <div
        className="bg-[#F0EDE8] rounded-sm p-6 flex flex-col items-center gap-4 shadow-2xl"
        style={{ width: 260 }}
      >
        <img
          src={qrSrc}
          alt="QR para registrar tarjeta"
          width={200}
          height={200}
          style={{ display: 'block' }}
        />
        <div className="text-center">
          <p className="text-[#16181E] text-xs tracking-[0.15em] uppercase font-semibold">
            Escanéame
          </p>
          <p className="text-[#6B6560] text-[10px] tracking-wider mt-0.5">
            para guardar tu tarjeta
          </p>
        </div>
      </div>

      {/* Reward info */}
      <div className="mt-8 text-center max-w-xs">
        <div className="flex items-center justify-center gap-3 mb-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="w-2.5 h-2.5 rounded-full border border-[#81807F]/50"
              style={{ background: i < 3 ? '#F0EDE8' : 'transparent' }}
            />
          ))}
        </div>
        <p className="text-[#81807F] text-[11px] tracking-[0.1em] leading-relaxed">
          Acumula <span className="text-[#F0EDE8]">10 visitas</span> y obtén un<br />
          tratamiento de regalo
        </p>
      </div>

      {/* Direct link for mobile */}
      <a
        href={REGISTER_URL}
        className="mt-8 text-[10px] tracking-[0.2em] uppercase text-[#81807F] underline underline-offset-4 hover:text-[#F0EDE8] transition-colors"
      >
        O toca aquí para registrarte
      </a>
    </div>
  );
}
