"use client";

import { useLayoutEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function formatNumber(value: number) {
  if (!Number.isFinite(value) || value === 0) return "";
  return new Intl.NumberFormat("id-ID").format(value);
}

function parseDigits(value: string) {
  const digits = value.replace(/[^0-9]/g, "");
  return digits ? Number(digits) : 0;
}

// Menghitung berapa digit yang ada sebelum posisi kursor di string mentah
// (sebelum diformat ulang).
function countDigitsBefore(value: string, caretPos: number) {
  let count = 0;
  for (let i = 0; i < caretPos && i < value.length; i++) {
    if (/[0-9]/.test(value[i])) count++;
  }
  return count;
}

// Mencari posisi kursor di string yang SUDAH diformat ulang, supaya jumlah
// digit di sebelah kirinya tetap sama seperti sebelum diformat — ini yang
// bikin kursor tidak lompat ke akhir tiap kali user edit di tengah angka.
function findCaretForDigitCount(formatted: string, digitCount: number) {
  if (digitCount <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (/[0-9]/.test(formatted[i])) {
      seen++;
      if (seen === digitCount) return i + 1;
    }
  }
  return formatted.length;
}

export function CurrencyInput({
  value,
  onValueChange,
  className,
  disabled,
  placeholder,
  id,
}: {
  value: number;
  onValueChange: (value: number) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingCaretDigits = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (pendingCaretDigits.current === null || !inputRef.current) return;
    const pos = findCaretForDigitCount(
      formatNumber(value),
      pendingCaretDigits.current
    );
    inputRef.current.setSelectionRange(pos, pos);
    pendingCaretDigits.current = null;
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    const caret = e.target.selectionStart ?? raw.length;
    pendingCaretDigits.current = countDigitsBefore(raw, caret);
    onValueChange(parseDigits(raw));
  }

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        Rp
      </span>
      <Input
        ref={inputRef}
        id={id}
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        disabled={disabled}
        value={formatNumber(value)}
        onChange={handleChange}
        className={cn("pl-9 text-right tabular-nums", className)}
      />
    </div>
  );
}
