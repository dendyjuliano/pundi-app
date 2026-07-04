import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Font,
  Svg,
  Path,
} from "@react-pdf/renderer";
import { formatRupiah } from "@/lib/format";
import type { AnnualFinancialReport } from "@/lib/financialReport";

// Sama persis path SVG piggy-bank yang dipakai buat logo di seluruh app
// (favicon, apple-icon, PWA manifest icons — lihat lib/pwa-icon.tsx) —
// dipakai lagi di sini biar logo di laporan PDF konsisten sama brand,
// bukan gambar terpisah.
const PIGGY_PATH =
  "M11 17h3v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-3a3.16 3.16 0 0 0 2-2h1a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1h-1a5 5 0 0 0-2-4V3a4 4 0 0 0-3.2 1.6l-.3.4H11a6 6 0 0 0-6 6v1a5 5 0 0 0 2 4v3a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1z";
const PIGGY_DOT = "M16 10h.01";
const PIGGY_EAR = "M2 8v1a2 2 0 0 0 2 2h1";

// Matikan hyphenation otomatis — defaultnya react-pdf motong kata di
// tengah pakai tanda hubung (mis. "Perlu Perhat-ian") kalau kepanjangan
// buat lebar box-nya, kelihatan tidak rapi buat dokumen resmi begini.
// Biarkan kata utuh wrap ke baris berikutnya kalau perlu.
Font.registerHyphenationCallback((word) => [word]);

// Palet warna sengaja netral/formal (hitam-abu-abu) sebagai basis —
// dokumen ini dirancang berasa kayak laporan keuangan resmi, bukan
// materi marketing bergaya gradient warna-warni. Warna brand (emerald)
// dipakai secukupnya sebagai AKSEN: logo, garis section, header tabel,
// badge verdict — bukan mendominasi halaman.
const BRAND_COLOR = "#059669";
const VERDICT_COLOR: Record<AnnualFinancialReport["verdict"], string> = {
  Sehat: "#059669",
  "Perlu Perhatian": "#d97706",
  Waspada: "#dc2626",
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#18181b",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: "#059669",
    paddingBottom: 12,
    marginBottom: 20,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoChip: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: BRAND_COLOR,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: { fontSize: 18, fontWeight: 700 },
  reportTitle: { fontSize: 12, marginTop: 2, color: "#52525b" },
  headerMeta: { fontSize: 9, color: "#71717a", textAlign: "right" },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
    marginTop: 18,
  },
  sectionTitleBar: {
    width: 3,
    height: 11,
    borderRadius: 1.5,
    backgroundColor: BRAND_COLOR,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
  },
  statRow: { flexDirection: "row", gap: 10, marginBottom: 4 },
  statBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e4e4e7",
    borderTopWidth: 2,
    borderTopColor: BRAND_COLOR,
    borderRadius: 4,
    padding: 10,
  },
  statLabel: { fontSize: 8, color: "#71717a", marginBottom: 4 },
  statValue: { fontSize: 13, fontWeight: 700 },
  verdictBox: {
    flex: 1,
    borderRadius: 4,
    padding: 10,
    justifyContent: "center",
  },
  verdictLabel: { fontSize: 8, color: "rgba(255,255,255,0.85)", marginBottom: 4 },
  verdictValue: { fontSize: 13, fontWeight: 700, color: "#ffffff" },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#f4f4f5",
  },
  summaryRowTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#18181b",
  },
  summaryLabel: { fontSize: 10 },
  summaryValue: { fontSize: 10, fontWeight: 700 },
  table: { marginTop: 4 },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#ecfdf5",
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f4f4f5",
  },
  th: { fontSize: 8, fontWeight: 700, color: "#065f46" },
  td: { fontSize: 9 },
  colMonth: { width: "18%" },
  colNum: { width: "20.5%", textAlign: "right" },
  colStatus: { width: "20%", textAlign: "right" },
  statusOk: { fontSize: 8, color: "#059669", fontWeight: 700 },
  statusOver: { fontSize: 8, color: "#dc2626", fontWeight: 700 },
  disclaimer: {
    fontSize: 8,
    color: "#71717a",
    marginTop: 10,
    lineHeight: 1.4,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#a1a1aa",
    borderTopWidth: 1,
    borderTopColor: "#f4f4f5",
    paddingTop: 6,
  },
});

function pct(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function AnnualFinancialReportPdf({
  report,
  userName,
}: {
  report: AnnualFinancialReport;
  userName: string;
}) {
  const generatedDate = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // `totalAllocation` dari getYearlyDashboardSummary sudah termasuk
  // semua pos alokasi (fixed cost + investasi rencana), jadi dipakai
  // apa adanya sebagai baris "Alokasi Tetap & Investasi (Rencana)".
  const totalAlokasiTetapDanInvestasi = report.totalAllocation;

  return (
    <Document
      title={`Laporan Keuangan Tahunan ${userName} ${report.year}`}
      author="Pundi"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <View style={styles.brandRow}>
              <View style={styles.logoChip}>
                <Svg width={14} height={14} viewBox="0 0 24 24">
                  <Path
                    d={PIGGY_PATH}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={2}
                  />
                  <Path
                    d={PIGGY_DOT}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={2}
                  />
                  <Path
                    d={PIGGY_EAR}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={2}
                  />
                </Svg>
              </View>
              <Text style={styles.brand}>Pundi</Text>
            </View>
            <Text style={styles.reportTitle}>
              Laporan Keuangan Tahunan — {userName} ({report.year})
            </Text>
          </View>
          <Text style={styles.headerMeta}>Digenerate {generatedDate}</Text>
        </View>

        {/* Ringkasan Eksekutif */}
        <View style={styles.sectionTitleRow}>
          <View style={styles.sectionTitleBar} />
          <Text style={styles.sectionTitle}>Ringkasan Eksekutif</Text>
        </View>
        <View style={styles.statRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Pendapatan</Text>
            <Text style={styles.statValue}>
              {formatRupiah(report.totalIncome)}
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Pengeluaran Aktual</Text>
            <Text style={styles.statValue}>
              {formatRupiah(report.totalActual)}
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Bersih (Sisa)</Text>
            <Text style={styles.statValue}>
              {formatRupiah(report.totalBersih)}
            </Text>
          </View>
          <View
            style={[
              styles.verdictBox,
              { backgroundColor: VERDICT_COLOR[report.verdict] },
            ]}
          >
            <Text style={styles.verdictLabel}>Status Kesehatan Keuangan</Text>
            <Text style={styles.verdictValue}>{report.verdict}</Text>
          </View>
        </View>

        {/* Laporan Ringkasan (gaya Laba Rugi) */}
        <View style={styles.sectionTitleRow}>
          <View style={styles.sectionTitleBar} />
          <Text style={styles.sectionTitle}>Laporan Ringkasan Tahunan</Text>
        </View>
        <View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Pendapatan</Text>
            <Text style={styles.summaryValue}>
              {formatRupiah(report.totalIncome)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              Alokasi Tetap &amp; Investasi (Rencana)
            </Text>
            <Text style={styles.summaryValue}>
              ({formatRupiah(totalAlokasiTetapDanInvestasi)})
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              Pengeluaran Operasional (Makan &amp; Lain-lain, Aktual)
            </Text>
            <Text style={styles.summaryValue}>
              ({formatRupiah(report.totalActual)})
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Realisasi Investasi</Text>
            <Text style={styles.summaryValue}>
              {formatRupiah(report.totalInvestRealized)}
            </Text>
          </View>
          <View style={styles.summaryRowTotal}>
            <Text style={styles.summaryLabel}>Sisa Bersih Real</Text>
            <Text style={styles.summaryValue}>
              {formatRupiah(report.totalBersih - report.totalActual)}
            </Text>
          </View>
        </View>

        {/* Tabel Rincian Bulanan */}
        <View style={styles.sectionTitleRow}>
          <View style={styles.sectionTitleBar} />
          <Text style={styles.sectionTitle}>Rincian Bulanan</Text>
        </View>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.th, styles.colMonth]}>Bulan</Text>
            <Text style={[styles.th, styles.colNum]}>Pendapatan</Text>
            <Text style={[styles.th, styles.colNum]}>Alokasi</Text>
            <Text style={[styles.th, styles.colNum]}>Pengeluaran</Text>
            <Text style={[styles.th, styles.colStatus]}>Status</Text>
          </View>
          {report.months.map((m) => (
            <View key={m.month} style={styles.tableRow}>
              <Text style={[styles.td, styles.colMonth]}>{m.label}</Text>
              <Text style={[styles.td, styles.colNum]}>
                {formatRupiah(m.totalIncome)}
              </Text>
              <Text style={[styles.td, styles.colNum]}>
                {formatRupiah(m.totalAllocation)}
              </Text>
              <Text style={[styles.td, styles.colNum]}>
                {formatRupiah(m.totalActual)}
              </Text>
              <Text
                style={[
                  styles.colStatus,
                  m.melenceng ? styles.statusOver : styles.statusOk,
                ]}
              >
                {m.melenceng ? "Lewat Target" : "Sesuai Target"}
              </Text>
            </View>
          ))}
        </View>

        {/* Analisis Investasi */}
        {report.investment.hasInvestCategory && (
          <View>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionTitleBar} />
              <Text style={styles.sectionTitle}>Analisis Investasi</Text>
            </View>
            <View style={styles.table}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.th, styles.colMonth]}>Bulan</Text>
                <Text style={[styles.th, styles.colNum]}>Rencana</Text>
                <Text style={[styles.th, styles.colNum]}>Realisasi</Text>
              </View>
              {report.investment.months.map((m) => (
                <View key={m.month} style={styles.tableRow}>
                  <Text style={[styles.td, styles.colMonth]}>{m.label}</Text>
                  <Text style={[styles.td, styles.colNum]}>
                    {formatRupiah(m.planned)}
                  </Text>
                  <Text style={[styles.td, styles.colNum]}>
                    {formatRupiah(m.realized)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Indikator Kesehatan Keuangan */}
        <View style={styles.sectionTitleRow}>
          <View style={styles.sectionTitleBar} />
          <Text style={styles.sectionTitle}>Indikator Kesehatan Keuangan</Text>
        </View>
        <View style={styles.statRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Savings Rate</Text>
            <Text style={styles.statValue}>{pct(report.savingsRate)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Kepatuhan Budget</Text>
            <Text style={styles.statValue}>{pct(report.adherenceRate)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Bulan Sesuai Target</Text>
            <Text style={styles.statValue}>
              {report.monthsNotMelenceng} / 12
            </Text>
          </View>
        </View>
        <Text style={styles.disclaimer}>
          Status &quot;{report.verdict}&quot; dihitung dari rasio realisasi
          investasi terhadap pendapatan (savings rate) dan seberapa sering
          pengeluaran bulanan sesuai target — Sehat: savings rate minimal
          20% dan minimal 75% bulan sesuai target; Perlu Perhatian: savings
          rate minimal 10% atau minimal 50% bulan sesuai target; selain itu
          Waspada. Ini indikator umum berdasarkan rule-of-thumb keuangan
          pribadi, BUKAN nasihat finansial profesional.
        </Text>

        <View style={styles.footer} fixed>
          <Text>Dibuat otomatis oleh Pundi</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Halaman ${pageNumber} dari ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
