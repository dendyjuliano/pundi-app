export function GradientBlobs({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`}
    >
      <div className="absolute -top-24 -left-20 size-72 rounded-full bg-emerald-400/30 blur-3xl" />
      <div className="absolute top-1/3 -right-24 size-80 rounded-full bg-teal-300/30 blur-3xl" />
      <div className="absolute -bottom-24 left-1/4 size-64 rounded-full bg-emerald-300/20 blur-3xl" />
    </div>
  );
}
