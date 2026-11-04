"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icone, PRINCIPAIS, SECUNDARIOS, type Item } from "./menu-admin";

// Menu do painel. No computador fica na lateral escura; no celular vira a
// barra de abas no rodapé, com os cinco lugares mais usados e "Mais".

function ativo(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

export function NavLateral() {
  const pathname = usePathname();
  const link = (item: Item) => {
    const atual = ativo(pathname, item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={atual ? "page" : undefined}
        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-white ${
          atual ? "bg-navalha text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
        }`}
      >
        <Icone nome={item.icone} />
        {item.label}
      </Link>
    );
  };
  return (
    <nav aria-label="Menu do painel" className="flex flex-col gap-1">
      {PRINCIPAIS.map(link)}
      <div className="my-3 h-px bg-white/10" />
      {SECUNDARIOS.map(link)}
    </nav>
  );
}

export function NavAbas() {
  const pathname = usePathname();
  const emMais = SECUNDARIOS.some((i) => pathname.startsWith(i.href)) || pathname === "/admin/mais";
  const abas: (Item & { atual: boolean })[] = [
    ...PRINCIPAIS.map((i) => ({ ...i, atual: ativo(pathname, i.href) })),
    { href: "/admin/mais", label: "Mais", icone: "mais", atual: emMais },
  ];
  return (
    <nav
      aria-label="Menu do painel"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-black/[0.07] bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {abas.map((a) => (
        <Link
          key={a.href}
          href={a.href}
          aria-current={a.atual ? "page" : undefined}
          className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
            a.atual ? "text-navalha" : "text-aco"
          }`}
        >
          <Icone nome={a.icone} className="h-6 w-6" />
          {a.label}
        </Link>
      ))}
    </nav>
  );
}
