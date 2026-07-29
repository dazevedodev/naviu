type Plano = {
  id: "solo" | "barbearia";
  nome: string;
  preco: string;
  destaque?: boolean;
  recursos: string[];
  checkoutUrl?: string;
};

const PLANOS: Plano[] = [
  {
    id: "solo",
    nome: "Solo",
    preco: "R$ 24,90/mês",
    recursos: [
      "1 barbeiro",
      "Link público de agendamento (ex: naviu.app.br/b/sua-barbearia)",
      "Confirmação e lembrete automáticos por e-mail",
      "Cliente adiciona o horário na agenda dele com 1 toque",
    ],
    checkoutUrl: process.env.NEXT_PUBLIC_KIWIFY_CHECKOUT_URL_SOLO,
  },
  {
    id: "barbearia",
    nome: "Barbearia",
    preco: "R$ 69,90/mês",
    destaque: true,
    recursos: [
      "Até 10 barbeiros",
      "Tudo do plano Solo",
      "Link de agendamento individual por barbeiro",
      "Agenda do dia organizada por barbeiro",
    ],
    checkoutUrl: process.env.NEXT_PUBLIC_KIWIFY_CHECKOUT_URL_BARBEARIA,
  },
];

export function PlanosCards() {
  return (
    <div className="grid w-full gap-6 sm:grid-cols-2">
      {PLANOS.map((plano) => (
        <div
          key={plano.id}
          className={`flex flex-col rounded-2xl border p-6 text-left ${
            plano.destaque
              ? "border-zinc-950 bg-white shadow-sm dark:border-zinc-50 dark:bg-zinc-950"
              : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
          }`}
        >
          {plano.destaque && (
            <span className="mb-3 w-fit rounded-full bg-zinc-950 px-3 py-1 text-xs font-medium text-zinc-50 dark:bg-zinc-50 dark:text-zinc-950">
              Mais popular
            </span>
          )}
          <h3 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            {plano.nome}
          </h3>
          <p className="mb-4 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            {plano.preco}
          </p>
          <ul className="mb-6 flex flex-1 flex-col gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            {plano.recursos.map((r) => (
              <li key={r} className="flex gap-2">
                <span className="text-zinc-950 dark:text-zinc-50">✓</span>
                {r}
              </li>
            ))}
          </ul>
          {plano.checkoutUrl ? (
            <a
              href={plano.checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex h-11 items-center justify-center rounded-full px-6 text-sm font-medium transition-colors ${
                plano.destaque
                  ? "bg-zinc-950 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
                  : "border border-zinc-300 text-zinc-950 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
              }`}
            >
              Assinar {plano.nome}
            </a>
          ) : (
            <p className="text-center text-xs text-zinc-400">Checkout em breve</p>
          )}
        </div>
      ))}
    </div>
  );
}
