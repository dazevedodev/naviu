import Image from "next/image";
import Link from "next/link";
import { getBarbeariaAtual } from "@/lib/current-barbearia";
import { acessoAte, acessoLiberado, diasRestantes } from "@/lib/assinatura";
import type { Barbearia } from "@/lib/types";
import { TelaAssinatura } from "./assinatura/tela-assinatura";
import { LogoutButton } from "./logout-button";
import { Icone } from "./menu-admin";
import { NavAbas, NavLateral } from "./nav-admin";

// O WhatsApp bloqueia ser embutido em iframe de outro site (CSP
// frame-ancestors só permite domínios deles) — o mais perto que dá de
// "abrir o zap por aqui" é um link que abre o WhatsApp Web numa aba nova.
// O admin escaneia o QR code uma vez e fica logado nessa aba.
const WHATSAPP_WEB_URL = "https://web.whatsapp.com";

// Faixa no topo quando falta pouco pro teste acabar ou há fatura pendente.
function AvisoAssinatura({ barbearia }: { barbearia: Barbearia }) {
  let texto: string | null = null;
  if (barbearia.assinatura_status === "trial") {
    const dias = diasRestantes(barbearia.assinatura_valido_ate);
    if (dias <= 3) {
      texto = dias <= 1 ? "Seu teste grátis acaba hoje." : `Seu teste grátis acaba em ${dias} dias.`;
    }
  } else if (barbearia.assinatura_status === "atrasada") {
    const dias = diasRestantes(acessoAte(barbearia));
    texto = `Mensalidade pendente: pague em até ${dias === 1 ? "1 dia" : `${dias} dias`} pra não pausar a agenda.`;
  }
  if (!texto) return null;

  return (
    <Link
      href="/admin/assinatura"
      className="block bg-rosado px-6 py-2 text-center text-sm font-medium text-navalha-escuro hover:bg-rosado/80"
    >
      {texto} <span className="underline">Ver assinatura</span>
    </Link>
  );
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const barbearia = await getBarbeariaAtual();
  // Sem acesso, qualquer página do admin mostra a tela de assinatura.
  const liberado = acessoLiberado(barbearia);

  return (
    <div className="flex flex-1 bg-[#F6F1F1] font-sans text-tinta">
      {/* Lateral escura, só no computador */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col bg-tinta px-4 py-6 text-white lg:flex">
        <Link href="/admin" className="mb-8 flex items-center gap-3 px-2">
          <Image src="/marca/naviu-simbolo-branco.svg" alt="" width={34} height={34} unoptimized />
          <span className="min-w-0">
            <span className="block truncate font-display text-sm font-semibold">{barbearia.nome}</span>
            <span className="block text-xs text-white/50">Painel Naviu</span>
          </span>
        </Link>

        <div className="flex-1 overflow-y-auto">
          <NavLateral />
        </div>

        <div className="mt-4 flex flex-col gap-1 border-t border-white/10 pt-4">
          <a
            href={`/${barbearia.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white"
          >
            <Icone nome="compartilhar" />
            Ver minha página
          </a>
          <a
            href={WHATSAPP_WEB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white"
          >
            <Icone nome="whatsapp" />
            WhatsApp Web
          </a>
          <LogoutButton className="rounded-xl px-3 py-2 text-left text-sm text-white/50 hover:bg-white/10 hover:text-white" />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {liberado && <AvisoAssinatura barbearia={barbearia} />}

        {/* Topo, só no celular */}
        <header className="flex items-center gap-3 bg-tinta px-4 py-3 text-white lg:hidden">
          <Image src="/marca/naviu-simbolo-branco.svg" alt="" width={28} height={28} unoptimized />
          <p className="min-w-0 flex-1 truncate font-display text-sm font-semibold">{barbearia.nome}</p>
          <a
            href={WHATSAPP_WEB_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Abrir WhatsApp Web"
            className="rounded-full p-2 text-white/80 hover:bg-white/10"
          >
            <Icone nome="whatsapp" />
          </a>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 lg:px-10 lg:pb-12 lg:pt-10">
          {liberado ? children : <TelaAssinatura barbearia={barbearia} />}
        </main>
      </div>

      <NavAbas />
    </div>
  );
}
