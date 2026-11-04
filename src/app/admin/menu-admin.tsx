// Itens do menu e ícones do painel. Fica fora de nav-admin.tsx (que roda no
// navegador) para que páginas do servidor, como "Mais", também possam usar a lista.

export type Item = { href: string; label: string; icone: keyof typeof ICONES };

export const PRINCIPAIS: Item[] = [
  { href: "/admin", label: "Início", icone: "inicio" },
  { href: "/admin/agenda", label: "Agenda", icone: "agenda" },
  { href: "/admin/clientes", label: "Clientes", icone: "clientes" },
  { href: "/admin/financeiro", label: "Financeiro", icone: "financeiro" },
];

export const SECUNDARIOS: Item[] = [
  { href: "/admin/barbeiros", label: "Barbeiros", icone: "barbeiros" },
  { href: "/admin/servicos", label: "Serviços", icone: "servicos" },
  { href: "/admin/compartilhar", label: "Compartilhar", icone: "compartilhar" },
  { href: "/admin/aparencia", label: "Aparência", icone: "aparencia" },
  { href: "/admin/configuracoes", label: "Configurações", icone: "config" },
  { href: "/admin/assinatura", label: "Assinatura", icone: "assinatura" },
];

const ICONES = {
  inicio: "M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-8Z",
  agenda: "M5 6h14v14H5zM5 10h14M9 3v4M15 3v4",
  clientes: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14.5c1.8.8 3 2.9 3 5.5",
  financeiro: "M4 19V9M10 19V5M16 19v-7M3 19h18",
  barbeiros: "M6 3 18 15M18 3 6 15M5.5 19.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM18.5 19.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  servicos: "M5 6h14M5 12h14M5 18h9",
  compartilhar: "M8 12h8M14 8l4 4-4 4M6 5v14",
  aparencia: "M4 5h16v14H4zM4 15l5-5 4 4 2-2 5 5",
  config: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1",
  assinatura: "M3 7h18v11H3zM3 11h18",
  mais: "M5 12h.01M12 12h.01M19 12h.01",
  whatsapp: "M4 20l1.4-4A8 8 0 1 1 8 19Z",
};

export function Icone({ nome, className }: { nome: keyof typeof ICONES; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={nome === "mais" ? 3.2 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className ?? "h-5 w-5"}
    >
      <path d={ICONES[nome]} />
    </svg>
  );
}
