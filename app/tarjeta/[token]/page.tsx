'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Scissors, Star, ExternalLink } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://danielapalaciosalon.vercel.app';

interface CardData {
  name: string;
  visit_count: number;
  cycle_stamps: number;
  reward_at: number;
  rewards_earned: number;
  pass_url: string | null;
  visits: { created_at: string; notes: string | null; stamped_by: string }[];
}

export default function ClientCardPage() {
  const { token } = useParams<{ token: string }>();
  const [card, setCard]     = useState<CardData | null>(null);
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(true);

  const cardUrl = `${BASE_URL}/tarjeta/${token}`;
  const qrSrc   = `/api/qr?data=${encodeURIComponent(cardUrl)}`;

  useEffect(() => {
    fetch(`/api/loyalty/card/${token}`)
      .then((r) => r.json())
      .then((d) => { if (d.error) setError(d.error); else setCard(d as CardData); })
      .catch(() => setError('Error al cargar tu tarjeta'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#16181E' }}>
        <div className="w-6 h-6 border-2 border-[#81807F] border-t-[#F0EDE8] rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#16181E' }}>
        <p className="text-red-400 text-sm mb-4">{error || 'Tarjeta no encontrada'}</p>
        <a href="/tarjeta/registrar" className="text-[#F0EDE8] text-xs tracking-wider underline">
          Registrarme
        </a>
      </div>
    );
  }

  const { name, cycle_stamps, reward_at, rewards_earned, visit_count, pass_url, visits } = card;
  const pct = Math.round((cycle_stamps / reward_at) * 100);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(160deg, #16181E 0%, #1e1a17 100%)' }}
    >
      {/* Top bar */}
      <div className="px-5 pt-10 pb-0 text-center">
        <p className="text-[9px] tracking-[0.35em] uppercase text-[#81807F]">
          Daniela Palacio Hair Room
        </p>
      </div>

      {/* Card */}
      <div className="flex-1 flex flex-col items-center px-5 py-8 gap-6">
        {/* Physical card visual */}
        <div
          className="w-full max-w-sm rounded-sm overflow-hidden shadow-2xl"
          style={{ background: 'linear-gradient(135deg, #1C1A19 0%, #24201C 50%, #1C1A19 100%)', border: '1px solid rgba(240,237,232,0.08)' }}
        >
          {/* Card top */}
          <div className="px-6 pt-6 pb-4 flex justify-between items-start">
            <div>
              <p className="text-[9px] tracking-[0.3em] uppercase text-[#81807F]">Clienta</p>
              <p className="text-[#F0EDE8] text-lg font-light mt-0.5" style={{ fontFamily: 'var(--font-display, serif)' }}>
                {name}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] tracking-[0.2em] uppercase text-[#81807F]">Recompensas</p>
              <p className="text-[#F0EDE8] text-lg font-light">{rewards_earned}</p>
            </div>
          </div>

          {/* Stamp grid */}
          <div className="px-6 pb-5">
            <p className="text-[9px] tracking-[0.2em] uppercase text-[#81807F] mb-3">
              Visitas — {cycle_stamps}/{reward_at}
            </p>
            <div className="grid grid-cols-5 gap-2.5">
              {Array.from({ length: reward_at }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-full flex items-center justify-center border"
                  style={{
                    borderColor: i < cycle_stamps ? 'rgba(240,237,232,0.5)' : 'rgba(240,237,232,0.1)',
                    background: i < cycle_stamps ? 'rgba(240,237,232,0.08)' : 'transparent',
                  }}
                >
                  {i < cycle_stamps ? (
                    <Scissors size={12} className="text-[#F0EDE8]/80" strokeWidth={1.5} />
                  ) : (
                    <div className="w-1 h-1 rounded-full bg-[#81807F]/30" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Progress bar */}
          <div className="px-6 pb-6">
            <div className="h-px bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#F0EDE8]/30 transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <p className="text-[9px] text-[#81807F] tracking-wider">{visit_count} visitas totales</p>
              <p className="text-[9px] text-[#81807F] tracking-wider">{reward_at - cycle_stamps} para siguiente regalo</p>
            </div>
          </div>
        </div>

        {/* Apple/Google Wallet button */}
        {pass_url && (
          <a
            href={pass_url}
            className="w-full max-w-sm flex items-center justify-center gap-2 border border-[#F0EDE8]/20 text-[#F0EDE8] py-3 text-[11px] tracking-[0.2em] uppercase hover:bg-white/5 transition-colors"
          >
            <Star size={12} strokeWidth={1.5} />
            Guardar en Apple / Google Wallet
            <ExternalLink size={11} className="opacity-50" />
          </a>
        )}

        {/* QR code for Daniela to scan */}
        <div className="w-full max-w-sm border border-white/8 p-5 flex flex-col items-center gap-3">
          <p className="text-[9px] tracking-[0.25em] uppercase text-[#81807F]">
            Mi código — para sellar visitas
          </p>
          <img
            src={qrSrc}
            alt="Mi QR de fidelidad"
            width={140}
            height={140}
            style={{ borderRadius: 4 }}
          />
          <p className="text-[9px] text-[#444] tracking-wider text-center">
            Muéstraselo a Daniela al terminar tu visita
          </p>
        </div>

        {/* Visit history */}
        {visits.length > 0 && (
          <div className="w-full max-w-sm">
            <p className="text-[9px] tracking-[0.25em] uppercase text-[#81807F] mb-3">Historial</p>
            <div className="space-y-1">
              {visits.slice(0, 10).map((v, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-[#81807F] text-xs">
                    {format(parseISO(v.created_at), "d 'de' MMMM yyyy", { locale: es })}
                  </span>
                  <span className="text-[#F0EDE8]/40 text-[10px] tracking-wider">
                    {v.notes ?? '✓'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="py-6 text-center">
        <p className="text-[9px] text-[#333] tracking-wider">danielapalaciosalon.vercel.app</p>
      </div>
    </div>
  );
}
