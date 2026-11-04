import { describe, expect, it } from "vitest";
import { formatarAniversario, lerAniversario } from "./aniversario";

describe("lerAniversario", () => {
  it("lê dia e mês em vários formatos", () => {
    expect(lerAniversario("25/12")).toEqual({ dia: 25, mes: 12 });
    expect(lerAniversario("5-3")).toEqual({ dia: 5, mes: 3 });
    expect(lerAniversario("0107")).toEqual({ dia: 1, mes: 7 });
    expect(lerAniversario("29/02")).toEqual({ dia: 29, mes: 2 });
    expect(lerAniversario("10 06 2007")).toEqual({ dia: 10, mes: 6 });
    expect(lerAniversario("10/06/07")).toEqual({ dia: 10, mes: 6 });
    expect(lerAniversario("25 12")).toEqual({ dia: 25, mes: 12 });
  });

  it("recusa data que não existe", () => {
    expect(lerAniversario("31/04")).toBeNull();
    expect(lerAniversario("10/13")).toBeNull();
    expect(lerAniversario("abc")).toBeNull();
    expect(lerAniversario("")).toBeNull();
  });

  it("formata com zero à esquerda", () => {
    expect(formatarAniversario(5, 3)).toBe("05/03");
  });
});

describe("diasAteAniversario", () => {
  it("conta os dias até o próximo aniversário, virando o ano", async () => {
    const { diasAteAniversario } = await import("./aniversario-proximo");
    expect(diasAteAniversario("2026-11-04", 4, 11)).toBe(0);
    expect(diasAteAniversario("2026-11-04", 10, 11)).toBe(6);
    expect(diasAteAniversario("2026-11-04", 1, 1)).toBe(58);
    expect(diasAteAniversario("2026-11-04", 3, 11)).toBe(364);
    expect(diasAteAniversario("2027-02-27", 29, 2)).toBe(1);
  });
});
