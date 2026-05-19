import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { SectionHeader, EmptyState } from "@/components/EonComponents";
import { toast } from "sonner";
import { MessageSquare, Star, TrendingUp, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PERSONA_LABELS } from "../../../shared/types";
import type { Persona } from "../../../shared/types";

const CSAT_QUESTIONS: Record<Persona, string[]> = {
  "c-level": [
    "Como você avalia a visibilidade dos KPIs executivos?",
    "O dashboard atende às suas necessidades de tomada de decisão?",
  ],
  "gerente-sinistros": [
    "Como você avalia a eficiência do fluxo de sinistros?",
    "O Motor de Regras facilita a triagem automática?",
  ],
  "analista-fraude": [
    "O score de risco de fraude é preciso e útil?",
    "O painel de investigação atende às suas necessidades?",
  ],
  "cio": [
    "A plataforma atende aos requisitos técnicos da sua organização?",
    "A ativação modular dos pilares é clara e funcional?",
  ],
  "perito": [
    "As informações do sinistro são suficientes para avaliação?",
    "A sugestão de indenização da IA é útil como referência?",
  ],
};

export default function Csat() {
  const { user } = useAuth();
  const persona = (user?.persona ?? "perito") as Persona;
  const [score, setScore] = useState(0);
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const utils = trpc.useUtils();
  const { data: responses, isLoading } = trpc.csat.list.useQuery();

  const submitCsat = trpc.csat.submit.useMutation({
    onSuccess: () => {
      toast.success("Feedback enviado! Obrigado pela sua avaliação.");
      utils.csat.list.invalidate();
      setSubmitted(true);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = () => {
    if (score === 0) { toast.error("Selecione uma nota de satisfação"); return; }
    submitCsat.mutate({ score, npsScore: npsScore ?? undefined, feedback });
  };

  const avgScore = responses && responses.length > 0
    ? (responses.reduce((a, b) => a + b.score, 0) / responses.length).toFixed(1)
    : "—";

  const avgNps = responses?.filter((r) => r.npsScore !== null).length
    ? (responses.filter((r) => r.npsScore !== null).reduce((a, b) => a + (b.npsScore ?? 0), 0) /
        responses.filter((r) => r.npsScore !== null).length).toFixed(1)
    : "—";

  const questions = CSAT_QUESTIONS[persona];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="CSAT — Satisfação do Cliente"
        subtitle="Coleta de feedback integrada ao workflow por persona"
        icon={MessageSquare}
      />

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 border border-border bg-card">
          <div className="flex items-center gap-3 mb-2">
            <Star className="w-5 h-5 text-yellow-400" />
            <span className="text-sm font-medium text-muted-foreground">CSAT Médio</span>
          </div>
          <p className="text-3xl font-black text-foreground">{avgScore}</p>
          <p className="text-xs text-muted-foreground mt-1">Escala de 1 a 10</p>
        </Card>
        <Card className="p-5 border border-border bg-card">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">NPS Médio</span>
          </div>
          <p className="text-3xl font-black text-foreground">{avgNps}</p>
          <p className="text-xs text-muted-foreground mt-1">Net Promoter Score</p>
        </Card>
        <Card className="p-5 border border-border bg-card">
          <div className="flex items-center gap-3 mb-2">
            <MessageSquare className="w-5 h-5 text-cyan-400" />
            <span className="text-sm font-medium text-muted-foreground">Total de Respostas</span>
          </div>
          <p className="text-3xl font-black text-foreground">{responses?.length ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-1">Feedbacks coletados</p>
        </Card>
      </div>

      {/* Feedback Form */}
      {!submitted ? (
        <Card className="p-6 border border-border bg-card">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Sua Avaliação</h3>
              <p className="text-xs text-muted-foreground">Como {PERSONA_LABELS[persona]}</p>
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-4 mb-5">
            {questions.map((q, i) => (
              <div key={i} className="p-3 rounded-lg bg-accent/30 border border-border">
                <p className="text-xs text-muted-foreground">{q}</p>
              </div>
            ))}
          </div>

          {/* CSAT Score */}
          <div className="space-y-3 mb-5">
            <p className="text-sm font-medium text-foreground">
              Nota de Satisfação Geral <span className="text-destructive">*</span>
            </p>
            <div className="flex gap-2 flex-wrap">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setScore(n)}
                  className={cn(
                    "w-10 h-10 rounded-lg text-sm font-bold border-2 transition-all",
                    score === n
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Muito insatisfeito</span>
              <span>Muito satisfeito</span>
            </div>
          </div>

          {/* NPS */}
          <div className="space-y-3 mb-5">
            <p className="text-sm font-medium text-foreground">
              Probabilidade de Recomendar (NPS)
            </p>
            <div className="flex gap-1.5 flex-wrap">
              {Array.from({ length: 11 }, (_, i) => i).map((n) => (
                <button
                  key={n}
                  onClick={() => setNpsScore(n)}
                  className={cn(
                    "w-9 h-9 rounded-lg text-xs font-bold border transition-all",
                    npsScore === n
                      ? n >= 9 ? "border-green-500 bg-green-500/20 text-green-400"
                        : n >= 7 ? "border-yellow-500 bg-yellow-500/20 text-yellow-400"
                        : "border-red-500 bg-red-500/20 text-red-400"
                      : "border-border bg-card text-muted-foreground hover:border-primary/50"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Jamais recomendaria</span>
              <span>Certamente recomendaria</span>
            </div>
          </div>

          {/* Feedback Text */}
          <div className="space-y-2 mb-5">
            <p className="text-sm font-medium text-foreground">Comentários Adicionais</p>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Compartilhe sua experiência com a plataforma..."
              className="bg-input border-border text-sm min-h-[80px] resize-none"
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={submitCsat.isPending || score === 0}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {submitCsat.isPending ? "Enviando..." : "Enviar Avaliação"}
          </Button>
        </Card>
      ) : (
        <Card className="p-8 border border-green-500/20 bg-green-500/5 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-foreground mb-2">Avaliação Enviada!</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Obrigado pelo seu feedback. Ele será usado para melhorar a plataforma EonSure.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSubmitted(false)}
            className="border-border text-muted-foreground"
          >
            Enviar Nova Avaliação
          </Button>
        </Card>
      )}

      {/* Responses History */}
      {responses && responses.length > 0 && (
        <Card className="border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Histórico de Respostas</h3>
          </div>
          <div className="divide-y divide-border max-h-80 overflow-y-auto">
            {responses.map((r) => (
              <div key={r.id} className="px-5 py-3 flex items-center gap-4">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0",
                  r.score >= 8 ? "bg-green-500/20 text-green-400" :
                  r.score >= 6 ? "bg-yellow-500/20 text-yellow-400" :
                  "bg-red-500/20 text-red-400"
                )}>
                  {r.score}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                      {PERSONA_LABELS[r.persona as Persona] ?? r.persona}
                    </Badge>
                    {r.npsScore !== null && (
                      <span className="text-xs text-muted-foreground">NPS: {r.npsScore}</span>
                    )}
                  </div>
                  {r.feedback && (
                    <p className="text-xs text-muted-foreground truncate">{r.feedback}</p>
                  )}
                  <p className="text-xs text-muted-foreground/50 mt-0.5">
                    {new Date(r.createdAt).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
