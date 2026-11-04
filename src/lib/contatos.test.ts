import { describe, expect, it } from "vitest";
import { lerUsuarioRede } from "./contatos";

describe("lerUsuarioRede", () => {
  it("tira @, link e barra do fim", () => {
    expect(lerUsuarioRede("@barbearia.do_ze")).toBe("barbearia.do_ze");
    expect(lerUsuarioRede("https://www.instagram.com/barbeariadoze/")).toBe("barbeariadoze");
    expect(lerUsuarioRede("tiktok.com/@barbeariadoze?lang=pt")).toBe("barbeariadoze");
  });

  it("recusa o que não é nome de usuário", () => {
    expect(lerUsuarioRede("barbearia do zé")).toBeNull();
    expect(lerUsuarioRede("")).toBeNull();
  });
});
