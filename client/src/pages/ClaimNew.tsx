import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/EonComponents";
import { toast } from "sonner";
import {
  ClipboardList, ArrowLeft, Save, Upload, X, FileText,
  Image, Loader2, Zap,
} from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

const CLAIM_TYPES = [
  { value: "auto", label: "Automóvel" },
  { value: "property", label: "Propriedade" },
  { value: "health", label: "Saúde" },
  { value: "life", label: "Vida" },
  { value: "liability", label: "Responsabilidade Civil" },
  { value: "other", label: "Outros" },
];

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_FILE_SIZE_MB = 10;

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  dataUrl: string;
}

export default function ClaimNew() {
  const [, navigate] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
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
      toast.success(`Sinistro ${data.claimNumber} registrado! Pipeline de IA iniciado automaticamente.`, {
        duration: 5000,
      });
      navigate(`/claims/${data.claimId}`);
    },
    onError: (err) => {
      toast.error(`Erro ao registrar sinistro: ${err.message}`);
    },
  });

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    const newFiles: UploadedFile[] = [];

    Array.from(files).forEach((file) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error(`Tipo de arquivo não suportado: ${file.name}. Use PDF, JPG, PNG ou WebP.`);
        return;
      }
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        toast.error(`Arquivo muito grande: ${file.name}. Máximo ${MAX_FILE_SIZE_MB}MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        newFiles.push({
          name: file.name,
          size: file.size,
          type: file.type,
          dataUrl: e.target?.result as string,
        });
        if (newFiles.length === Array.from(files).filter((f) => ACCEPTED_TYPES.includes(f.type)).length) {
          setUploadedFiles((prev) => [...prev, ...newFiles]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.insuredName || !form.claimType) {
      toast.error("Preencha os campos obrigatórios.");
      return;
    }
    createClaim.mutate({
      ...form,
      attachmentUrls: uploadedFiles.map((f) => f.dataUrl),
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

      {/* AI Pipeline Notice */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-primary/20 bg-primary/5 text-xs text-muted-foreground">
        <Zap className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
        <span>
          Ao registrar, o <strong className="text-foreground">Pipeline de IA EonSure</strong> será ativado automaticamente:
          Motor de Regras + Score de Fraude serão executados em background sem necessidade de ação manual.
        </span>
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

          {/* Document Upload — Estrutura Eônica */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground">
                Documentos e Evidências
              </Label>
              <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                Estrutura Eônica
              </Badge>
            </div>

            {/* Drop Zone */}
            <div
              className={cn(
                "relative border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer",
                isDragging
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50 hover:bg-accent/20"
              )}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files)}
              />
              <Upload className={cn("w-8 h-8 mx-auto mb-2", isDragging ? "text-primary" : "text-muted-foreground/40")} />
              <p className="text-sm text-muted-foreground">
                <span className="text-primary font-medium">Clique para selecionar</span> ou arraste arquivos aqui
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                PDF, JPG, PNG, WebP · Máximo {MAX_FILE_SIZE_MB}MB por arquivo
              </p>
            </div>

            {/* File List */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                {uploadedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border bg-muted/20"
                  >
                    {file.type.startsWith("image/") ? (
                      <Image className="w-4 h-4 text-primary flex-shrink-0" />
                    ) : (
                      <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="w-6 h-6 text-muted-foreground hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
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
              {createClaim.isPending ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-1.5" />
              )}
              {createClaim.isPending ? "Registrando e iniciando IA..." : "Registrar Sinistro"}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
