"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Escaneadores de segurança de e-mail (Gmail, gateways corporativos) visitam
// automaticamente os links dentro do e-mail antes da pessoa clicar — se o
// link consumisse o token sozinho ao carregar (como o "?code=..."/
// "#access_token=..." do Supabase fazem), o token já vinha gasto quando a
// pessoa clicava de verdade, e o link "expirava" quase na hora. Por isso o
// e-mail agora manda "?token_hash=...&type=..." (ver template em
// supabase/email-templates/reset-password.html) e só consumimos o token com
// verifyOtp() numa ação explícita de clique, nunca automaticamente no
// carregamento da página.
function lerParametrosUrl() {
  if (typeof window === "undefined") {
    return { erro: false, tokenHash: null, code: null, accessToken: null, refreshToken: null };
  }
  const queryParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

  return {
    erro: Boolean(queryParams.get("error") || hashParams.get("error")),
    tokenHash: queryParams.get("token_hash"),
    // Formatos antigos (de e-mails já enviados antes dessa correção) — esses
    // sim são consumidos ao carregar, não tem como evitar retroativamente.
    code: queryParams.get("code"),
    accessToken: hashParams.get("access_token"),
    refreshToken: hashParams.get("refresh_token"),
  };
}

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [{ erro, tokenHash, code, accessToken, refreshToken }] = useState(lerParametrosUrl);
  const [pronto, setPronto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkInvalido, setLinkInvalido] = useState(erro);
  const [salvando, setSalvando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    // Erro já refletido no estado inicial, e o formato "token_hash" só
    // avança quando a pessoa clica em "Confirmar" — nada a fazer aqui.
    if (erro || tokenHash) return;

    const supabase = createClient();

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

    // Nenhum formato reconhecido na URL — só resta checar se já existe uma
    // sessão válida nesse navegador (ex.: usuário voltou pra essa aba).
    supabase.auth.getSession().then(({ data }) => {
      setPronto(Boolean(data.session));
    });
  }, [erro, tokenHash, code, accessToken, refreshToken]);

  async function handleConfirmarLink() {
    if (!tokenHash) return;
    setConfirmando(true);
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "recovery",
    });
    setConfirmando(false);

    if (error) {
      setLinkInvalido(true);
      return;
    }
    setPronto(true);
  }

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
        ) : tokenHash && !pronto ? (
          <div>
            <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
              Clique no botão abaixo pra confirmar e definir sua nova senha.
            </p>
            <button
              onClick={handleConfirmarLink}
              disabled={confirmando}
              className="w-full rounded-full bg-zinc-950 py-2.5 text-sm font-medium text-zinc-50 transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              {confirmando ? "Confirmando..." : "Confirmar"}
            </button>
          </div>
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
