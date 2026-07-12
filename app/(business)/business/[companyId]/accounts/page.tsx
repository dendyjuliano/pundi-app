"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Check, X } from "lucide-react";
import { formatRupiah } from "@/lib/format";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IconChip } from "@/components/icon-chip";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";

type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";

type Account = {
  _id: string;
  code: string;
  name: string;
  type: AccountType;
  reportSection?: string;
  costBehavior?: "fixed" | "variable";
  isActive: boolean;
  isSystemDefault: boolean;
  balance: number;
};

const TYPE_LABELS: Record<AccountType, string> = {
  asset: "Aset",
  liability: "Liabilitas",
  equity: "Ekuitas",
  revenue: "Pendapatan",
  expense: "Beban",
};

const REPORT_SECTION_LABELS: Record<string, string> = {
  "operating-revenue": "Pendapatan Operasional",
  cogs: "Beban Pokok Penjualan (COGS)",
  "operating-expense": "Beban Operasional",
  "non-operating-revenue": "Pendapatan Non-Operasional",
  "non-operating-expense": "Beban Non-Operasional",
};

function AccountRow({
  account,
  onChanged,
}: {
  account: Account;
  onChanged: () => void;
}) {
  const { companyId } = useParams<{ companyId: string }>();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(account.name);

  async function save() {
    if (!name.trim()) return;
    const res = await fetch(
      `/api/business/companies/${companyId}/accounts/${account._id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      }
    );
    if (!res.ok) {
      toast.error("Gagal mengubah akun");
      return;
    }
    setEditing(false);
    onChanged();
  }

  async function toggleActive(isActive: boolean) {
    const res = await fetch(
      `/api/business/companies/${companyId}/accounts/${account._id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      }
    );
    if (!res.ok) {
      toast.error("Gagal mengubah status akun");
      return;
    }
    onChanged();
  }

  async function handleDelete() {
    const res = await fetch(
      `/api/business/companies/${companyId}/accounts/${account._id}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error ?? "Gagal menghapus akun");
      return;
    }
    toast.success("Akun dihapus");
    onChanged();
  }

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-b last:border-b-0">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-xs font-mono text-muted-foreground w-12 shrink-0">
          {account.code}
        </span>
        {editing ? (
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") setEditing(false);
            }}
            className="h-8 w-48"
          />
        ) : (
          <span className={account.isActive ? "" : "text-muted-foreground line-through"}>
            {account.name}
          </span>
        )}
        {account.isSystemDefault && (
          <Badge variant="outline" className="text-[10px]">
            bawaan
          </Badge>
        )}
        {account.costBehavior && (
          <Badge variant="outline" className="text-[10px]">
            {account.costBehavior === "fixed" ? "tetap" : "variabel"}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-sm font-medium tabular-nums">
          {formatRupiah(account.balance)}
        </span>
        {editing ? (
          <>
            <Button variant="ghost" size="icon" className="size-7 text-emerald-600" onClick={save}>
              <Check className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" className="size-7" onClick={() => setEditing(false)}>
              <X className="size-4" />
            </Button>
          </>
        ) : (
          <>
            <Switch checked={account.isActive} onCheckedChange={toggleActive} />
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-foreground"
              onClick={() => setEditing(true)}
            >
              <Pencil className="size-4" />
            </Button>
            <ConfirmDeleteButton
              title={`Hapus akun "${account.name}"?`}
              description="Cuma bisa dihapus kalau belum pernah dipakai di jurnal — kalau sudah pernah, nonaktifkan saja."
              onConfirm={handleDelete}
              className="size-7"
            />
          </>
        )}
      </div>
    </div>
  );
}

export default function ChartOfAccountsPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const [accounts, setAccounts] = useState<Account[] | null>(null);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("expense");
  const [reportSection, setReportSection] = useState("operating-expense");
  const [costBehavior, setCostBehavior] = useState<string>("none");

  async function loadAccounts() {
    const res = await fetch(`/api/business/companies/${companyId}/accounts`);
    if (res.ok) setAccounts(await res.json());
  }

  useEffect(() => {
    (async () => {
      await loadAccounts();
    })();
  }, [companyId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;
    const res = await fetch(`/api/business/companies/${companyId}/accounts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: code.trim(),
        name: name.trim(),
        type,
        reportSection:
          type === "revenue" || type === "expense" ? reportSection : undefined,
        costBehavior:
          type === "expense" && costBehavior !== "none" ? costBehavior : undefined,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error ?? "Gagal menambah akun");
      return;
    }
    toast.success(`Akun "${name.trim()}" ditambahkan`);
    setCode("");
    setName("");
    loadAccounts();
  }

  if (!accounts) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const types: AccountType[] = ["asset", "liability", "equity", "revenue", "expense"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Chart of Accounts</h1>
        <p className="text-sm text-muted-foreground">
          Daftar akun perusahaan — saldo dihitung langsung dari jurnal, bukan disimpan
        </p>
      </div>

      <Accordion type="multiple" defaultValue={types}>
        {types.map((t) => {
          const group = accounts.filter((a) => a.type === t);
          if (group.length === 0) return null;
          return (
            <AccordionItem key={t} value={t}>
              <AccordionTrigger>
                {TYPE_LABELS[t]} <span className="text-muted-foreground ml-2">({group.length})</span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="rounded-lg border overflow-hidden">
                  {group.map((a) => (
                    <AccountRow key={a._id} account={a} onChanged={loadAccounts} />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <Card>
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
          <IconChip icon={Plus} color="blue" />
          <CardTitle>Akun Baru</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Kode (mis. 6500)"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <Input
                placeholder="Nama akun"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Select value={type} onValueChange={(v) => setType(v as AccountType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {types.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(type === "revenue" || type === "expense") && (
                <Select value={reportSection} onValueChange={setReportSection}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(REPORT_SECTION_LABELS)
                      .filter(([key]) =>
                        type === "revenue"
                          ? key.includes("revenue")
                          : key === "cogs" || key.includes("expense")
                      )
                      .map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
              {type === "expense" && (
                <Select value={costBehavior} onValueChange={setCostBehavior}>
                  <SelectTrigger>
                    <SelectValue placeholder="Perilaku biaya (opsional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tidak ditandai</SelectItem>
                    <SelectItem value="fixed">Tetap (fixed)</SelectItem>
                    <SelectItem value="variable">Variabel</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            <Button type="submit" className="w-full sm:w-auto">
              Tambah Akun
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
