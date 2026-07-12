"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Undo2 } from "lucide-react";
import { formatRupiah } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";

type Line = { accountId: string; debit: number; credit: number; memo?: string };
type Entry = {
  _id: string;
  date: string;
  description: string;
  lines: Line[];
  sourceType: "manual" | "reversal";
  isReversed: boolean;
};
type Account = { _id: string; code: string; name: string };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function JournalEntriesPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selected, setSelected] = useState<Entry | null>(null);

  async function loadEntries() {
    const res = await fetch(`/api/business/companies/${companyId}/journal-entries`);
    if (res.ok) setEntries(await res.json());
  }

  useEffect(() => {
    (async () => {
      await loadEntries();
      const accRes = await fetch(`/api/business/companies/${companyId}/accounts`);
      if (accRes.ok) setAccounts(await accRes.json());
    })();
  }, [companyId]);

  const accountById = new Map(accounts.map((a) => [a._id, a]));

  async function handleReverse(entryId: string) {
    const res = await fetch(
      `/api/business/companies/${companyId}/journal-entries/${entryId}/reverse`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error ?? "Gagal membuat koreksi");
      return;
    }
    toast.success("Jurnal koreksi dibuat");
    setSelected(null);
    loadEntries();
  }

  async function handleDelete(entryId: string) {
    const res = await fetch(
      `/api/business/companies/${companyId}/journal-entries/${entryId}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      toast.error("Gagal menghapus jurnal");
      return;
    }
    toast.success("Jurnal dihapus");
    setSelected(null);
    loadEntries();
  }

  if (!entries) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Jurnal</h1>
        <p className="text-sm text-muted-foreground">
          Riwayat semua transaksi yang sudah diposting — tidak bisa diedit langsung, cuma dikoreksi lewat jurnal pembalik
        </p>
      </div>

      {entries.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Belum ada jurnal tercatat
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden py-0">
          <CardContent className="divide-y p-0">
            {entries.map((e) => {
              const total = e.lines.reduce((s, l) => s + l.debit, 0);
              return (
                <button
                  key={e._id}
                  type="button"
                  onClick={() => setSelected(e)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{e.description}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(e.date)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {e.sourceType === "reversal" && (
                      <Badge variant="outline" className="text-[10px]">
                        koreksi
                      </Badge>
                    )}
                    {e.isReversed && (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        sudah dikoreksi
                      </Badge>
                    )}
                    <span className="text-sm font-medium tabular-nums">
                      {formatRupiah(total)}
                    </span>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.description}</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">{formatDate(selected.date)}</p>
                <div className="rounded-lg border divide-y">
                  {selected.lines.map((l, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                      <span>{accountById.get(l.accountId)?.name ?? l.accountId}</span>
                      <span className="tabular-nums">
                        {l.debit > 0 ? `Debit ${formatRupiah(l.debit)}` : `Kredit ${formatRupiah(l.credit)}`}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  {!selected.isReversed && (
                    <Button variant="outline" size="sm" onClick={() => handleReverse(selected._id)}>
                      <Undo2 className="size-4" />
                      Buat Koreksi
                    </Button>
                  )}
                  <ConfirmDeleteButton
                    title="Hapus jurnal ini?"
                    description="Cuma pakai ini buat entry yang memang salah total dan belum berpengaruh apa-apa — kalau sudah pernah dipakai, buat koreksi (reversal) saja."
                    onConfirm={() => handleDelete(selected._id)}
                  />
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
