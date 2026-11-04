import { createClient } from "@/lib/supabase/server";
import { getBarbeariaAtual } from "@/lib/current-barbearia";
import { LinkCompartilhavel } from "./link-compartilhavel";

export default async function CompartilharPage() {
  const barbearia = await getBarbeariaAtual();
  const supabase = await createClient();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://naviu.app.br";
  const linkGeral = `${appUrl}/${barbearia.slug}`;

  const { data: barbeiros } = await supabase
    .from("barbeiros")
    .select("id, nome")
    .eq("barbearia_id", barbearia.id)
    .eq("ativo", true)
    .order("nome");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-tinta">
        Compartilhar
      </h1>

      <div className="max-w-xl rounded-3xl bg-white p-6">
        <h2 className="mb-1 text-sm font-semibold text-tinta">
          Link da {barbearia.nome}
        </h2>
        <p className="mb-4 text-xs text-white0">
          Coloca no link da bio do Instagram, manda no WhatsApp, ou usa como
          se fosse o site da sua barbearia — a página já tem tudo pro
          cliente agendar sozinho.
        </p>
        <LinkCompartilhavel
          url={linkGeral}
          mensagemWhatsApp={`Agenda seu horário na ${barbearia.nome}: ${linkGeral}`}
        />
      </div>

      {barbearia.plano !== "solo" && (
        <div className="max-w-xl rounded-3xl bg-white p-6">
          <h2 className="mb-1 text-sm font-semibold text-tinta">
            Link por barbeiro
          </h2>
          <p className="mb-4 text-xs text-white0">
            Cada barbeiro pode divulgar o próprio link — o cliente cai
            direto na escolha do serviço e do horário, já com esse barbeiro
            selecionado.
          </p>

          <div className="flex flex-col gap-4">
            {barbeiros?.map((b) => {
              const link = `${linkGeral}/${b.id}`;
              return (
                <div key={b.id}>
                  <p className="mb-1 text-sm font-medium text-tinta">
                    {b.nome}
                  </p>
                  <LinkCompartilhavel
                    url={link}
                    mensagemWhatsApp={`Agenda seu horário comigo na ${barbearia.nome}: ${link}`}
                  />
                </div>
              );
            })}
            {(!barbeiros || barbeiros.length === 0) && (
              <p className="text-sm text-aco/70">Nenhum barbeiro ativo.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
