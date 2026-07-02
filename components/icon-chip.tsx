import { cn } from "@/lib/utils";

const COLOR_MAP = {
  emerald: "bg-emerald-100 text-emerald-600",
  amber: "bg-amber-100 text-amber-600",
  blue: "bg-blue-100 text-blue-600",
  violet: "bg-violet-100 text-violet-600",
  rose: "bg-rose-100 text-rose-600",
  orange: "bg-orange-100 text-orange-600",
} as const;

export function IconChip({
  icon: Icon,
  color = "emerald",
  size = "default",
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  color?: keyof typeof COLOR_MAP;
  size?: "default" | "sm";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-xl shrink-0",
        size === "sm" ? "size-8" : "size-9",
        COLOR_MAP[color],
        className
      )}
    >
      <Icon className={size === "sm" ? "size-4" : "size-4"} />
    </div>
  );
}
