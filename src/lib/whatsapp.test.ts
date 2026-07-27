import { describe, expect, it } from "vitest";
import {
  formatarTelefoneWhatsApp,
  montarLinkWhatsApp,
  preencherTemplateMensagem,
} from "./whatsapp";

describe("formatarTelefoneWhatsApp", () => {
  it("adiciona o 55 quando falta", () => {
    expect(formatarTelefoneWhatsApp("11988887777")).toBe("5511988887777");
  });

  it("mantém quando já vem com 55", () => {
    expect(formatarTelefoneWhatsApp("5511988887777")).toBe("5511988887777");
  });

  it("remove formatação (parênteses, traço, espaço)", () => {
    expect(formatarTelefoneWhatsApp("(11) 98888-7777")).toBe("5511988887777");
  });
});

describe("preencherTemplateMensagem", () => {
  it("substitui as variáveis presentes", () => {
    expect(
      preencherTemplateMensagem("Olá {{cliente}}, {{barbearia}} te espera às {{hora}}", {
        cliente: "Maria",
        barbearia: "Barbearia do Zé",
        hora: "10:00",
      }),
    ).toBe("Olá Maria, Barbearia do Zé te espera às 10:00");
  });

  it("mantém o placeholder quando a variável não foi passada", () => {
    expect(preencherTemplateMensagem("Olá {{cliente}}", {})).toBe("Olá {{cliente}}");
  });
});

describe("montarLinkWhatsApp", () => {
  it("monta o link wa.me com a mensagem codificada", () => {
    const link = montarLinkWhatsApp("11988887777", "Olá Maria!");
    expect(link).toBe("https://wa.me/5511988887777?text=Ol%C3%A1%20Maria!");
  });
});
