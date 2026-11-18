'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { QrCode, User, ArrowRight, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [pinDigits, setPinDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handlePinChange = (index: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const updated = [...pinDigits];
    updated[index] = digit;
    setPinDigits(updated);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const pin = pinDigits.join('');

    if (pin.length !== 6) {
      setError('Masukkan lengkap 6 digit angka PIN.');
      return;
    }

    setLoading(true);
    try {
      const { data, error: dbError } = await supabase
        .from('tenders')
        .select('*')
        .eq('username', username.trim().toLowerCase())
        .eq('pin_code', pin)
        .single();

      if (dbError || !data) {
        setError('Nama akun atau PIN 6 digit tidak cocok.');
        setLoading(false);
        return;
      }

      if (!data.is_active) {
        setError('Akun ini sedang dinonaktifkan oleh Admin Reyyztore.');
        setLoading(false);
        return;
      }

      localStorage.setItem('reyyztore_session', JSON.stringify({
        id: data.id,
        username: data.username,
        role: data.role,
        business_name: data.business_name,
        slug: data.slug,
      }));

      router.push(data.role === 'admin' ? '/admin' : '/dashboard');
    } catch {
      setError('Gagal terhubung ke server.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-[#050811]">
      {/* Ambient Glow Orbs */}
      <div className="absolute -top-24 -left-24 w-80 h-80 bg-indigo-600/25 rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-fuchsia-600/20 rounded-full blur-[110px] pointer-events-none" />

      <div className="w-full max-w-md glass-panel rounded-[2rem] p-8 relative z-10 animate-fade-up">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 p-[1px] shadow-lg shadow-indigo-500/30 mb-4 animate-float">
            <div className="w-full h-full bg-slate-950/90 rounded-2xl flex items-center justify-center">
              <QrCode className="w-8 h-8 text-indigo-400" />
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-[11px] font-medium text-indigo-300 mb-2">
            <Sparkles className="w-3 h-3" /> Reyyztore Multi-QR System
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Selamat Datang</h1>
          <p className="text-xs text-slate-400 mt-1">Masuk menggunakan Nama Akun & 6 Digit PIN</p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2">
              Nama Akun
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username..."
                className="w-full pl-11 pr-4 py-3.5 bg-slate-950/80 border border-white/10 rounded-2xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2.5">
              Kata Sandi (6 Digit Angka)
            </label>
            <div className="grid grid-cols-6 gap-2">
              {pinDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => { inputRefs.current[idx] = el; }}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handlePinChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  className="w-full aspect-square text-center text-lg font-bold font-mono bg-slate-950/90 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-5 bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 hover:brightness-110 disabled:opacity-50 text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 transition shadow-xl shadow-indigo-600/25"
          >
            {loading ? 'Memverifikasi Akses...' : 'Masuk Dashboard'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-8 pt-4 border-t border-white/5 text-center text-[11px] text-slate-500">
          Powered by <span className="text-slate-300 font-semibold">Reyyztore</span>
        </div>
      </div>
    </div>
  );
}
