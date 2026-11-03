"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [linkEnviado, setLinkEnviado] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("E-mail ou senha inválidos.");
      setLoading(false);
      return;
    }

    router.replace("/admin");
    router.refresh();
  }

  async function handleEsqueciSenha() {
    if (!email) {
      setError("Digite seu e-mail acima primeiro.");
      return;
    }
    setError(null);
    setLinkEnviado(false);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });

    // O Supabase não erra por "e-mail não existe" (evita confirmar pra quem
    // está tentando adivinhar contas) — um erro aqui é falha real de envio
    // (SMTP fora do ar, limite de taxa, etc.), por isso é seguro mostrar.
    if (error) {
      setError("Não foi possível enviar o e-mail agora. Tente novamente em instantes.");
      return;
    }

    setLinkEnviado(true);
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 dark:bg-black">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      >
        <Link
          href="/"
          className="mb-4 inline-block text-sm text-zinc-500 hover:underline"
        >
          ← Voltar
        </Link>

        <Image
          src="/marca/naviu-logo.svg"
          alt="Naviu"
          width={114}
          height={32}
          className="mb-6"
          unoptimized
        />
        <h1 className="mb-6 text-xl font-semibold text-zinc-950 dark:text-zinc-50">
          Entrar no Naviu
        </h1>

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
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
        />

        <button
          type="button"
          onClick={handleEsqueciSenha}
          className="mb-4 text-xs text-zinc-500 hover:underline"
        >
          Esqueci minha senha
        </button>

        {linkEnviado && (
          <p className="mb-4 text-sm text-green-700 dark:text-green-400">
            Te mandamos um e-mail com o link pra criar uma senha nova.
          </p>
        )}
        {error && (
          <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-[#C1272D] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#A51F25] disabled:opacity-50"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
