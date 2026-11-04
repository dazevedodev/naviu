import { describe, expect, it } from "vitest";
import { mensagemVolta, situacaoSumido } from "./sumidos";

const agora = new Date("2026-11-04T12:00:00Z");
const diasAtras = (n: number) => new Date(agora.getTime() - n * 86_400_000).toISOString();

describe("situacaoSumido", () => {
  it("separa quem veio uma vez de quem é fiel", () => {
    expect(situacaoSumido({ visitas: 1, ultima_visita: diasAtras(45), proximo_horario: null }, agora)).toEqual({
      tipo: "uma_vez",
      dias: 45,
    });
    expect(situacaoSumido({ visitas: 6, ultima_visita: diasAtras(60), proximo_horario: null }, agora)?.tipo).toBe("fiel");
  });

  it("ignora quem veio há pouco, tem horário marcado ou nunca veio", () => {
    expect(situacaoSumido({ visitas: 3, ultima_visita: diasAtras(39), proximo_horario: null }, agora)).toBeNull();
    expect(
      situacaoSumido({ visitas: 3, ultima_visita: diasAtras(90), proximo_horario: diasAtras(-2) }, agora),
    ).toBeNull();
    expect(situacaoSumido({ visitas: 0, ultima_visita: null, proximo_horario: null }, agora)).toBeNull();
  });

  it("tira da lista por 30 dias quem já foi chamado", () => {
    const base = { visitas: 2, ultima_visita: diasAtras(80), proximo_horario: null };
    expect(situacaoSumido({ ...base, chamado_em: diasAtras(10) }, agora)).toBeNull();
    expect(situacaoSumido({ ...base, chamado_em: diasAtras(31) }, agora)?.tipo).toBe("fiel");
  });
});

describe("mensagemVolta", () => {
  it("usa o primeiro nome e o link da barbearia", () => {
    const m = mensagemVolta({ tipo: "fiel", dias: 52 }, "João Souza", "Barbearia X", "barbeariax");
    expect(m).toContain("Oi, João!");
    expect(m).toContain("52 dias");
    expect(m).toContain("naviu.app.br/barbeariax");
  });
});
