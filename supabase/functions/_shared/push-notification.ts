import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

type VerificationNotificationType = 'verification_approved' | 'verification_rejected';

const COPY: Record<VerificationNotificationType, { title: string; body: string }> = {
  verification_approved: {
    title: 'Doğrulama tamamlandı',
    body: 'Yardımcı profiliniz onaylandı. Müsait modunu açarak yakındaki çağrıları alabilirsiniz.',
  },
  verification_rejected: {
    title: 'Doğrulama reddedildi',
    body: 'Başvurunuz reddedildi. Profil ekranından nedeni görüp yeniden başvurabilirsiniz.',
  },
};

export async function queueVerificationNotification(
  supabaseAdmin: SupabaseClient,
  recipientUserId: string,
  notificationType: VerificationNotificationType,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  const copy = COPY[notificationType];

  const { data: tokens } = await supabaseAdmin
    .from('push_tokens')
    .select('id, expo_push_token')
    .eq('user_id', recipientUserId)
    .eq('is_active', true)
    .limit(5);

  const pushTokenId = tokens?.[0]?.id ?? null;

  const { data: notification, error } = await supabaseAdmin
    .from('incident_notifications')
    .insert({
      incident_id: null,
      recipient_user_id: recipientUserId,
      push_token_id: pushTokenId,
      notification_type: notificationType,
      title: copy.title,
      body: copy.body,
      status: 'queued',
      metadata,
    })
    .select('id')
    .single();

  if (error) {
    console.error('queueVerificationNotification insert failed', error);
    return;
  }

  if (!tokens?.length) {
    return;
  }

  try {
    const messages = tokens.map((token) => ({
      to: token.expo_push_token,
      title: copy.title,
      body: copy.body,
      data: { notification_id: notification.id, type: notificationType },
    }));

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();
    const failed = Array.isArray(result?.data)
      ? result.data.some((item: { status?: string }) => item.status === 'error')
      : !response.ok;

    await supabaseAdmin
      .from('incident_notifications')
      .update({
        status: failed ? 'failed' : 'sent',
        sent_at: new Date().toISOString(),
        error_message: failed ? JSON.stringify(result).slice(0, 500) : null,
      })
      .eq('id', notification.id);
  } catch (pushError) {
    await supabaseAdmin
      .from('incident_notifications')
      .update({
        status: 'failed',
        error_message: pushError instanceof Error ? pushError.message : 'push send failed',
      })
      .eq('id', notification.id);
  }
}
