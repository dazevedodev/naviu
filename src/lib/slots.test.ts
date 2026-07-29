import { describe, expect, it } from "vitest";
import { gerarSlotsDisponiveis, type JanelaTrabalho } from "./slots";
import { horarioBrasilia } from "./timezone";

// Segunda-feira, 2026-08-03 (dia_semana = 1)
const SEGUNDA_ISO = "2026-08-03";

function horario(hora: string) {
  return horarioBrasilia(SEGUNDA_ISO, hora);
}

function janelaAutomatica(overrides: Partial<JanelaTrabalho> = {}): JanelaTrabalho {
  return {
    dia_semana: 1,
    modo: "automatico",
    hora_inicio: "09:00",
    hora_fim: "12:00",
    intervalo_min: 15,
    pausa_inicio: null,
    pausa_fim: null,
    horarios_manuais: [],
    ...overrides,
  };
}

describe("gerarSlotsDisponiveis", () => {
  it("gera slots a cada 15min dentro da janela de trabalho", () => {
    const slots = gerarSlotsDisponiveis({
      dataISO: SEGUNDA_ISO,
      diaSemana: 1,
      duracaoServicoMin: 30,
      horariosTrabalho: [janelaAutomatica()],
      ocupados: [],
    });

    expect(slots).toHaveLength(11); // 09:00 até 11:30, de 15 em 15
    expect(slots[0]).toEqual(horario("09:00"));
    expect(slots.at(-1)).toEqual(horario("11:30"));
  });

  it("respeita um intervalo diferente de 15min (ex.: de 1 em 1 hora)", () => {
    const slots = gerarSlotsDisponiveis({
      dataISO: SEGUNDA_ISO,
      diaSemana: 1,
      duracaoServicoMin: 30,
      horariosTrabalho: [
        janelaAutomatica({ hora_inicio: "09:00", hora_fim: "12:00", intervalo_min: 60 }),
      ],
      ocupados: [],
    });

    expect(slots).toEqual([horario("09:00"), horario("10:00"), horario("11:00")]);
  });

  it("não inclui horário só para o dia da semana correspondente", () => {
    const slots = gerarSlotsDisponiveis({
      dataISO: SEGUNDA_ISO,
      diaSemana: 1,
      duracaoServicoMin: 30,
      horariosTrabalho: [janelaAutomatica({ dia_semana: 2 })],
      ocupados: [],
    });

    expect(slots).toHaveLength(0);
  });

  it("remove slots que colidem com um intervalo ocupado", () => {
    const slots = gerarSlotsDisponiveis({
      dataISO: SEGUNDA_ISO,
      diaSemana: 1,
      duracaoServicoMin: 30,
      horariosTrabalho: [janelaAutomatica({ hora_inicio: "09:00", hora_fim: "10:00" })],
      ocupados: [{ inicio: horario("09:15"), fim: horario("09:45") }],
    });

    // 09:00 (termina 09:30, colide com 09:15-09:45) fica de fora
    // 09:15 e 09:30 colidem diretamente
    // 09:45 é o primeiro livre de novo (09:45-10:15 não cabe na janela até 10:00)
    expect(slots).toEqual([]);
  });

  it("bloqueio de dia inteiro remove todos os slots", () => {
    const inicioDia = horarioBrasilia(SEGUNDA_ISO, "00:00");
    const fimDia = new Date(inicioDia.getTime() + 24 * 60 * 60_000);

    const slots = gerarSlotsDisponiveis({
      dataISO: SEGUNDA_ISO,
      diaSemana: 1,
      duracaoServicoMin: 30,
      horariosTrabalho: [janelaAutomatica()],
      ocupados: [{ inicio: inicioDia, fim: fimDia }],
    });

    expect(slots).toHaveLength(0);
  });

  it("ignora horários que já passaram quando `agora` é informado", () => {
    const slots = gerarSlotsDisponiveis({
      dataISO: SEGUNDA_ISO,
      diaSemana: 1,
      duracaoServicoMin: 30,
      horariosTrabalho: [janelaAutomatica({ hora_inicio: "09:00", hora_fim: "10:00" })],
      ocupados: [],
      agora: horario("09:20"),
    });

    expect(slots).toEqual([horario("09:30")]);
  });

  it("pula a pausa (ex.: almoço) no modo automático", () => {
    const slots = gerarSlotsDisponiveis({
      dataISO: SEGUNDA_ISO,
      diaSemana: 1,
      duracaoServicoMin: 60,
      horariosTrabalho: [
        janelaAutomatica({
          hora_inicio: "09:00",
          hora_fim: "15:00",
          intervalo_min: 60,
          pausa_inicio: "12:00",
          pausa_fim: "13:00",
        }),
      ],
      ocupados: [],
    });

    expect(slots).toEqual([
      horario("09:00"),
      horario("10:00"),
      horario("11:00"),
      horario("13:00"),
      horario("14:00"),
    ]);
  });

  it("modo manual usa exatamente os horários listados, sem gerar nada", () => {
    const slots = gerarSlotsDisponiveis({
      dataISO: SEGUNDA_ISO,
      diaSemana: 1,
      duracaoServicoMin: 30,
      horariosTrabalho: [
        janelaAutomatica({
          modo: "manual",
          hora_inicio: null,
          hora_fim: null,
          horarios_manuais: ["09:00", "10:30", "14:00"],
        }),
      ],
      ocupados: [],
    });

    expect(slots).toEqual([horario("09:00"), horario("10:30"), horario("14:00")]);
  });

  it("modo manual também respeita conflito com horário ocupado", () => {
    const slots = gerarSlotsDisponiveis({
      dataISO: SEGUNDA_ISO,
      diaSemana: 1,
      duracaoServicoMin: 30,
      horariosTrabalho: [
        janelaAutomatica({
          modo: "manual",
          hora_inicio: null,
          hora_fim: null,
          horarios_manuais: ["09:00", "10:30"],
        }),
      ],
      ocupados: [{ inicio: horario("09:00"), fim: horario("09:30") }],
    });

    expect(slots).toEqual([horario("10:30")]);
  });
});
