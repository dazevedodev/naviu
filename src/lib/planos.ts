// Planos do Naviu: fonte única pra landing, /precos, tela de assinatura e
// cobrança no Asaas.

export type PlanoId = "solo" | "barbearia";

export type Plano = {
  id: PlanoId;
  nome: string;
  valor: number; // R$ por mês
  limiteBarbeiros: number;
  destaque?: boolean;
  recursos: string[];
};

export const DIAS_TESTE = 14;

export const PLANOS: Plano[] = [
  {
    id: "solo",
    nome: "Solo",
    valor: 24.9,
    limiteBarbeiros: 1,
    recursos: [
      "1 barbeiro",
      "Link público de agendamento (ex: naviu.app.br/sua-barbearia)",
      "Confirmação e lembrete automáticos por e-mail",
      "Cliente adiciona o horário na agenda dele com 1 toque",
    ],
  },
  {
    id: "barbearia",
    nome: "Barbearia",
    valor: 69.9,
    limiteBarbeiros: 10,
    destaque: true,
    recursos: [
      "Até 10 barbeiros",
      "Tudo do plano Solo",
      "Link de agendamento individual por barbeiro",
      "Agenda do dia organizada por barbeiro",
    ],
  },
];

export function buscarPlano(id: string): Plano | undefined {
  return PLANOS.find((p) => p.id === id);
}

export function formatarReais(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
