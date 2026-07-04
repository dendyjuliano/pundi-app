export type InterestType = "flat" | "efektif";

// Pure function (tidak ada dependency server-only) — dipakai di server
// saat bikin Installment baru, DAN di client buat live-preview nominal
// cicilan/bulan sebelum user submit form.
//
// Bunga cuma dipakai SEKALI di sini buat menghitung monthlyInstallment.
// Setelah itu, semua tracking progress murni aritmatika sederhana
// (nominal tetap × jumlah bulan) — tidak ada skedul amortisasi
// pokok-vs-bunga per bulan yang di-track.
export function calculateMonthlyInstallment({
  principal,
  annualInterestRate,
  tenorMonths,
  interestType,
}: {
  principal: number;
  annualInterestRate: number;
  tenorMonths: number;
  interestType: InterestType;
}): number {
  if (interestType === "flat") {
    return principal / tenorMonths + (principal * (annualInterestRate / 100)) / 12;
  }

  // Efektif/Anuitas — rumus anuitas standar. Fallback ke pembagian rata
  // kalau suku bunga 0% (mencegah pembagian yang secara matematis aneh
  // di rumus anuitas saat r = 0).
  const r = annualInterestRate / 100 / 12;
  if (r === 0) return principal / tenorMonths;
  const factor = Math.pow(1 + r, tenorMonths);
  return (principal * r * factor) / (factor - 1);
}
