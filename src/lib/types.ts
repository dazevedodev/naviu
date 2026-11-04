export type Barbearia = {
  id: string;
  nome: string;
  slug: string;
  endereco: string | null;
  telefone_whatsapp: string | null;
  logo_url: string | null;
  capa_url: string | null;
  descricao: string | null;
  tema: { cor_primaria?: string; cor_fundo?: string };
  plano: "solo" | "barbearia";
  limite_barbeiros: number;
  horario_fechamento_padrao: string; // "HH:MM:SS"
  mostrar_fim_servico_cliente: boolean;
  assinatura_status: "trial" | "ativa" | "atrasada" | "cancelada";
  assinatura_valido_ate: string | null;
  criado_em: string;
};

export type Barbeiro = {
  id: string;
  barbearia_id: string;
  nome: string;
  foto_url: string | null;
  ativo: boolean;
  criado_em: string;
};

export type Servico = {
  id: string;
  barbearia_id: string;
  nome: string;
  duracao_min: number;
  preco: number;
  ativo: boolean;
  mostrar_duracao: boolean;
  legenda: string | null;
  observacao_interna: string | null;
  imagem_url: string | null;
  categoria: string | null;
};

export type HorarioTrabalho = {
  id: string;
  barbeiro_id: string;
  dia_semana: number; // 0=domingo ... 6=sábado
  modo: "automatico" | "manual";
  hora_inicio: string | null; // "HH:MM:SS" — só no modo automático
  hora_fim: string | null;
  intervalo_min: number; // passo entre horários, só no modo automático
  pausa_inicio: string | null;
  pausa_fim: string | null;
  horarios_manuais: string[]; // ["HH:MM", ...] — só no modo manual
};

export type Bloqueio = {
  id: string;
  barbeiro_id: string;
  data: string; // "YYYY-MM-DD"
  hora_inicio: string | null;
  hora_fim: string | null;
  motivo: string | null;
};

export type Cliente = {
  id: string;
  nome: string;
  telefone_whatsapp: string;
  email: string | null;
  aniversario_dia: number | null;
  aniversario_mes: number | null;
  criado_em: string;
};

export type AgendamentoStatus = "pendente" | "confirmado" | "cancelado" | "concluido" | "faltou";

export const NOME_STATUS: Record<string, string> = {
  pendente: "Pendente",
  confirmado: "Marcado",
  cancelado: "Cancelado",
  concluido: "Concluído",
  faltou: "Faltou",
};

export type FormaPagamento = "dinheiro" | "cartao" | "pix";

export type Agendamento = {
  id: string;
  barbearia_id: string;
  barbeiro_id: string;
  servico_id: string;
  cliente_id: string;
  data_hora: string; // ISO
  status: AgendamentoStatus;
  forma_pagamento: FormaPagamento | null;
  lembrete_enviado: boolean;
  cancelamento_token: string;
  cancelado_em: string | null;
  cancelado_por: "cliente" | "barbearia" | null;
  confirmacao_enviada: boolean;
  presenca_confirmada_em: string | null;
  criado_em: string;
};
