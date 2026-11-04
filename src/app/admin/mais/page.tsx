import Link from "next/link";
import { getBarbeariaAtual } from "@/lib/current-barbearia";
import { LogoutButton } from "../logout-button";
import { Icone, SECUNDARIOS } from "../menu-admin";
import { Cabecalho } from "../ui";

// No celular, o que não cabe na barra de abas.
export default async function MaisPage() {
  const barbearia = await getBarbeariaAtual();

  return (
    <div>
      <Cabecalho titulo="Mais" descricao={`naviu.app.br/${barbearia.slug}`} />
      <ul className="overflow-hidden rounded-3xl bg-white">
        {SECUNDARIOS.map((i) => (
          <li key={i.href} className="border-b border-black/[0.06] last:border-0">
            <Link href={i.href} className="flex items-center gap-3 px-5 py-4 font-medium hover:bg-[#F6F1F1]">
              <span className="text-navalha">
                <Icone nome={i.icone} />
              </span>
              <span className="flex-1">{i.label}</span>
              <span aria-hidden className="text-aco">›</span>
            </Link>
          </li>
        ))}
        <li>
          <a
            href={`/${barbearia.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-5 py-4 font-medium hover:bg-[#F6F1F1]"
          >
            <span className="text-navalha">
              <Icone nome="compartilhar" />
            </span>
            <span className="flex-1">Ver minha página</span>
            <span aria-hidden className="text-aco">↗</span>
          </a>
        </li>
      </ul>
      <div className="mt-6 text-center">
        <LogoutButton />
      </div>
    </div>
  );
}
