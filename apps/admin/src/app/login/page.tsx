'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) throw signInError;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Oturum oluşturulamadı');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_admin, is_blocked')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.is_admin || profile.is_blocked) {
        await supabase.auth.signOut();
        throw new Error('Bu hesap admin yetkisine sahip değil.');
      }

      router.replace('/review');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Giriş başarısız');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-[#E2E8F0] bg-white p-8 shadow-sm"
      >
        <p className="text-sm font-semibold uppercase tracking-wide text-[#2563EB]">
          Hayat Ağı Admin
        </p>
        <h1 className="mt-2 text-2xl font-bold text-[#102A43]">Giriş</h1>
        <p className="mt-2 text-sm text-[#64748B]">
          Belge incelemesi için admin hesabınızla giriş yapın.
        </p>

        <label className="mt-6 block text-sm font-medium text-[#0F172A]">
          E-posta
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2"
          />
        </label>

        <label className="mt-4 block text-sm font-medium text-[#0F172A]">
          Şifre
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2"
          />
        </label>

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-lg bg-[#2563EB] px-4 py-2.5 font-semibold text-white disabled:opacity-60"
        >
          {loading ? 'Giriş yapılıyor...' : 'Giriş yap'}
        </button>
      </form>
    </main>
  );
}
