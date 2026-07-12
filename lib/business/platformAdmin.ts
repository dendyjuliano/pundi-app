// Platform admin BUKAN User.role "admin" yang sudah ada (itu scoped per
// keluarga) — ini konsep terpisah: orang yang approve/reject klaim
// pembayaran langganan di SELURUH platform. Pola sama seperti CRON_SECRET
// yang sudah ada di .env.local buat gate operasi privileged non-user-facing.
const ADMIN_EMAILS = (process.env.PLATFORM_ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isPlatformAdmin(email: string) {
  return ADMIN_EMAILS.includes(email.toLowerCase());
}
