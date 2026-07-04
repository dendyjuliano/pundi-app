import webpush from "web-push";
import { SITE_URL } from "@/lib/site";
import PushSubscription from "@/models/PushSubscription";

let vapidConfigured = false;

// VAPID cuma perlu di-set sekali per process — aman dipanggil berkali-kali,
// idempotent lewat flag ini. Return false kalau env belum diset (caller
// harus skip ngirim push, bukan nge-throw, biar fitur lain yang numpang
// kirim push — mis. notifikasi kontribusi goal Bersama — tidak ikut gagal
// cuma gara-gara VAPID belum dikonfigurasi di environment tertentu).
export function configureWebPush(): boolean {
  if (vapidConfigured) return true;
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  if (!vapidPublicKey || !vapidPrivateKey) return false;
  webpush.setVapidDetails(
    `mailto:hello@${new URL(SITE_URL).hostname}`,
    vapidPublicKey,
    vapidPrivateKey
  );
  vapidConfigured = true;
  return true;
}

export type PushPayload = { title: string; body: string; url: string };

// Kirim ke satu subscription — otomatis bersihin subscription yang sudah
// tidak valid lagi (404/410, mis. user uninstall/clear data browser) biar
// caller berikutnya tidak nyoba lagi ke endpoint yang sama.
export async function sendPushToSubscription(
  sub: {
    _id: unknown;
    endpoint: string;
    keys: { p256dh: string; auth: string };
  },
  payload: PushPayload
): Promise<"sent" | "removed" | "failed"> {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: sub.keys },
      JSON.stringify(payload)
    );
    return "sent";
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    if (statusCode === 404 || statusCode === 410) {
      await PushSubscription.deleteOne({ _id: sub._id });
      return "removed";
    }
    return "failed";
  }
}

// Kirim payload yang SAMA ke semua subscription milik sekumpulan user
// (satu user bisa punya lebih dari satu device/subscription) — dipakai
// buat notifikasi yang tidak butuh isi beda per-user, mis. kontribusi
// goal Bersama. Beda dari cron/daily-reminder yang payload-nya beda-beda
// per kondisi tiap user, jadi tetap loop manual pakai
// sendPushToSubscription langsung.
export async function sendPushToUsers(userIds: string[], payload: PushPayload) {
  if (userIds.length === 0) return;
  if (!configureWebPush()) return;
  const subs = await PushSubscription.find({ userId: { $in: userIds } });
  await Promise.all(subs.map((sub) => sendPushToSubscription(sub, payload)));
}
