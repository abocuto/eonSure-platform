import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SectionHeader } from "@/components/EonComponents";
import { toast } from "sonner";
import { ClipboardList, ArrowLeft, Save } from "lucide-react";
import { Link } from "wouter";

const CLAIM_TYPES = [
  { value: "auto", label: "Automóvel" },
  { value: "property", label: "Propriedade" },
  { value: "health", label: "Saúde" },
  { value: "life", label: "Vida" },
  { value: "liability", label: "Responsabilidade Civil" },
  { value: "other", label: "Outros" },
];

export default function ClaimNew() {
  const [, navigate] = useLocation();
  const [form, setForm] = useState({
    insuredName: "",
    insuredDocument: "",
    policyNumber: "",
    claimType: "auto" as const,
    description: "",
    incidentDate: "",
    claimedAmount: "",
  });

  const createClaim = trpc.claims.create.useMutation({
    onSuccess: (data) => {
      toast.success(`Sinistro ${data.claimNumber} registrado com sucesso!`);
      navigate("/claims");
    },
    onError: (err) => {
      toast.error(`Erro ao registrar sinistro: ${err.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.insuredName || !form.claimType) {
      toast.error("Preencha os campos obrigatórios.");
      return;
    }
    createClaim.mutate(form);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <SectionHeader
        title="Registrar Novo Sinistro"
        subtitle="Etapa 1 de 4 — Ingestão de dados"
        icon={ClipboardList}
        actions={
          <Link href="/claims">
            <Button variant="outline" size="sm" className="border-border text-muted-foreground">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Voltar
            </Button>
          </Link>
        }
      />

      {/* Progress Steps */}
      <div className="flex items-center gap-2">
        {["Ingestão", "Triagem", "Análise de Risco", "Resolução"].map((step, i) => (
          <div key={step} className="flex items-center gap-2 flex-1">
            <div className={`flex items-center gap-2 ${i === 0 ? "text-primary" : "text-muted-foreground/40"}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${i === 0 ? "border-primary bg-primary/10 text-primary" : "border-muted-foreground/20"}`}>
                {i + 1}
              </div>
              <span className="text-xs font-medium hidden sm:block">{step}</span>
            </div>
            {i < 3 && <div className="flex-1 h-px bg-border" />}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="p-6 border border-border bg-card space-y-5">
          <h3 className="text-sm font-semibold text-foreground border-b border-border pb-3">
            Dados do Segurado
          </h3>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Nome do Segurado <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.insuredName}
                onChange={(e) => setForm({ ...form, insuredName: e.target.value })}
                placeholder="Nome completo"
                className="bg-input border-border text-sm"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">CPF / CNPJ</Label>
              <Input
                value={form.insuredDocument}
                onChange={(e) => setForm({ ...form, insuredDocument: e.target.value })}
                placeholder="000.000.000-00"
                className="bg-input border-border text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Número da Apólice</Label>
            <Input
              value={form.policyNumber}
              onChange={(e) => setForm({ ...form, policyNumber: e.target.value })}
              placeholder="APL-000000"
              className="bg-input border-border text-sm"
            />
          </div>

          <h3 className="text-sm font-semibold text-foreground border-b border-border pb-3 pt-2">
            Dados do Sinistro
          </h3>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Tipo de Sinistro <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.claimType}
                onValueChange={(v) => setForm({ ...form, claimType: v as typeof form.claimType })}
              >
                <SelectTrigger className="bg-input border-border text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLAIM_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Data do Incidente</Label>
              <Input
                type="date"
                value={form.incidentDate}
                onChange={(e) => setForm({ ...form, incidentDate: e.target.value })}
                className="bg-input border-border text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Valor Reclamado (R$)</Label>
            <Input
              type="number"
              value={form.claimedAmount}
              onChange={(e) => setForm({ ...form, claimedAmount: e.target.value })}
              placeholder="0,00"
              className="bg-input border-border text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Descrição do Sinistro</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Descreva o ocorrido com detalhes..."
              className="bg-input border-border text-sm min-h-[100px] resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Link href="/claims">
              <Button type="button" variant="outline" className="border-border text-muted-foreground">
                Cancelar
              </Button>
            </Link>
            <Button
              type="submit"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={createClaim.isPending}
            >
              <Save className="w-4 h-4 mr-1.5" />
              {createClaim.isPending ? "Registrando..." : "Registrar Sinistro"}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
