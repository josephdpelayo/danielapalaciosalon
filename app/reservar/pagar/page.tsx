'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CreditCard, Lock, Check, X } from 'lucide-react';

function PagarContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const id = searchParams.get('id') ?? '';
  const amount = searchParams.get('amount') ?? '200';
  const service = searchParams.get('service') ?? 'Servicio';
  const date = searchParams.get('date') ?? '';
  const time = searchParams.get('time') ?? '';

  const [paying, setPaying] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [name, setName] = useState('');

  const formatCard = (v: string) =>
    v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();

  const formatExpiry = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 4);
    return d.length >= 3 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  };

  const handlePay = async () => {
    setPaying(true);
    // Simulate network delay
    await new Promise((r) => setTimeout(r, 2000));

    // Mark appointment as confirmed via API
    try {
      await fetch('/api/admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'confirmed', payment_status: 'approved', payment_id: 'MOCK-' + Date.now() }),
      });
    } catch {}

    router.push(`/reservar/exito?id=${id}`);
  };

  const handleCancel = () => {
    router.push(`/reservar/cancelado?id=${id}`);
  };

  const isValid = name.trim() && cardNumber.replace(/\s/g, '').length === 16 && expiry.length === 5 && cvv.length >= 3;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F0F0F0' }}>
      {/* MP-style header */}
      <div className="bg-[#009EE3] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
            <span className="text-[#009EE3] font-black text-xs">MP</span>
          </div>
          <span className="text-white font-semibold text-sm">Mercado Pago</span>
          <span className="text-blue-200 text-xs hidden sm:block">— Entorno de prueba</span>
        </div>
        <div className="flex items-center gap-1.5 text-white/80 text-xs">
          <Lock size={12} />
          <span>Pago seguro</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row max-w-3xl mx-auto w-full gap-0 md:gap-6 p-4 md:p-8">
        {/* Order summary */}
        <div className="bg-white rounded-lg p-5 md:w-64 md:shrink-0 mb-4 md:mb-0 md:self-start">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Resumen de pago</p>
          <div className="border-b border-gray-100 pb-4 mb-4">
            <p className="font-semibold text-gray-800 text-sm mb-1">Anticipo — {service}</p>
            {date && <p className="text-gray-400 text-xs">{date}</p>}
            {time && <p className="text-gray-400 text-xs">{time}</p>}
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-sm">Total</span>
            <span className="font-bold text-gray-900 text-lg">${amount} MXN</span>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-gray-400">
            <Lock size={11} />
            <span>Tus datos están protegidos</span>
          </div>
        </div>

        {/* Payment form */}
        <div className="bg-white rounded-lg p-5 flex-1">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-4">Tarjeta de crédito o débito</p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Número de tarjeta</label>
              <div className="relative">
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCard(e.target.value))}
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                  className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm pr-10 focus:outline-none focus:border-[#009EE3]"
                />
                <CreditCard size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300" />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Nombre en la tarjeta</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.toUpperCase())}
                placeholder="NOMBRE APELLIDO"
                className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-[#009EE3]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Vencimiento</label>
                <input
                  type="text"
                  value={expiry}
                  onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                  placeholder="MM/AA"
                  maxLength={5}
                  className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-[#009EE3]"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">CVV</label>
                <input
                  type="text"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="123"
                  maxLength={4}
                  className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-[#009EE3]"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handlePay}
            disabled={!isValid || paying}
            className="w-full mt-5 py-3.5 rounded font-semibold text-white text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            style={{ background: paying ? '#7CC8EF' : '#009EE3' }}
          >
            {paying ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Procesando pago...</>
            ) : (
              <><Check size={16} /> Pagar ${amount} MXN</>
            )}
          </button>

          <button
            onClick={handleCancel}
            disabled={paying}
            className="w-full mt-3 py-2.5 text-sm text-gray-400 hover:text-gray-600 transition-colors flex items-center justify-center gap-1.5"
          >
            <X size={14} /> Cancelar y volver
          </button>

          <p className="text-center text-[10px] text-gray-300 mt-4">
            Simulación de pago — sin cargos reales
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PagarPage() {
  return <Suspense><PagarContent /></Suspense>;
}
