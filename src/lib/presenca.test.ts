import { describe, expect, it } from "vitest";
import {
  alertaDoHistorico,
  canceladoEmCimaDaHora,
  precisaPedirConfirmacao,
  resumirHistorico,
} from "./presenca";

const agora = new Date("2026-11-05T12:00:00Z");
const horas = (h: number) => new Date(agora.getTime() + h * 60 * 60_000).toISOString();

describe("canceladoEmCimaDaHora", () => {
  it("menos de 3h antes conta", () => {
    expect(canceladoEmCimaDaHora(new Date(horas(2)), agora)).toBe(true);
  });
  it("3h ou mais antes não conta", () => {
    expect(canceladoEmCimaDaHora(new Date(horas(3)), agora)).toBe(false);
    expect(canceladoEmCimaDaHora(new Date(horas(30)), agora)).toBe(false);
  });
});

describe("precisaPedirConfirmacao", () => {
  const marcadoHaTresDias = horas(-72);

  it("pede quando falta até 24h e foi marcado com antecedência", () => {
    expect(precisaPedirConfirmacao({ data_hora: horas(20), criado_em: marcadoHaTresDias }, agora)).toBe(true);
    expect(precisaPedirConfirmacao({ data_hora: horas(24), criado_em: marcadoHaTresDias }, agora)).toBe(true);
  });
  it("não pede cedo demais", () => {
    expect(precisaPedirConfirmacao({ data_hora: horas(25), criado_em: marcadoHaTresDias }, agora)).toBe(false);
  });
  it("não pede quando já está perto (o lembrete de 1h cuida)", () => {
    expect(precisaPedirConfirmacao({ data_hora: horas(1), criado_em: marcadoHaTresDias }, agora)).toBe(false);
  });
  it("não pede para quem marcou há pouco", () => {
    expect(precisaPedirConfirmacao({ data_hora: horas(20), criado_em: horas(-1) }, agora)).toBe(false);
  });
});

describe("resumirHistorico e alertaDoHistorico", () => {
  it("conta faltas e cancelamentos do cliente em cima da hora", () => {
    const resumo = resumirHistorico([
      { status: "concluido", data_hora: horas(-200), cancelado_em: null, cancelado_por: null },
      { status: "faltou", data_hora: horas(-100), cancelado_em: null, cancelado_por: null },
      { status: "faltou", data_hora: horas(-50), cancelado_em: null, cancelado_por: null },
      { status: "cancelado", data_hora: horas(1), cancelado_em: agora.toISOString(), cancelado_por: "cliente" },
      // Cancelado com antecedência ou pela barbearia: não pesa contra o cliente.
      { status: "cancelado", data_hora: horas(48), cancelado_em: agora.toISOString(), cancelado_por: "cliente" },
      { status: "cancelado", data_hora: horas(1), cancelado_em: agora.toISOString(), cancelado_por: "barbearia" },
    ]);
    expect(resumo).toEqual({ atendimentos: 1, faltas: 2, cancelamentosEmCima: 1 });
    expect(alertaDoHistorico(resumo)).toBe("2 faltas · 1 cancelamento em cima da hora");
  });
  it("sem problema, sem alerta", () => {
    expect(alertaDoHistorico({ atendimentos: 5, faltas: 0, cancelamentosEmCima: 0 })).toBeNull();
  });
});
