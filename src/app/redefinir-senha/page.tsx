"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [pronto, setPronto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkInvalido, setLinkInvalido] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    // O link do e-mail de recuperação pode vir em dois formatos, dependendo
    // de como a solicitação foi feita: "?code=..." (fluxo PKCE, usado pelo
    // client do navegador) ou "#access_token=...&refresh_token=..." (fluxo
    // antigo, usado por chamadas diretas à API). Processar os dois
    // manualmente em vez de confiar em detecção automática do supabase-js,
    // que não cobria o segundo formato e deixava a tela presa pra sempre em
    // "Confirmando o link...".
    const queryParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

    if (queryParams.get("error") || hashParams.get("error")) {
      setLinkInvalido(true);
      return;
    }

    const supabase = createClient();
    const code = queryParams.get("code");
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");

    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) setLinkInvalido(true);
        else setPronto(true);
      });
      return;
    }

    if (accessToken && refreshToken) {
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => {
          if (error) setLinkInvalido(true);
          else setPronto(true);
        });
      return;
    }

    // Nenhum dos dois formatos na URL — só resta checar se já existe uma
    // sessão válida nesse navegador (ex.: usuário voltou pra essa aba).
    supabase.auth.getSession().then(({ data }) => {
      setPronto(Boolean(data.session));
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (senha.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (senha !== confirmarSenha) {
      setError("As senhas não são iguais.");
      return;
    }

    setSalvando(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: senha });
    setSalvando(false);

    if (error) {
      setError("Não foi possível salvar a senha. Tente pedir o link de novo.");
      return;
    }

    router.replace("/admin");
    router.refresh();
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 dark:bg-black">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="mb-6 text-xl font-semibold text-zinc-950 dark:text-zinc-50">
          Defina sua senha
        </h1>

        {linkInvalido ? (
          <p className="text-sm text-red-600 dark:text-red-400">
            Esse link expirou ou já foi usado. Peça um novo em{" "}
            <a href="/login" className="underline">Entrar</a> → &ldquo;Esqueci
            minha senha&rdquo; e clique nele assim que chegar.
          </p>
        ) : !pronto ? (
          <p className="text-sm text-zinc-500">
            Confirmando o link... se essa mensagem não sumir, peça um link novo
            em <a href="/login" className="underline">Entrar</a> → &ldquo;Esqueci
            minha senha&rdquo;.
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Nova senha
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="mb-4 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
            />

            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Confirmar senha
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              className="mb-6 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
            />

            {error && (
              <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={salvando}
              className="w-full rounded-full bg-zinc-950 py-2.5 text-sm font-medium text-zinc-50 transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              {salvando ? "Salvando..." : "Salvar senha"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
