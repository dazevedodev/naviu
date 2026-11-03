import { Resend } from "resend";
import { formatarDataBrasilia, formatarHoraBrasilia } from "@/lib/timezone";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.RESEND_FROM_EMAIL ?? "Naviu <agendamentos@naviu.app.br>";

type DetalhesAgendamento = {
  barbeariaNome: string;
  barbeariaEndereco: string | null;
  barbeiroNome: string;
  servicoNome: string;
  dataHora: Date;
  cancelamentoToken: string;
};

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://naviu.app.br";
}

// O envio de e-mail nunca deve derrubar o fluxo que o chamou (agendar,
// cancelar, etc.) — só loga o erro e segue.
async function enviar(destinatario: string, assunto: string, html: string) {
  if (!resend) {
    console.warn(`[email] RESEND_API_KEY não configurada, e-mail "${assunto}" não enviado.`);
    return;
  }
  const { error } = await resend.emails.send({
    from: FROM,
    to: destinatario,
    subject: assunto,
    html,
  });
  if (error) {
    console.error(`[email] falha enviando "${assunto}" para ${destinatario}:`, error);
  }
}

function blocoDetalhes(d: DetalhesAgendamento): string {
  return `
    <p><strong>${d.servicoNome}</strong> com ${d.barbeiroNome}</p>
    <p>${formatarDataBrasilia(d.dataHora)} às ${formatarHoraBrasilia(d.dataHora)}</p>
    ${d.barbeariaEndereco ? `<p>${d.barbeariaEndereco}</p>` : ""}
  `;
}

function blocoCancelamento(d: DetalhesAgendamento): string {
  const link = `${appUrl()}/cancelar/${d.cancelamentoToken}`;
  return `
    <p style="color:#666;font-size:13px;margin-top:24px">
      Não vai poder comparecer? Cancele pelo link abaixo:<br>
      <a href="${link}">${link}</a>
    </p>
  `;
}

export async function enviarEmailConfirmacaoCliente(
  clienteEmail: string,
  d: DetalhesAgendamento,
) {
  await enviar(
    clienteEmail,
    `Agendamento confirmado — ${d.barbeariaNome}`,
    `
      <h2>Seu agendamento foi confirmado!</h2>
      ${blocoDetalhes(d)}
      ${blocoCancelamento(d)}
    `,
  );
}

export async function enviarEmailLembreteCliente(clienteEmail: string, d: DetalhesAgendamento) {
  await enviar(
    clienteEmail,
    `Lembrete: seu horário é daqui a 1 hora — ${d.barbeariaNome}`,
    `
      <h2>Passando pra lembrar do seu horário!</h2>
      ${blocoDetalhes(d)}
      ${blocoCancelamento(d)}
    `,
  );
}

// Um dia antes: o cliente confirma que vai ou cancela e libera o horário.
// O link abre uma página com o botão (e-mail que abre link sozinho, como
// antivírus, não confirma nada por engano).
export async function enviarEmailPedidoConfirmacao(clienteEmail: string, d: DetalhesAgendamento) {
  const confirmar = `${appUrl()}/confirmar/${d.cancelamentoToken}`;
  await enviar(
    clienteEmail,
    `Você confirma seu horário? — ${d.barbeariaNome}`,
    `
      <h2>Seu horário está chegando</h2>
      ${blocoDetalhes(d)}
      <p style="margin:24px 0">
        <a href="${confirmar}" style="background:#16a34a;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:600">
          Confirmar presença
        </a>
      </p>
      ${blocoCancelamento(d)}
    `,
  );
}

export async function enviarEmailVagaAberta(
  clienteEmail: string,
  v: { clienteNome: string; barbeariaNome: string; servicoNome: string; dataHora: Date; link: string },
) {
  await enviar(
    clienteEmail,
    `Abriu um horário — ${v.barbeariaNome}`,
    `
      <h2>Oi, ${v.clienteNome}! Abriu um horário</h2>
      <p>Você estava na lista de espera para <strong>${v.servicoNome}</strong>.
      Alguém cancelou e ficou livre ${formatarDataBrasilia(v.dataHora)} às ${formatarHoraBrasilia(v.dataHora)}.</p>
      <p>Avisamos mais de uma pessoa: quem marcar primeiro fica com o horário.</p>
      <p style="margin:24px 0">
        <a href="${v.link}" style="background:#C1272D;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:600">
          Marcar agora
        </a>
      </p>
    `,
  );
}

export async function enviarEmailNotificacaoAdmin(
  adminEmail: string,
  d: DetalhesAgendamento & { clienteNome: string },
) {
  await enviar(
    adminEmail,
    `Novo agendamento — ${d.clienteNome}`,
    `
      <h2>Novo agendamento recebido</h2>
      <p><strong>${d.clienteNome}</strong> marcou um horário:</p>
      ${blocoDetalhes(d)}
    `,
  );
}

// Lead de interesse no upsell de site personalizado — vai pro e-mail do
// dono do Naviu, não da barbearia.
export async function enviarEmailLeadSitePersonalizado(
  barbeariaNome: string,
  mensagem: string | null,
) {
  const destinatario = process.env.NAVIU_OWNER_EMAIL;
  if (!destinatario) {
    console.warn("[email] NAVIU_OWNER_EMAIL não configurado, lead não notificado por e-mail.");
    return;
  }

  await enviar(
    destinatario,
    `Lead: site personalizado — ${barbeariaNome}`,
    `
      <h2>Pedido de site personalizado</h2>
      <p><strong>${barbeariaNome}</strong> quer saber mais sobre o site personalizado.</p>
      ${mensagem ? `<p>Mensagem: ${mensagem}</p>` : ""}
    `,
  );
}
