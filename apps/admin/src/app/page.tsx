import Link from 'next/link';

export default function AdminHomePage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#2563EB]">Hayat Ağı Admin</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-[#102A43]">
          Operasyon paneli
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-[#64748B]">
          Sprint 4: Yardımcı belge inceleme. Tam dashboard Sprint 8&apos;de genişletilecek.
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/login"
            className="rounded-xl bg-[#2563EB] px-6 py-3 font-semibold text-white shadow-sm"
          >
            Admin girişi
          </Link>
          <Link
            href="/review"
            className="rounded-xl border border-[#E2E8F0] bg-white px-6 py-3 font-semibold text-[#334155] shadow-sm"
          >
            Belge inceleme
          </Link>
        </div>

        <div className="mt-10 rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#0F172A]">Kurulum hatırlatması</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-[#64748B]">
            <li>SQL: 0001 + 0002 storage migration</li>
            <li>Admin: profiles.is_admin = true</li>
            <li>Deploy: verify-document-status Edge Function</li>
            <li>apps/admin/.env.local — Supabase URL + anon key</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
