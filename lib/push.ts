import webpush from 'web-push';

const VAPID_PUBLIC  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY!;
const VAPID_EMAIL   = 'mailto:josephdpelayo@gmail.com';

// Only configure if keys are present
if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
}

export async function sendAdminPush(payload: {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;

  const { supabaseReady, supabase } = await import('./supabase');
  if (!supabaseReady) return;

  const { data } = await supabase
    .from('dp_settings')
    .select('value')
    .eq('key', 'admin_push_subscription')
    .maybeSingle();

  if (!data?.value) return;

  try {
    const subscription = JSON.parse(data.value);
    await webpush.sendNotification(subscription, JSON.stringify(payload));
  } catch (err: unknown) {
    // Subscription expired or invalid — clean it up
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) {
      await supabase.from('dp_settings').delete().eq('key', 'admin_push_subscription');
    }
  }
}
