// Contas do financeiro da barbearia num período (normalmente um mês).
//
// Três jeitos de pagar um barbeiro, os mais comuns no Brasil:
// - comissao: ele ganha uma % do que atendeu (o comum é 40% a 60%).
// - fixo_comissao: salário fixo no mês mais uma % do que atendeu.
// - aluguel: ele aluga a cadeira. Fica com tudo o que atendeu e paga um
//   valor fixo por mês para a barbearia.
//
// Vale é dinheiro adiantado ao barbeiro; pagamento é o que o dono já pagou
// no fechamento. Os dois descontam do que falta pagar, mas não são custo a
// mais: já fazem parte do que ele ganhou.

export type Remuneracao = "comissao" | "fixo_comissao" | "aluguel";

export const NOME_REMUNERACAO: Record<Remuneracao, string> = {
  comissao: "Comissão",
  fixo_comissao: "Fixo + comissão",
  aluguel: "Aluguel de cadeira",
};

export type BarbeiroFinanceiro = {
  id: string;
  nome: string;
  remuneracao: Remuneracao;
  comissao_percentual: number;
  valor_fixo: number;
};

export type Atendimento = {
  barbeiro_id: string;
  valor: number;
  forma_pagamento: string | null;
  servico: string;
};

export type Lancamento = {
  tipo: "despesa" | "vale" | "pagamento";
  barbeiro_id: string | null;
  valor: number;
};

export type ResumoBarbeiro = {
  barbeiro: BarbeiroFinanceiro;
  atendimentos: number;
  faturamento: number;
  ganho: number; // o que ele ganhou no período
  vales: number;
  pagos: number;
  aPagar: number; // ganho - vales - pagos (negativo = barbeiro deve à barbearia)
};

export type ResumoFinanceiro = {
  faturamento: number;
  atendimentos: number;
  ticketMedio: number;
  // O que fica com a equipe: comissões e salários, e tudo o que atendeu quem
  // aluga a cadeira.
  repasseEquipe: number;
  // Aluguel de cadeira que os barbeiros pagam à barbearia no mês.
  aluguel: number;
  custoEquipe: number; // repasseEquipe - aluguel
  despesas: number;
  lucro: number;
  porBarbeiro: ResumoBarbeiro[];
  porForma: { forma: string; valor: number }[];
  porServico: { servico: string; quantidade: number; valor: number }[];
};

const centavos = (v: number) => Math.round(v * 100) / 100;

export function ganhoDoBarbeiro(b: BarbeiroFinanceiro, faturamento: number): number {
  const pct = b.comissao_percentual / 100;
  if (b.remuneracao === "aluguel") return centavos(faturamento - b.valor_fixo);
  if (b.remuneracao === "fixo_comissao") return centavos(b.valor_fixo + faturamento * pct);
  return centavos(faturamento * pct);
}

function somar<T>(itens: T[], valor: (i: T) => number) {
  return centavos(itens.reduce((t, i) => t + valor(i), 0));
}

function agrupar<T>(itens: T[], chave: (i: T) => string) {
  const mapa = new Map<string, T[]>();
  for (const i of itens) mapa.set(chave(i), [...(mapa.get(chave(i)) ?? []), i]);
  return mapa;
}

export function resumirFinanceiro(
  barbeiros: BarbeiroFinanceiro[],
  atendimentos: Atendimento[],
  lancamentos: Lancamento[],
): ResumoFinanceiro {
  const porBarbeiro = barbeiros.map((b) => {
    const deles = atendimentos.filter((a) => a.barbeiro_id === b.id);
    const faturamento = somar(deles, (a) => a.valor);
    const ganho = ganhoDoBarbeiro(b, faturamento);
    const vales = somar(
      lancamentos.filter((l) => l.tipo === "vale" && l.barbeiro_id === b.id),
      (l) => l.valor,
    );
    const pagos = somar(
      lancamentos.filter((l) => l.tipo === "pagamento" && l.barbeiro_id === b.id),
      (l) => l.valor,
    );
    return {
      barbeiro: b,
      atendimentos: deles.length,
      faturamento,
      ganho,
      vales,
      pagos,
      aPagar: centavos(ganho - vales - pagos),
    };
  });

  const faturamento = somar(atendimentos, (a) => a.valor);
  const custoEquipe = somar(porBarbeiro, (r) => r.ganho);
  const aluguel = somar(
    barbeiros.filter((b) => b.remuneracao === "aluguel"),
    (b) => b.valor_fixo,
  );
  const despesas = somar(
    lancamentos.filter((l) => l.tipo === "despesa"),
    (l) => l.valor,
  );

  return {
    faturamento,
    atendimentos: atendimentos.length,
    ticketMedio: atendimentos.length ? centavos(faturamento / atendimentos.length) : 0,
    repasseEquipe: centavos(custoEquipe + aluguel),
    aluguel,
    custoEquipe,
    despesas,
    lucro: centavos(faturamento - custoEquipe - despesas),
    porBarbeiro,
    porForma: [...agrupar(atendimentos, (a) => a.forma_pagamento ?? "nao_informado")]
      .map(([forma, itens]) => ({ forma, valor: somar(itens, (a) => a.valor) }))
      .sort((a, b) => b.valor - a.valor),
    porServico: [...agrupar(atendimentos, (a) => a.servico)]
      .map(([servico, itens]) => ({
        servico,
        quantidade: itens.length,
        valor: somar(itens, (a) => a.valor),
      }))
      .sort((a, b) => b.valor - a.valor),
  };
}

export function reais(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
