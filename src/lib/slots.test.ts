import { describe, expect, it } from "vitest";
import { gerarSlotsDisponiveis } from "./slots";

// Segunda-feira, 2026-08-03 (dia_semana = 1)
const SEGUNDA = new Date(2026, 7, 3);

function horario(hora: string) {
  const [h, m] = hora.split(":").map(Number);
  const d = new Date(SEGUNDA);
  d.setHours(h, m, 0, 0);
  return d;
}

describe("gerarSlotsDisponiveis", () => {
  it("gera slots a cada 15min dentro da janela de trabalho", () => {
    const slots = gerarSlotsDisponiveis({
      data: SEGUNDA,
      diaSemana: 1,
      duracaoServicoMin: 30,
      horariosTrabalho: [{ dia_semana: 1, hora_inicio: "09:00", hora_fim: "12:00" }],
      ocupados: [],
    });

    expect(slots).toHaveLength(11); // 09:00 até 11:30, de 15 em 15
    expect(slots[0]).toEqual(horario("09:00"));
    expect(slots.at(-1)).toEqual(horario("11:30"));
  });

  it("não inclui horário só para o dia da semana correspondente", () => {
    const slots = gerarSlotsDisponiveis({
      data: SEGUNDA,
      diaSemana: 1,
      duracaoServicoMin: 30,
      horariosTrabalho: [{ dia_semana: 2, hora_inicio: "09:00", hora_fim: "12:00" }],
      ocupados: [],
    });

    expect(slots).toHaveLength(0);
  });

  it("remove slots que colidem com um intervalo ocupado", () => {
    const slots = gerarSlotsDisponiveis({
      data: SEGUNDA,
      diaSemana: 1,
      duracaoServicoMin: 30,
      horariosTrabalho: [{ dia_semana: 1, hora_inicio: "09:00", hora_fim: "10:00" }],
      ocupados: [{ inicio: horario("09:15"), fim: horario("09:45") }],
    });

    // 09:00 (termina 09:30, colide com 09:15-09:45) fica de fora
    // 09:15 e 09:30 colidem diretamente
    // 09:45 é o primeiro livre de novo (09:45-10:15 não cabe na janela até 10:00)
    expect(slots).toEqual([]);
  });

  it("bloqueio de dia inteiro remove todos os slots", () => {
    const inicioDia = new Date(SEGUNDA);
    const fimDia = new Date(SEGUNDA);
    fimDia.setDate(fimDia.getDate() + 1);

    const slots = gerarSlotsDisponiveis({
      data: SEGUNDA,
      diaSemana: 1,
      duracaoServicoMin: 30,
      horariosTrabalho: [{ dia_semana: 1, hora_inicio: "09:00", hora_fim: "12:00" }],
      ocupados: [{ inicio: inicioDia, fim: fimDia }],
    });

    expect(slots).toHaveLength(0);
  });

  it("ignora horários que já passaram quando `agora` é informado", () => {
    const slots = gerarSlotsDisponiveis({
      data: SEGUNDA,
      diaSemana: 1,
      duracaoServicoMin: 30,
      horariosTrabalho: [{ dia_semana: 1, hora_inicio: "09:00", hora_fim: "10:00" }],
      ocupados: [],
      agora: horario("09:20"),
    });

    expect(slots).toEqual([horario("09:30")]);
  });

  it("soma janelas de múltiplos intervalos no mesmo dia", () => {
    const slots = gerarSlotsDisponiveis({
      data: SEGUNDA,
      diaSemana: 1,
      duracaoServicoMin: 60,
      horariosTrabalho: [
        { dia_semana: 1, hora_inicio: "09:00", hora_fim: "10:00" },
        { dia_semana: 1, hora_inicio: "14:00", hora_fim: "15:00" },
      ],
      ocupados: [],
    });

    expect(slots).toEqual([horario("09:00"), horario("14:00")]);
  });
});
