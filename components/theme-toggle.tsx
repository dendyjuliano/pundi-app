"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const OPTIONS = [
  { value: "light", label: "Terang", icon: Sun },
  { value: "dark", label: "Gelap", icon: Moon },
  { value: "system", label: "Ikuti Sistem", icon: Monitor },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  // next-themes butuh render setelah mount buat baca theme yang bener
  // (server tidak tahu preferensi OS/localStorage user) — sebelum itu
  // tampilkan placeholder biar tidak ada hydration mismatch/flash. Ini
  // pola baku next-themes sendiri; tidak ada cara lain mendeteksi
  // "sudah hydrate belum" selain lewat effect + setState di sini.
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-10 w-full sm:w-44 rounded-lg bg-muted animate-pulse" />;
  }

  return (
    <Select value={theme} onValueChange={setTheme}>
      <SelectTrigger className="w-full sm:w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            <opt.icon className="size-4" />
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
