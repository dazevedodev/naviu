"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { criarConta } from "./actions";

export default function CadastroPage() {
  const router = useRouter();
  const [nomeBarbearia, setNomeBarbearia] = useState("");
  const [nomeResponsavel, setNomeResponsavel] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.set("nome_barbearia", nomeBarbearia);
    formData.set("nome_responsavel", nomeResponsavel);
    formData.set("email", email);
    formData.set("senha", senha);

    const result = await criarConta(formData);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: erroLogin } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (erroLogin) {
      setError("Conta criada! Faça login para continuar.");
      router.push("/login");
      return;
    }

    router.replace("/admin");
    router.refresh();
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-12 dark:bg-black">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      >
        <h1 className="mb-1 text-xl font-semibold text-zinc-950 dark:text-zinc-50">
          Criar conta grátis
        </h1>
        <p className="mb-6 text-sm text-zinc-500">
          14 dias de teste, sem cartão de crédito.
        </p>

        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Nome da barbearia
        </label>
        <input
          required
          value={nomeBarbearia}
          onChange={(e) => setNomeBarbearia(e.target.value)}
          className="mb-4 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
        />

        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Seu nome
        </label>
        <input
          required
          value={nomeResponsavel}
          onChange={(e) => setNomeResponsavel(e.target.value)}
          className="mb-4 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
        />

        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          E-mail
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
        />

        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Senha
        </label>
        <input
          type="password"
          required
          minLength={6}
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="mb-6 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
        />

        {error && (
          <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-zinc-950 py-2.5 text-sm font-medium text-zinc-50 transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          {loading ? "Criando..." : "Criar conta"}
        </button>

        <p className="mt-4 text-center text-sm text-zinc-500">
          Já tem conta?{" "}
          <Link href="/login" className="font-medium text-zinc-950 underline dark:text-zinc-50">
            Entrar
          </Link>
        </p>
      </form>
    </div>
  );
}
