"use client";

import { useState, useTransition } from "react";
import type { Barbearia } from "@/lib/types";
import { salvarDadosBarbearia } from "./actions";

export function DadosBarbeariaForm({ barbearia }: { barbearia: Barbearia }) {
  const [error, setError] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          const result = await salvarDadosBarbearia(formData);
          setError(result.error);
          setSalvo(!result.error);
        })
      }
      className="max-w-md rounded-3xl bg-white p-6"
    >
      <h2 className="mb-4 text-sm font-semibold text-tinta">
        Dados da barbearia
      </h2>

      <label className="mb-1 block text-sm font-medium text-tinta">
        Nome
      </label>
      <input
        name="nome"
        required
        defaultValue={barbearia.nome}
        className="mb-4 w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-navalha"
      />

      <label className="mb-1 block text-sm font-medium text-tinta">
        Link da sua página
      </label>
      <div className="mb-1 flex items-center rounded-xl border border-black/10 text-sm focus-within:border-navalha">
        <span className="pl-3 text-white0">naviu.app.br/</span>
        <input
          name="slug"
          required
          defaultValue={barbearia.slug}
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          minLength={3}
          maxLength={40}
          className="min-w-0 flex-1 rounded-r-lg bg-transparent py-2 pr-3 outline-none"
        />
      </div>
      <p className="mb-4 text-xs text-white0">
        Letras sem acento, números e hífen. Se mudar, o link antigo para de funcionar:
        atualize a bio do Instagram.
      </p>

      <label className="mb-1 block text-sm font-medium text-tinta">
        Endereço
      </label>
      <input
        name="endereco"
        placeholder="Rua, número, bairro, cidade"
        defaultValue={barbearia.endereco ?? ""}
        className="mb-4 w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-navalha"
      />

      <label className="mb-1 block text-sm font-medium text-tinta">
        WhatsApp da barbearia
      </label>
      <input
        name="telefone_whatsapp"
        placeholder="(11) 99999-9999"
        defaultValue={barbearia.telefone_whatsapp ?? ""}
        className="mb-4 w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-navalha"
      />

      <p className="mb-3 mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-aco">
        Aparecem na sua página
      </p>
      {[
        { nome: "instagram", rotulo: "Instagram", valor: barbearia.instagram, exemplo: "@suabarbearia" },
        { nome: "tiktok", rotulo: "TikTok", valor: barbearia.tiktok, exemplo: "@suabarbearia" },
        { nome: "email_contato", rotulo: "E-mail de contato", valor: barbearia.email_contato, exemplo: "contato@suabarbearia.com" },
      ].map((c) => (
        <label key={c.nome} className="mb-4 block text-sm font-medium text-tinta">
          {c.rotulo}
          <input
            name={c.nome}
            type={c.nome === "email_contato" ? "email" : "text"}
            placeholder={c.exemplo}
            defaultValue={c.valor ? (c.nome === "email_contato" ? c.valor : `@${c.valor}`) : ""}
            className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm font-normal outline-none focus:border-navalha"
          />
        </label>
      ))}

      {error && <p className="mb-4 text-sm text-navalha">{error}</p>}
      {salvo && !error && (
        <p className="mb-4 text-sm text-emerald-700">Salvo!</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-full bg-navalha py-2.5 text-sm font-medium text-white hover:bg-navalha-escuro disabled:opacity-50"
      >
        {isPending ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}
