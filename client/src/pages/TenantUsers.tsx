import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Users, UserPlus, Upload, Search, Trash2, Edit2, CheckCircle2,
  XCircle, RefreshCw, Download, AlertTriangle, Shield, Eye, EyeOff,
} from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

// ─── Persona labels & colors ─────────────────────────────────────────────────
const PERSONA_CONFIG: Record<string, { label: string; color: string; canAdd: string[] }> = {
  "c-level": {
    label: "C-Level",
    color: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    canAdd: ["c-level", "cio", "gerente-sinistros", "analista-fraude", "perito"],
  },
  "cio": {
    label: "CIO",
    color: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    canAdd: ["gerente-sinistros", "analista-fraude", "perito"],
  },
  "gerente-sinistros": {
    label: "Gerente de Sinistros",
    color: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    canAdd: [],
  },
  "analista-fraude": {
    label: "Analista de Fraude",
    color: "bg-red-500/20 text-red-300 border-red-500/30",
    canAdd: [],
  },
  "perito": {
    label: "Perito",
    color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    canAdd: [],
  },
};

function PersonaBadge({ persona }: { persona: string }) {
  const cfg = PERSONA_CONFIG[persona] ?? { label: persona, color: "bg-slate-500/20 text-slate-300 border-slate-500/30" };
  return <Badge className={`${cfg.color} text-xs border`}>{cfg.label}</Badge>;
}

// ─── Add User Modal ───────────────────────────────────────────────────────────
function AddUserModal({
  open,
  onClose,
  allowedPersonas,
}: {
  open: boolean;
  onClose: () => void;
  allowedPersonas: string[];
}) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState({ name: "", email: "", persona: allowedPersonas[0] ?? "perito" });

  const addUser = trpc.tenantUsers.create.useMutation({
    onSuccess: () => {
      toast.success("Usuário adicionado com sucesso!");
      utils.tenantUsers.list.invalidate();
      onClose();
      setForm({ name: "", email: "", persona: allowedPersonas[0] ?? "perito" });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#0d1526] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <UserPlus className="w-5 h-5 text-cyan-400" /> Adicionar Usuário
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            O usuário receberá acesso à plataforma com o nível selecionado.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-sm">Nome completo *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ex: Maria Santos"
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-sm">E-mail corporativo *</Label>
            <Input
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="maria@empresa.com"
              type="email"
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-sm">Nível de acesso *</Label>
            <Select
              value={form.persona}
              onValueChange={(v) => setForm((f) => ({ ...f, persona: v }))}
            >
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0d1526] border-white/10">
                {allowedPersonas.map((p) => (
                  <SelectItem key={p} value={p} className="text-white">
                    {PERSONA_CONFIG[p]?.label ?? p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white">Cancelar</Button>
          <Button
            onClick={() => addUser.mutate({ ...form, persona: form.persona as "c-level" | "gerente-sinistros" | "analista-fraude" | "cio" | "perito" })}
            disabled={!form.name || !form.email.includes("@") || addUser.isPending}
            className="bg-cyan-500 hover:bg-cyan-600 text-white gap-2"
          >
            {addUser.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Bulk Import Modal ────────────────────────────────────────────────────────
type BulkRow = { name: string; email: string; persona: string; status?: "pending" | "ok" | "error"; error?: string };

function BulkImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const utils = trpc.useUtils();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [importing, setImporting] = useState(false);

  const addUser = trpc.tenantUsers.create.useMutation();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });
      const parsed: BulkRow[] = json.map((row) => ({
        name: String(row["nome"] ?? row["name"] ?? row["Nome"] ?? "").trim(),
        email: String(row["email"] ?? row["Email"] ?? row["e-mail"] ?? "").trim().toLowerCase(),
        persona: String(row["nivel"] ?? row["persona"] ?? row["Nível"] ?? row["nivel_acesso"] ?? "perito").trim().toLowerCase(),
        status: "pending",
      }));
      setRows(parsed);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    setImporting(true);
    const updated = [...rows];
    for (let i = 0; i < updated.length; i++) {
      const row = updated[i];
      if (!row.name || !row.email.includes("@")) {
        updated[i] = { ...row, status: "error", error: "Nome ou e-mail inválido" };
        continue;
      }
      try {
        await addUser.mutateAsync({ name: row.name, email: row.email, persona: row.persona as "c-level" | "gerente-sinistros" | "analista-fraude" | "cio" | "perito" });
        updated[i] = { ...row, status: "ok" };
      } catch (e: unknown) {
        updated[i] = { ...row, status: "error", error: e instanceof Error ? e.message : "Erro" };
      }
      setRows([...updated]);
    }
    setImporting(false);
    utils.tenantUsers.list.invalidate();
    const ok = updated.filter((r) => r.status === "ok").length;
    const err = updated.filter((r) => r.status === "error").length;
    toast.success(`Importação concluída: ${ok} criados, ${err} erros.`);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["nome", "email", "nivel"],
      ["João Silva", "joao@empresa.com", "gerente-sinistros"],
      ["Maria Santos", "maria@empresa.com", "analista-fraude"],
      ["Carlos Lima", "carlos@empresa.com", "perito"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Usuários");
    XLSX.writeFile(wb, "template_usuarios_eonsure.xlsx");
  };

  const handleClose = () => { setRows([]); if (fileRef.current) fileRef.current.value = ""; onClose(); };
  const okCount = rows.filter((r) => r.status === "ok").length;
  const errCount = rows.filter((r) => r.status === "error").length;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="bg-[#0d1526] border-white/10 text-white max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Upload className="w-5 h-5 text-cyan-400" /> Importação em Lote
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Importe usuários via arquivo XLSX ou CSV. Colunas: <code className="text-cyan-300">nome</code>, <code className="text-cyan-300">email</code>, <code className="text-cyan-300">nivel</code>.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4 py-2">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={downloadTemplate}
              className="border-white/20 text-slate-300 hover:text-white gap-2"
            >
              <Download className="w-4 h-4" /> Baixar Template
            </Button>
            <label className="flex-1 cursor-pointer">
              <div className="border-2 border-dashed border-white/20 rounded-lg p-4 text-center hover:border-cyan-500/50 transition-colors">
                <Upload className="w-6 h-6 text-slate-500 mx-auto mb-1" />
                <p className="text-slate-400 text-sm">Clique para selecionar XLSX ou CSV</p>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
              </div>
            </label>
          </div>

          {rows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">{rows.length} linhas carregadas</span>
                <div className="flex gap-3">
                  {okCount > 0 && <span className="text-emerald-400">{okCount} ok</span>}
                  {errCount > 0 && <span className="text-red-400">{errCount} erros</span>}
                </div>
              </div>
              <div className="max-h-64 overflow-auto rounded-lg border border-white/10">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-slate-400 text-xs">Nome</TableHead>
                      <TableHead className="text-slate-400 text-xs">E-mail</TableHead>
                      <TableHead className="text-slate-400 text-xs">Nível</TableHead>
                      <TableHead className="text-slate-400 text-xs w-20">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, i) => (
                      <TableRow key={i} className="border-white/5 hover:bg-white/5">
                        <TableCell className="text-white text-xs py-2">{row.name || <span className="text-red-400">—</span>}</TableCell>
                        <TableCell className="text-slate-300 text-xs py-2 font-mono">{row.email || <span className="text-red-400">—</span>}</TableCell>
                        <TableCell className="py-2">
                          <PersonaBadge persona={row.persona} />
                        </TableCell>
                        <TableCell className="py-2">
                          {row.status === "ok" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                          {row.status === "error" && (
                            <span className="text-red-400 text-xs" title={row.error}>✗ {row.error?.slice(0, 20)}</span>
                          )}
                          {row.status === "pending" && <span className="text-slate-500 text-xs">—</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex gap-2 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-amber-400/80">
              Níveis válidos: <code>c-level</code>, <code>cio</code>, <code>gerente-sinistros</code>, <code>analista-fraude</code>, <code>perito</code>.
              E-mails duplicados serão ignorados.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2 border-t border-white/10">
          <Button variant="ghost" onClick={handleClose} className="text-slate-400 hover:text-white">Fechar</Button>
          <Button
            onClick={handleImport}
            disabled={rows.length === 0 || importing}
            className="bg-cyan-500 hover:bg-cyan-600 text-white gap-2"
          >
            {importing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Importar {rows.length > 0 ? `(${rows.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit User Modal ──────────────────────────────────────────────────────────
function EditUserModal({
  user,
  onClose,
  allowedPersonas,
}: {
  user: { id: number; name: string; email: string; persona: string; isActive: boolean } | null;
  onClose: () => void;
  allowedPersonas: string[];
}) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState({ name: user?.name ?? "", persona: user?.persona ?? "perito" });

  const updateUser = trpc.tenantUsers.update.useMutation({
    onSuccess: () => {
      toast.success("Usuário atualizado!");
      utils.tenantUsers.list.invalidate();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleActive = trpc.tenantUsers.update.useMutation({
    onSuccess: () => {
      toast.success("Status do usuário atualizado!");
      utils.tenantUsers.list.invalidate();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  if (!user) return null;

  return (
    <Dialog open={!!user} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#0d1526] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Edit2 className="w-5 h-5 text-cyan-400" /> Editar Usuário
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-sm">Nome</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-sm">E-mail</Label>
            <Input value={user.email} disabled className="bg-white/5 border-white/10 text-slate-500 cursor-not-allowed" />
            <p className="text-xs text-slate-600">O e-mail não pode ser alterado.</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-sm">Nível de acesso</Label>
            <Select value={form.persona} onValueChange={(v) => setForm((f) => ({ ...f, persona: v }))}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[#0d1526] border-white/10">
                {allowedPersonas.map((p) => (
                  <SelectItem key={p} value={p} className="text-white">{PERSONA_CONFIG[p]?.label ?? p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <p className="text-sm text-white font-medium">Status da conta</p>
              <p className="text-xs text-slate-400">{user.isActive ? "Conta ativa" : "Conta desativada"}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateUser.mutate({ userId: user.id })}
              disabled={toggleActive.isPending}
              className={`gap-2 border ${user.isActive
                ? "border-red-500/30 text-red-400 hover:bg-red-500/10"
                : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
              }`}
            >
              {user.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {user.isActive ? "Desativar" : "Ativar"}
            </Button>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white">Cancelar</Button>
          <Button
            onClick={() => updateUser.mutate({ userId: user.id, name: form.name, persona: form.persona as "c-level" | "cio" | "gerente-sinistros" | "analista-fraude" | "perito" })}
            disabled={!form.name || updateUser.isPending}
            className="bg-cyan-500 hover:bg-cyan-600 text-white gap-2"
          >
            {updateUser.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TenantUsers() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [editUser, setEditUser] = useState<{
    id: number; name: string; email: string; persona: string; isActive: boolean;
  } | null>(null);

  const persona = user?.persona ?? "";
  const canManage = persona === "c-level" || persona === "cio";
  const allowedPersonas = PERSONA_CONFIG[persona]?.canAdd ?? [];

  const { data: users, isLoading } = trpc.tenantUsers.list.useQuery(undefined, {
    enabled: canManage,
  });

  const filtered = (users ?? []).filter((u) =>
    (u.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (u.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (u.persona ?? "").toLowerCase().includes(search.toLowerCase())
  );

  if (!canManage) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <Shield className="w-12 h-12 text-slate-600 mx-auto" />
          <p className="text-slate-400">Apenas C-Level e CIO podem gerenciar usuários.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Gestão de Usuários</h1>
          <p className="text-slate-400 text-sm mt-1">
            Gerencie os usuários da sua organização. {persona === "c-level"
              ? "Como C-Level, você pode adicionar todos os níveis."
              : "Como CIO, você pode adicionar analistas, gerentes e peritos."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowBulk(true)}
            className="border-white/20 text-slate-300 hover:text-white gap-2"
          >
            <Upload className="w-4 h-4" /> Importar em Lote
          </Button>
          <Button
            onClick={() => setShowAdd(true)}
            className="bg-cyan-500 hover:bg-cyan-600 text-white gap-2"
          >
            <UserPlus className="w-4 h-4" /> Adicionar Usuário
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(PERSONA_CONFIG).map(([key, cfg]) => {
          const count = (users ?? []).filter((u) => u.persona === key).length;
          return (
            <Card key={key} className="bg-white/5 border-white/10">
              <CardContent className="p-4">
                <p className="text-xs text-slate-500 mb-1">{cfg.label}</p>
                <p className="text-2xl font-bold text-white">{count}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Table */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" />
              Usuários ({filtered.length})
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                placeholder="Buscar usuário..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-slate-500 text-sm h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 bg-white/5 rounded" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Nenhum usuário encontrado.</p>
              <Button
                onClick={() => setShowAdd(true)}
                variant="ghost"
                className="mt-3 text-cyan-400 hover:text-cyan-300 gap-2"
              >
                <UserPlus className="w-4 h-4" /> Adicionar primeiro usuário
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-slate-400 text-xs uppercase tracking-wider">Usuário</TableHead>
                  <TableHead className="text-slate-400 text-xs uppercase tracking-wider">Nível</TableHead>
                  <TableHead className="text-slate-400 text-xs uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-slate-400 text-xs uppercase tracking-wider">Criado em</TableHead>
                  <TableHead className="text-slate-400 text-xs uppercase tracking-wider w-20">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow key={u.id} className="border-white/5 hover:bg-white/5 transition-colors">
                    <TableCell className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-white/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-cyan-400">
                            {(u.name ?? "?").charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">{u.name}</p>
                          <p className="text-slate-500 text-xs font-mono">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <PersonaBadge persona={u.persona ?? "perito"} />
                    </TableCell>
                    <TableCell className="py-3">
                      {u.isActive ? (
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 gap-1 text-xs">
                          <CheckCircle2 className="w-3 h-3" /> Ativo
                        </Badge>
                      ) : (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 gap-1 text-xs">
                          <XCircle className="w-3 h-3" /> Inativo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-slate-400 text-xs">
                      {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditUser({
                          id: u.id,
                          name: u.name ?? "",
                          email: u.email ?? "",
                          persona: u.persona ?? "perito",
                          isActive: u.isActive,
                        })}
                        className="text-slate-400 hover:text-white h-8 w-8 p-0"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Boas práticas */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex gap-3">
        <Shield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-blue-300">Boas Práticas de Gestão de Usuários</p>
          <ul className="text-blue-400/70 mt-1 space-y-0.5 list-disc list-inside text-xs">
            <li>Aplique o princípio do menor privilégio — conceda apenas o nível necessário para a função.</li>
            <li>Revise periodicamente os usuários ativos e desative contas de ex-colaboradores imediatamente.</li>
            <li>Nunca compartilhe credenciais entre usuários — cada pessoa deve ter sua própria conta.</li>
            <li>Para importações em lote, valide o arquivo antes de enviar e revise os erros após a importação.</li>
          </ul>
        </div>
      </div>

      <AddUserModal open={showAdd} onClose={() => setShowAdd(false)} allowedPersonas={allowedPersonas} />
      <BulkImportModal open={showBulk} onClose={() => setShowBulk(false)} />
      <EditUserModal user={editUser} onClose={() => setEditUser(null)} allowedPersonas={allowedPersonas} />
    </div>
  );
}
