import { createClient } from "@/lib/supabase/server";
import { acessoAte, acessoLiberado, diasRestantes } from "@/lib/assinatura";
import { buscarPlano, formatarReais, type PlanoId } from "@/lib/planos";
import type { Barbearia } from "@/lib/types";
import { PainelAssinatura } from "./painel-assinatura";

type LinhaAssinatura = {
  plano: PlanoId;
  forma: "cartao" | "pix_boleto";
  asaas_cliente_id: string | null;
  asaas_assinatura_id: string | null;
  fatura_url: string | null;
};

function formatarData(data: Date | string) {
  return new Date(data).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function Situacao({ barbearia, temAssinatura }: { barbearia: Barbearia; temAssinatura: boolean }) {
  const liberado = acessoLiberado(barbearia);
  const ate = acessoAte(barbearia);
  const plano = buscarPlano(barbearia.plano);
  const dias = diasRestantes(barbearia.assinatura_valido_ate);

  let titulo: string;
  let texto: string;
  let tom: "ok" | "atencao" | "bloqueado" = "ok";

  if (!liberado) {
    tom = "bloqueado";
    titulo = "Seu acesso está pausado";
    texto =
      barbearia.assinatura_status === "trial"
        ? "O teste grátis acabou. Assine pra voltar a usar a agenda e receber agendamentos."
        : "Não encontramos o pagamento da mensalidade. Pague a fatura pra voltar a usar.";
  } else if (barbearia.assinatura_status === "trial") {
    tom = dias <= 3 ? "atencao" : "ok";
    titulo = `Teste grátis: ${dias === 1 ? "falta 1 dia" : `faltam ${dias} dias`}`;
    texto = temAssinatura
      ? `Assinatura feita. A primeira cobrança é em ${formatarData(barbearia.assinatura_valido_ate!)}.`
      : `Seu teste vai até ${formatarData(barbearia.assinatura_valido_ate!)}. Assine antes pra não perder o acesso — você só paga quando o teste acaba.`;
  } else if (barbearia.assinatura_status === "ativa") {
    titulo = `Plano ${plano?.nome ?? barbearia.plano} em dia`;
    texto = `${plano ? `${formatarReais(plano.valor)}/mês. ` : ""}Pago até ${formatarData(barbearia.assinatura_valido_ate!)}.`;
  } else if (barbearia.assinatura_status === "atrasada") {
    tom = "atencao";
    titulo = "Pagamento pendente";
    texto = `Pague a fatura pra não perder o acesso. Você usa normalmente até ${formatarData(ate!)}.`;
  } else {
    tom = "atencao";
    titulo = "Assinatura cancelada";
    texto = `Você usa até ${formatarData(ate!)}. Pode assinar de novo quando quiser.`;
  }

  const cores = {
    ok: "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950",
    atencao: "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40",
    bloqueado: "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/40",
  };

  return (
    <div className={`max-w-2xl rounded-2xl border p-6 ${cores[tom]}`}>
      <h2 className="font-semibold text-zinc-950 dark:text-zinc-50">{titulo}</h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{texto}</p>
    </div>
  );
}

// Usada pela página /admin/assinatura e pelo layout do admin quando o acesso
// está pausado (aí ela aparece no lugar de qualquer página).
export async function TelaAssinatura({ barbearia }: { barbearia: Barbearia }) {
  const supabase = await createClient();
  const { data: linha } = await supabase
    .from("assinaturas")
    .select("plano, forma, asaas_cliente_id, asaas_assinatura_id, fatura_url")
    .eq("barbearia_id", barbearia.id)
    .maybeSingle<LinhaAssinatura>();

  const temAssinatura =
    Boolean(linha?.asaas_assinatura_id) && barbearia.assinatura_status !== "cancelada";

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">Minha assinatura</h1>
      <Situacao barbearia={barbearia} temAssinatura={temAssinatura} />
      <PainelAssinatura
        temAssinatura={temAssinatura}
        precisaDocumento={!linha?.asaas_cliente_id}
        planoAtual={linha?.plano ?? barbearia.plano}
        formaAtual={linha?.forma ?? "cartao"}
        faturaUrl={linha?.fatura_url ?? null}
      />
      <p className="max-w-2xl text-xs text-zinc-500">
        Pagamentos processados pelo Asaas. Sem fidelidade: cancele quando quiser.
      </p>
    </div>
  );
}
