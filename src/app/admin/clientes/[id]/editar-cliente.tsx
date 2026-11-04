"use client";

import { useState, useTransition } from "react";
import { BOTAO, CAMPO } from "../../ui";
import { salvarCliente } from "../actions";

export function EditarCliente({
  id,
  nome,
  email,
  aniversario,
}: {
  id: string;
  nome: string;
  email: string;
  aniversario: string;
}) {
  const [pendente, iniciar] = useTransition();
  const [mensagem, setMensagem] = useState<{ erro: boolean; texto: string } | null>(null);

  return (
    <form
      action={(fd) =>
        iniciar(async () => {
          const r = await salvarCliente(id, fd);
          setMensagem(r.error ? { erro: true, texto: r.error } : { erro: false, texto: "Salvo." });
        })
      }
      className="flex flex-col gap-3"
    >
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Nome
        <input name="nome" defaultValue={nome} required className={CAMPO} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        E-mail
        <input name="email" type="email" defaultValue={email} placeholder="opcional" className={CAMPO} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Aniversário
        <input name="aniversario" defaultValue={aniversario} placeholder="dd/mm" maxLength={5} className={`${CAMPO} w-28`} />
      </label>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pendente} className={BOTAO}>
          {pendente ? "Salvando…" : "Salvar"}
        </button>
        {mensagem && (
          <p className={`text-sm ${mensagem.erro ? "text-navalha" : "text-emerald-700"}`}>{mensagem.texto}</p>
        )}
      </div>
    </form>
  );
}
