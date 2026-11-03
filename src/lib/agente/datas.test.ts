import { describe, expect, it } from "vitest";
import { dataISOValida, intervaloDeDatas, noPeriodo, somarDias } from "./datas";
import { horarioBrasilia } from "../timezone";
import { normalizarTelefone, telefoneValido } from "../telefone";

describe("datas do agente", () => {
  it("valida datas no formato YYYY-MM-DD", () => {
    expect(dataISOValida("2026-11-06")).toBe(true);
    expect(dataISOValida("2026-02-30")).toBe(false);
    expect(dataISOValida("06/11/2026")).toBe(false);
  });

  it("soma dias atravessando o mês", () => {
    expect(somarDias("2026-11-29", 3)).toBe("2026-12-02");
  });

  it("não deixa consultar o passado nem mais de 7 dias", () => {
    const hoje = "2026-11-03";
    expect(intervaloDeDatas("2026-11-01", "2026-11-04", hoje)).toEqual([
      "2026-11-03",
      "2026-11-04",
    ]);
    expect(intervaloDeDatas("2026-11-03", "2026-12-31", hoje)).toHaveLength(7);
    expect(intervaloDeDatas("2027-06-01", "2027-06-02", hoje)).toEqual([]);
  });

  it("separa manhã, tarde e noite no horário de Brasília", () => {
    const dia = "2026-11-06";
    expect(noPeriodo(horarioBrasilia(dia, "09:30"), "manha")).toBe(true);
    expect(noPeriodo(horarioBrasilia(dia, "12:00"), "manha")).toBe(false);
    expect(noPeriodo(horarioBrasilia(dia, "14:00"), "tarde")).toBe(true);
    expect(noPeriodo(horarioBrasilia(dia, "18:00"), "tarde")).toBe(false);
    expect(noPeriodo(horarioBrasilia(dia, "19:00"), "noite")).toBe(true);
    expect(noPeriodo(horarioBrasilia(dia, "07:00"), "qualquer")).toBe(true);
  });
});

describe("telefone do cliente", () => {
  it("trata formatos diferentes como a mesma pessoa", () => {
    expect(normalizarTelefone("(11) 98888-7777")).toBe("11988887777");
    expect(normalizarTelefone("+55 11 98888-7777")).toBe("11988887777");
    expect(normalizarTelefone("5511988887777")).toBe("11988887777");
  });

  it("aceita só números com DDD", () => {
    expect(telefoneValido("11 98888-7777")).toBe(true);
    expect(telefoneValido("98888-7777")).toBe(false);
  });
});
