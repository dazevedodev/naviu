import { describe, expect, it } from "vitest";
import { ganhoDoBarbeiro, resumirFinanceiro, type BarbeiroFinanceiro } from "./financeiro";

const rafael: BarbeiroFinanceiro = {
  id: "r",
  nome: "Rafael",
  remuneracao: "comissao",
  comissao_percentual: 50,
  valor_fixo: 0,
};
const bruno: BarbeiroFinanceiro = {
  id: "b",
  nome: "Bruno",
  remuneracao: "aluguel",
  comissao_percentual: 0,
  valor_fixo: 800,
};

describe("ganhoDoBarbeiro", () => {
  it("comissão é a % do que atendeu", () => {
    expect(ganhoDoBarbeiro(rafael, 1000)).toBe(500);
  });

  it("fixo + comissão soma o salário à %", () => {
    expect(
      ganhoDoBarbeiro({ ...rafael, remuneracao: "fixo_comissao", valor_fixo: 1500, comissao_percentual: 20 }, 1000),
    ).toBe(1700);
  });

  it("aluguel: fica com tudo menos o aluguel da cadeira", () => {
    expect(ganhoDoBarbeiro(bruno, 3000)).toBe(2200);
    expect(ganhoDoBarbeiro(bruno, 500)).toBe(-300);
  });
});

describe("resumirFinanceiro", () => {
  const atendimentos = [
    { barbeiro_id: "r", valor: 40, forma_pagamento: "pix", servico: "Corte" },
    { barbeiro_id: "r", valor: 65, forma_pagamento: "cartao", servico: "Corte + barba" },
    { barbeiro_id: "b", valor: 40, forma_pagamento: "pix", servico: "Corte" },
  ];

  it("desconta vales e pagamentos do que falta pagar, sem contar de novo como custo", () => {
    const r = resumirFinanceiro([rafael, bruno], atendimentos, [
      { tipo: "vale", barbeiro_id: "r", valor: 20 },
      { tipo: "pagamento", barbeiro_id: "r", valor: 10 },
      { tipo: "despesa", barbeiro_id: null, valor: 100 },
    ]);

    expect(r.faturamento).toBe(145);
    expect(r.ticketMedio).toBe(48.33);
    const deRafael = r.porBarbeiro.find((p) => p.barbeiro.id === "r")!;
    expect(deRafael).toMatchObject({ atendimentos: 2, faturamento: 105, ganho: 52.5, aPagar: 22.5 });
    // Bruno atendeu 40 e deve 800 de aluguel: ganho negativo, ele deve à barbearia.
    expect(r.porBarbeiro.find((p) => p.barbeiro.id === "b")!.aPagar).toBe(-760);
    expect(r.custoEquipe).toBe(-707.5);
    // Repasse: 52,50 de comissão do Rafael + os 40 que o Bruno atendeu; aluguel à parte.
    expect(r.repasseEquipe).toBe(92.5);
    expect(r.aluguel).toBe(800);
    expect(r.despesas).toBe(100);
    expect(r.lucro).toBe(752.5);
  });

  it("agrupa por forma de pagamento e por serviço", () => {
    const r = resumirFinanceiro([rafael, bruno], atendimentos, []);
    expect(r.porForma).toEqual([
      { forma: "pix", valor: 80 },
      { forma: "cartao", valor: 65 },
    ]);
    expect(r.porServico[0]).toEqual({ servico: "Corte", quantidade: 2, valor: 80 });
  });
});
