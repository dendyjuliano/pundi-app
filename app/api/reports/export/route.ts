import { createElement } from "react";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUser, resolveAdminTargetUserId } from "@/lib/session";
import { getAnnualFinancialReport } from "@/lib/financialReport";
import { AnnualFinancialReportPdf } from "@/lib/pdf/AnnualFinancialReportPdf";
import UserModel from "@/models/User";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get("year"));
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return NextResponse.json(
      { error: "year must be a valid 4-digit year" },
      { status: 400 }
    );
  }

  const resolution = await resolveAdminTargetUserId(
    user,
    searchParams.get("userId")
  );
  if (!resolution.ok) {
    return NextResponse.json(
      { error: resolution.error },
      { status: resolution.status }
    );
  }
  const targetUserId = resolution.targetUserId;

  await connectToDatabase();
  const targetUser = await UserModel.findById(targetUserId);
  if (!targetUser) {
    return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
  }

  const report = await getAnnualFinancialReport(targetUserId, year);
  // Route Handler ini tetap `.ts` (bukan `.tsx`) — dukungan Next.js buat
  // `route.tsx` tidak terdokumentasi jelas di versi ini, jadi pakai
  // `createElement` biar tidak butuh sintaks JSX sama sekali di file ini.
  // Tipe parameter `renderToBuffer` react-pdf mensyaratkan literally
  // `ReactElement<DocumentProps>` (elemen `<Document>` itu sendiri,
  // bukan komponen custom yang me-return-nya) — `DocumentProps` tidak
  // diekspor dari paketnya, jadi tipe parameter itu diambil generik
  // lewat `Parameters<typeof renderToBuffer>` alih-alih pakai `any`.
  const pdfElement = createElement(AnnualFinancialReportPdf, {
    report,
    userName: targetUser.name,
  }) as Parameters<typeof renderToBuffer>[0];
  const pdfBuffer = await renderToBuffer(pdfElement);

  const safeName = targetUser.name.replace(/[^a-zA-Z0-9]+/g, "-");
  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="laporan-keuangan-${safeName}-${year}.pdf"`,
    },
  });
}
