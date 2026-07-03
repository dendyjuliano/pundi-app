const PIGGY_PATH =
  "M11 17h3v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-3a3.16 3.16 0 0 0 2-2h1a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1h-1a5 5 0 0 0-2-4V3a4 4 0 0 0-3.2 1.6l-.3.4H11a6 6 0 0 0-6 6v1a5 5 0 0 0 2 4v3a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1z";
const PIGGY_DOT = "M16 10h.01";
const PIGGY_EAR = "M2 8v1a2 2 0 0 0 2 2h1";

// Ikon dipakai di beberapa ukuran (apple-touch-icon, manifest icons 192/512
// biasa & "maskable"). SELALU full-bleed persegi tanpa border-radius apa pun
// — OS (iOS/Android) yang akan motong sendiri jadi rounded-square/squircle/
// lingkaran sesuai launcher-nya. Kalau kita ikut motong jadi lingkaran di
// sini, sudut persegi di luar lingkaran itu transparan, dan iOS render area
// transparan itu jadi HITAM di preview "Add to Home Screen" — makanya
// jangan pernah pakai borderRadius di komponen ini.
// `maskable` cuma mempersempit glyph-nya biar tetap utuh di safe-zone 80%
// sesuai spek maskable.app (Android bisa motong lebih agresif dari iOS).
export function PwaIcon({
  size,
  maskable = false,
}: {
  size: number;
  maskable?: boolean;
}) {
  const glyphScale = maskable ? 0.5 : 0.62;
  const glyphSize = size * glyphScale;

  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #10b981 0%, #0d9488 100%)",
      }}
    >
      <svg
        width={glyphSize}
        height={glyphSize}
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d={PIGGY_PATH}
          stroke="white"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d={PIGGY_DOT} stroke="white" strokeWidth={1.6} strokeLinecap="round" />
        <path
          d={PIGGY_EAR}
          stroke="white"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
