import { describe, expect, it } from "vitest";
import { acessoAte, acessoLiberado, cobreAte, diasRestantes } from "./assinatura";

const agora = new Date("2026-10-19T12:00:00-03:00");
const dias = (n: number) => new Date(agora.getTime() + n * 86_400_000).toISOString();

describe("acessoLiberado", () => {
  it("libera teste dentro do prazo e bloqueia depois", () => {
    expect(acessoLiberado({ assinatura_status: "trial", assinatura_valido_ate: dias(2) }, agora)).toBe(true);
    expect(acessoLiberado({ assinatura_status: "trial", assinatura_valido_ate: dias(-1) }, agora)).toBe(false);
  });

  it("dá carência de 3 dias pra mensalidade vencida", () => {
    const vencida = { assinatura_status: "atrasada" as const, assinatura_valido_ate: dias(-2) };
    expect(acessoLiberado(vencida, agora)).toBe(true);
    expect(acessoLiberado({ ...vencida, assinatura_valido_ate: dias(-4) }, agora)).toBe(false);
  });

  it("cancelada vale só até o fim do período pago, sem carência", () => {
    expect(acessoLiberado({ assinatura_status: "cancelada", assinatura_valido_ate: dias(5) }, agora)).toBe(true);
    expect(acessoLiberado({ assinatura_status: "cancelada", assinatura_valido_ate: dias(-1) }, agora)).toBe(false);
  });

  it("bloqueia quando não há data de validade", () => {
    expect(acessoLiberado({ assinatura_status: "ativa", assinatura_valido_ate: null }, agora)).toBe(false);
    expect(acessoAte({ assinatura_status: "trial", assinatura_valido_ate: null })).toBeNull();
  });
});

describe("cobreAte", () => {
  it("cobre até o dia seguinte ao próximo vencimento", () => {
    expect(cobreAte("2026-11-02").toISOString()).toBe("2026-12-04T02:59:00.000Z");
  });

  it("passa a virada do ano", () => {
    expect(cobreAte("2026-12-15").toISOString()).toBe("2027-01-17T02:59:00.000Z");
  });
});

describe("diasRestantes", () => {
  it("arredonda pra cima e nunca fica negativo", () => {
    expect(diasRestantes(dias(2.2), agora)).toBe(3);
    expect(diasRestantes(dias(-1), agora)).toBe(0);
    expect(diasRestantes(null, agora)).toBe(0);
  });
});
