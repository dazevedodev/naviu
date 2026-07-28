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
    // O Supabase reporta link expirado/já usado como ?error=... (ou
    // #error=...) na própria URL de redirecionamento — sem checar isso, a
    // tela ficava presa pra sempre em "Confirmando o link..." nesse caso.
    const params = new URLSearchParams(
      window.location.search || window.location.hash.replace(/^#/, ""),
    );
    if (params.get("error")) {
      setLinkInvalido(true);
      return;
    }

    const supabase = createClient();

    // createBrowserClient (@supabase/ssr) usa o fluxo PKCE por padrão — o
    // link do e-mail vem com "?code=..." em vez do token na hash da URL, e
    // precisa trocar esse code por sessão explicitamente. Sem isso, o
    // onAuthStateChange/getSession abaixo nunca dispara e a tela fica presa
    // pra sempre em "Confirmando o link...", mesmo com um link válido.
    const code = params.get("code");
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) setLinkInvalido(true);
        else setPronto(true);
      });
      return;
    }

    // Fallback pro formato antigo (token na hash), caso o Supabase alguma
    // hora mande o link nesse formato.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setPronto(true);
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setPronto(true);
    });

    return () => subscription.unsubscribe();
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
