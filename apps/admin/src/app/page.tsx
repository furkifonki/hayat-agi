export default function AdminHomePage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#2563EB]">Hayat Ağı Admin</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-[#102A43]">
          Operasyon paneli — Sprint 0/1
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-[#64748B]">
          Admin dashboard Sprint 8&apos;de geliştirilecek. Şimdilik monorepo altyapısı,
          Supabase bağlantısı ve dokümantasyon hazır.
        </p>
        <div className="mt-10 rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#0F172A]">Sonraki adımlar</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-[#64748B]">
            <li>Supabase migration çalıştırın</li>
            <li>.env.local dosyasını doldurun</li>
            <li>Admin kullanıcısı oluşturup is_admin = true yapın</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
