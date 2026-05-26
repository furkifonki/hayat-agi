'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { DOCUMENT_TYPE_LABELS, RESPONDER_TYPE_LABELS } from '@hayat-agi/shared';
import type { DocumentType, ResponderType } from '@hayat-agi/shared';
import { verifyDocument } from '@/lib/verify-document';
import { createClient } from '@/lib/supabase/client';

interface ProfileSnippet {
  full_name: string;
  email: string | null;
  phone: string | null;
}

interface ResponderSnippet {
  responder_type: ResponderType;
  verification_status: string;
}

interface PendingDocumentRow {
  id: string;
  document_type: DocumentType;
  storage_path: string;
  created_at: string;
  user_id: string;
  profiles: ProfileSnippet | null;
  responder_profiles: ResponderSnippet | null;
}

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default function DocumentReviewPage() {
  const [rows, setRows] = useState<PendingDocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      window.location.href = '/login';
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', session.user.id)
      .single();

    if (!profile?.is_admin) {
      setError('Admin yetkisi gerekli.');
      setLoading(false);
      return;
    }

    const { data, error: queryError } = await supabase
      .from('responder_documents')
      .select(
        `
        id,
        document_type,
        storage_path,
        created_at,
        user_id,
        profiles (
          full_name,
          email,
          phone
        ),
        responder_profiles (
          responder_type,
          verification_status
        )
      `,
      )
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (queryError) {
      setError(queryError.message);
      setLoading(false);
      return;
    }

    const normalized: PendingDocumentRow[] = (data ?? []).map((row) => ({
      id: row.id,
      document_type: row.document_type as DocumentType,
      storage_path: row.storage_path,
      created_at: row.created_at,
      user_id: row.user_id,
      profiles: firstOrNull(row.profiles as ProfileSnippet | ProfileSnippet[] | null),
      responder_profiles: firstOrNull(
        row.responder_profiles as ResponderSnippet | ResponderSnippet[] | null,
      ),
    }));

    setRows(normalized);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  async function handleApprove(documentId: string) {
    try {
      setActionId(documentId);
      await verifyDocument({ document_id: documentId, action: 'approve' });
      await loadQueue();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Onay başarısız');
    } finally {
      setActionId(null);
    }
  }

  async function handleReject(documentId: string) {
    const reason = rejectReason[documentId]?.trim();
    if (!reason || reason.length < 3) {
      alert('Red nedeni en az 3 karakter olmalı.');
      return;
    }

    try {
      setActionId(documentId);
      await verifyDocument({
        document_id: documentId,
        action: 'reject',
        rejection_reason: reason,
      });
      await loadQueue();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Red başarısız');
    } finally {
      setActionId(null);
    }
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#2563EB]">
              Sprint 4 — Belge inceleme
            </p>
            <h1 className="mt-1 text-3xl font-bold text-[#102A43]">Bekleyen belgeler</h1>
          </div>
          <div className="flex gap-3">
            <Link
              href="/"
              className="rounded-lg border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-medium text-[#334155]"
            >
              Ana sayfa
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-medium text-[#334155]"
            >
              Çıkış
            </button>
          </div>
        </div>

        {loading ? <p className="mt-8 text-[#64748B]">Yükleniyor...</p> : null}
        {error ? <p className="mt-8 text-red-600">{error}</p> : null}

        {!loading && !error && rows.length === 0 ? (
          <p className="mt-8 rounded-xl border border-[#E2E8F0] bg-white p-6 text-[#64748B]">
            Bekleyen belge yok.
          </p>
        ) : null}

        <ul className="mt-8 space-y-4">
          {rows.map((row) => {
            const profile = row.profiles;
            const responder = row.responder_profiles;
            const busy = actionId === row.id;

            return (
              <li
                key={row.id}
                className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold text-[#0F172A]">
                      {profile?.full_name ?? '—'}
                    </h2>
                    <p className="text-sm text-[#64748B]">
                      {profile?.email ?? '—'} · {profile?.phone ?? '—'}
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                    Beklemede
                  </span>
                </div>

                <dl className="mt-4 grid gap-2 text-sm text-[#334155] sm:grid-cols-2">
                  <div>
                    <dt className="font-medium text-[#64748B]">Rol</dt>
                    <dd>
                      {responder?.responder_type
                        ? RESPONDER_TYPE_LABELS[responder.responder_type]
                        : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-[#64748B]">Belge tipi</dt>
                    <dd>{DOCUMENT_TYPE_LABELS[row.document_type]}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="font-medium text-[#64748B]">Depolama yolu</dt>
                    <dd className="break-all font-mono text-xs">{row.storage_path}</dd>
                  </div>
                </dl>

                <label className="mt-4 block text-sm font-medium text-[#0F172A]">
                  Red nedeni (reddederseniz)
                  <input
                    value={rejectReason[row.id] ?? ''}
                    onChange={(e) =>
                      setRejectReason((prev) => ({ ...prev, [row.id]: e.target.value }))
                    }
                    placeholder="Örn. belge okunamıyor"
                    className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm"
                  />
                </label>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleApprove(row.id)}
                    className="rounded-lg bg-[#16A34A] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    Onayla
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleReject(row.id)}
                    className="rounded-lg bg-[#DC2626] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    Reddet
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        <p className="mt-8 text-xs text-[#94A3B8]">
          Onay sonrası kullanıcıya bildirim kuyruğa alınır. Edge Function deploy:{' '}
          <code>npx supabase functions deploy verify-document-status</code>
        </p>
      </div>
    </main>
  );
}
