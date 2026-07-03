const PIGGY_PATH =
  "M11 17h3v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-3a3.16 3.16 0 0 0 2-2h1a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1h-1a5 5 0 0 0-2-4V3a4 4 0 0 0-3.2 1.6l-.3.4H11a6 6 0 0 0-6 6v1a5 5 0 0 0 2 4v3a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1z";
const PIGGY_DOT = "M16 10h.01";
const PIGGY_EAR = "M2 8v1a2 2 0 0 0 2 2h1";

// Ikon dipakai di beberapa ukuran (favicon apple-touch-icon, manifest icons
// 192/512, dan versi "maskable" 512 dengan safe-zone lebih besar karena OS
// Android bisa motong bentuknya jadi lingkaran/squircle). `maskable` bikin
// background full-bleed persegi (bukan lingkaran) dan piggy glyph-nya
// diperkecil supaya tetap utuh di dalam safe-zone 80% sesuai spek maskable.app.
export function PwaIcon({
  size,
  maskable = false,
}: {
  size: number;
  maskable?: boolean;
}) {
  const glyphScale = maskable ? 0.5 : 0.72;
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
        borderRadius: maskable ? 0 : size / 2,
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
