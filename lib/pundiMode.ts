// Cookie ringan (bukan httpOnly, sengaja bisa dibaca client & proxy.ts)
// buat inget mode terakhir yang dipakai user — personal atau business.
// Dibaca proxy.ts waktu user yang sudah login buka public route (mis. "/"),
// biar diarahkan balik ke mode yang terakhir dipakai, bukan selalu ke
// dashboard personal. Di-set tiap AppShell/BusinessShell mount, pola sama
// semangatnya kayak localStorage "pundi-business-last-company" yang sudah
// ada — cuma promosi ke cookie biar middleware (server-side) bisa baca.
export function setPundiMode(mode: "personal" | "business") {
  document.cookie = `pundi_mode=${mode}; path=/; max-age=31536000; SameSite=Lax`;
}

// Dipakai di app/login/page.tsx buat nentuin target redirect abis login
// berhasil — cuma dipanggil di event handler (bukan render), jadi aman
// dari mismatch hydration walau halaman login "use client".
export function getPundiMode(): "personal" | "business" {
  const match = document.cookie.match(/(?:^|; )pundi_mode=([^;]+)/);
  return match?.[1] === "business" ? "business" : "personal";
}
