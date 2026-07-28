export type Barbearia = {
  id: string;
  nome: string;
  slug: string;
  endereco: string | null;
  telefone_whatsapp: string | null;
  logo_url: string | null;
  plano: "solo" | "barbearia";
  limite_barbeiros: number;
  sinal_ativo: boolean;
  sinal_tipo: "fixo" | "percentual";
  sinal_valor: number;
  sinal_tempo_expiracao_min: number;
  sinal_addon_status: "inativo" | "ativo";
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
};

export type HorarioTrabalho = {
  id: string;
  barbeiro_id: string;
  dia_semana: number; // 0=domingo ... 6=sábado
  hora_inicio: string; // "HH:MM:SS"
  hora_fim: string;
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
  criado_em: string;
};

export type AgendamentoStatus =
  | "pendente"
  | "confirmado"
  | "cancelado"
  | "concluido"
  | "aguardando_sinal";

export type FormaPagamento = "dinheiro" | "cartao" | "pix";

export type Agendamento = {
  id: string;
  barbearia_id: string;
  barbeiro_id: string;
  servico_id: string;
  cliente_id: string;
  data_hora: string; // ISO
  status: AgendamentoStatus;
  sinal_pago: boolean;
  sinal_valor: number | null;
  forma_pagamento: FormaPagamento | null;
  lembrete_enviado: boolean;
  cancelamento_token: string;
  criado_em: string;
};
