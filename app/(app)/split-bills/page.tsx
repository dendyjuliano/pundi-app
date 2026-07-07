"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { id as idLocale } from "date-fns/locale";
import {
  Receipt,
  Plus,
  CalendarIcon,
  ChevronDown,
  ChevronUp,
  Check,
} from "lucide-react";
import { formatRupiah } from "@/lib/format";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { IconChip } from "@/components/icon-chip";
import { CurrencyInput } from "@/components/currency-input";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

type SplitBillSummary = {
  _id: string;
  name: string;
  subtotal: number;
  taxPercent: number;
  totalAmount: number;
  date: string;
  isPayer: boolean;
  myAmount: number;
  mySettled: boolean;
  participantsSettled: number;
  participantsTotal: number;
};

type ShareDetail = {
  _id: string;
  userId: string;
  name: string;
  amount: number;
  settled: boolean;
  settledAt?: string;
  isMe: boolean;
};

type BillDetail = {
  _id: string;
  name: string;
  isPayer: boolean;
  shares: ShareDetail[];
};

type Person = { id: string; name: string; group: "Keluarga" | "Teman" };

function toISODate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function ParticipantPicker({
  people,
  selectedIds,
  onToggle,
}: {
  people: Person[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  if (people.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Belum ada anggota keluarga lain atau teman yang bisa diajak — tambah
        teman dulu di halaman Teman.
      </p>
    );
  }
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">Partisipan</p>
      <div className="flex flex-wrap gap-2">
        {people.map((p) => {
          const checked = selectedIds.includes(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onToggle(p.id)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                checked
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-input text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {p.name}{" "}
              <span className="text-[10px] opacity-70">({p.group})</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BillCard({
  bill,
  onChanged,
}: {
  bill: SplitBillSummary;
  onChanged: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<BillDetail | null>(null);
  const [settling, setSettling] = useState(false);

  async function toggleExpand() {
    const next = !expanded;
    setExpanded(next);
    if (next && detail === null) {
      const res = await fetch(`/api/split-bills/${bill._id}`);
      if (res.ok) setDetail(await res.json());
    }
  }

  async function handleSettle() {
    setSettling(true);
    const res = await fetch(`/api/split-bills/${bill._id}/settle`, {
      method: "POST",
    });
    setSettling(false);
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error ?? "Gagal menandai lunas");
      return;
    }
    toast.success("Bagianmu ditandai lunas");
    setDetail(null);
    onChanged();
  }

  async function handleDelete() {
    const res = await fetch(`/api/split-bills/${bill._id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      toast.error("Gagal menghapus split bill");
      return;
    }
    toast.success("Split bill dihapus");
    onChanged();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <div className="flex items-center gap-3 min-w-0">
          <IconChip icon={Receipt} color="blue" size="sm" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <CardTitle className="truncate">{bill.name}</CardTitle>
              {bill.isPayer && (
                <Badge
                  variant="outline"
                  className="border-blue-200 text-blue-700"
                >
                  Kamu bayar duluan
                </Badge>
              )}
            </div>
            <CardDescription>{formatShortDate(bill.date)}</CardDescription>
          </div>
        </div>
        {bill.isPayer && (
          <ConfirmDeleteButton
            title={`Hapus split bill "${bill.name}"?`}
            description="Semua bagian yang belum lunas akan dihapus. Pengeluaran yang sudah tercatat dari bagian yang sudah lunas tetap ada di riwayat Pengeluaran."
            onConfirm={handleDelete}
          />
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total tagihan</span>
          <span className="font-medium">{formatRupiah(bill.totalAmount)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Bagianmu</span>
          <span className="font-medium">{formatRupiah(bill.myAmount)}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {bill.participantsSettled} dari {bill.participantsTotal} orang sudah
          lunas
        </p>

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={toggleExpand}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            Rincian
            {expanded ? (
              <ChevronUp className="size-3.5" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
          </button>
          {!bill.isPayer && !bill.mySettled && (
            <Button size="sm" disabled={settling} onClick={handleSettle}>
              {settling ? "Menyimpan..." : "Tandai Lunas"}
            </Button>
          )}
        </div>

        {expanded && (
          <div className="space-y-1.5 pt-1">
            {detail === null ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              detail.shares.map((s) => (
                <div
                  key={s._id}
                  className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-xs"
                >
                  <span className="font-medium">
                    {s.name}
                    {s.isMe && (
                      <span className="text-muted-foreground"> (kamu)</span>
                    )}
                  </span>
                  <span className="flex items-center gap-1.5">
                    {formatRupiah(s.amount)}
                    {s.settled ? (
                      <Check className="size-3.5 text-emerald-600" />
                    ) : (
                      <span className="text-muted-foreground">belum lunas</span>
                    )}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function SplitBillsPage() {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const [bills, setBills] = useState<SplitBillSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [people, setPeople] = useState<Person[]>([]);

  const [name, setName] = useState("");
  const [subtotal, setSubtotal] = useState(0);
  const [taxPercent, setTaxPercent] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [dateOpen, setDateOpen] = useState(false);
  const [participantIds, setParticipantIds] = useState<string[]>([]);

  async function loadBills() {
    const res = await fetch("/api/split-bills");
    setBills(await res.json());
  }

  useEffect(() => {
    (async () => {
      const [, membersRes, friendsRes] = await Promise.all([
        loadBills(),
        fetch("/api/family-members"),
        fetch("/api/friends"),
      ]);
      const combined: Person[] = [];
      if (membersRes.ok) {
        const members: { id: string; name: string }[] = await membersRes.json();
        for (const m of members) {
          if (m.id !== currentUserId) {
            combined.push({ id: m.id, name: m.name, group: "Keluarga" });
          }
        }
      }
      if (friendsRes.ok) {
        const friends: { id: string; name: string }[] = await friendsRes.json();
        for (const f of friends) {
          combined.push({ id: f.id, name: f.name, group: "Teman" });
        }
      }
      setPeople(combined);
      setLoading(false);
    })();
  }, [currentUserId]);

  function toggleParticipant(id: string) {
    setParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }

  const subtotalNum = subtotal;
  const taxPercentNum = Number(taxPercent) || 0;
  const taxAmount = Math.round(subtotalNum * (taxPercentNum / 100));
  const totalAmount = subtotalNum + taxAmount;
  const peopleCount = participantIds.length + 1;
  const shareEstimate =
    subtotalNum > 0 ? Math.floor(totalAmount / peopleCount) : 0;

  async function handleAddBill(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || subtotalNum <= 0 || participantIds.length === 0) return;
    const res = await fetch("/api/split-bills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        subtotal: subtotalNum,
        taxPercent: taxPercentNum,
        date: toISODate(date),
        participantIds,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error ?? "Gagal membuat split bill");
      return;
    }
    toast.success(`Split bill "${name.trim()}" dibuat`);
    setName("");
    setSubtotal(0);
    setTaxPercent("0");
    setDate(new Date());
    setParticipantIds([]);
    loadBills();
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Split Bill</h1>
        <p className="text-sm text-muted-foreground">
          Bagi rata tagihan yang kamu bayar duluan ke anggota keluarga atau
          teman — pajak/service charge ikut diperhitungkan
        </p>
      </div>

      {bills.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">
              Belum ada split bill — buat yang pertama di bawah
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {bills.map((b) => (
            <BillCard key={b._id} bill={b} onChanged={loadBills} />
          ))}
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
          <IconChip icon={Plus} color="blue" />
          <CardTitle>Split Bill Baru</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddBill} className="space-y-3">
            <Input
              placeholder="Nama (mis. Makan Malam Reuni)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <CurrencyInput
                value={subtotal}
                onValueChange={setSubtotal}
                placeholder="Subtotal"
              />
              <Input
                type="number"
                min={0}
                step="0.1"
                placeholder="Pajak/Service (%)"
                value={taxPercent}
                onChange={(e) => setTaxPercent(e.target.value)}
              />
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="justify-start overflow-hidden font-normal"
                  >
                    <CalendarIcon className="size-4 shrink-0" />
                    <span className="truncate">
                      {date.toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    locale={idLocale}
                    selected={date}
                    onSelect={(d) => {
                      if (!d) return;
                      setDate(d);
                      setDateOpen(false);
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {subtotalNum > 0 && (
              <p className="text-sm text-muted-foreground">
                Pajak: {formatRupiah(taxAmount)} · Total:{" "}
                {formatRupiah(totalAmount)} ·{" "}
                <span className="font-medium text-foreground">
                  ≈ {formatRupiah(shareEstimate)}/orang
                </span>{" "}
                ({peopleCount} orang termasuk kamu)
              </p>
            )}

            <ParticipantPicker
              people={people}
              selectedIds={participantIds}
              onToggle={toggleParticipant}
            />

            <Button type="submit" className="w-full sm:w-auto">
              Buat Split Bill
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
