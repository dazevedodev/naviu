import Link from "next/link";
import { getBarbeariaAtual } from "@/lib/current-barbearia";
import { LogoutButton } from "./logout-button";

const NAV = [
  { href: "/admin", label: "Agenda" },
  { href: "/admin/barbeiros", label: "Barbeiros" },
  { href: "/admin/servicos", label: "Serviços" },
  { href: "/admin/compartilhar", label: "Compartilhar" },
  { href: "/admin/configuracoes", label: "Configurações" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const barbearia = await getBarbeariaAtual();

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div>
          <p className="font-semibold text-zinc-950 dark:text-zinc-50">
            {barbearia.nome}
          </p>
          <p className="text-xs text-zinc-500">
            naviu.app.br/b/{barbearia.slug}
          </p>
        </div>
        <LogoutButton />
      </header>

      <div className="flex flex-1 flex-col sm:flex-row">
        <nav className="flex gap-1 overflow-x-auto border-b border-zinc-200 bg-white p-4 sm:w-48 sm:flex-col sm:border-b-0 sm:border-r dark:border-zinc-800 dark:bg-zinc-950">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <main className="min-w-0 flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
