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

// Os e-mails têm o mesmo visual do site: faixa vermelha com a marca, cartão
// branco com o horário e um botão. Feito com tabelas e estilo na própria tag,
// que é o que Gmail, Outlook e o app de e-mail do celular entendem.

const VERMELHO = "#C1272D";
const TINTA = "#1C1415";
const ACO = "#6B6264";
const CLARO = "#F6F1F1";
const FONTE = "font-family:Helvetica,Arial,sans-serif";

// Nome de cliente, de serviço etc. vêm de quem digitou: nunca entram no
// HTML sem escapar.
function esc(texto: string | null | undefined): string {
  return (texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function dataPorExtenso(d: Date): string {
  const texto = d.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Sao_Paulo",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function botao(link: string, rotulo: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px">
      <tr><td style="background:${VERMELHO};border-radius:999px">
        <a href="${link}" style="display:inline-block;padding:14px 28px;${FONTE};font-size:16px;font-weight:700;color:#ffffff;text-decoration:none">${rotulo}</a>
      </td></tr>
    </table>`;
}

function moldura(o: { previa: string; titulo: string; corpo: string; rodape?: string }): string {
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:${VERMELHO}">
  <div style="display:none;max-height:0;overflow:hidden">${o.previa}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${VERMELHO}">
    <tr><td align="center" style="padding:32px 16px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px">
        <tr><td style="padding:0 4px 20px;${FONTE};font-size:22px;font-weight:800;letter-spacing:-0.5px;color:#ffffff">naviu</td></tr>
        <tr><td style="background:#ffffff;border-radius:24px;padding:32px 28px;${FONTE};color:${TINTA}">
          <h1 style="margin:0 0 16px;font-size:22px;line-height:1.25;font-weight:800">${o.titulo}</h1>
          ${o.corpo}
        </td></tr>
        ${
          o.rodape
            ? `<tr><td style="padding:20px 8px 0;${FONTE};font-size:13px;line-height:1.5;color:#F6CFCB">${o.rodape}</td></tr>`
            : ""
        }
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function cartaoHorario(d: {
  barbeariaNome: string;
  barbeariaEndereco?: string | null;
  servicoNome: string;
  barbeiroNome?: string;
  dataHora: Date;
}): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CLARO};border-radius:16px">
      <tr><td style="padding:20px;${FONTE}">
        <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${ACO}">${esc(d.barbeariaNome)}</div>
        <div style="margin-top:12px;font-size:15px;font-weight:700;color:${TINTA}">${dataPorExtenso(d.dataHora)}</div>
        <div style="font-size:34px;font-weight:800;color:${VERMELHO}">${formatarHoraBrasilia(d.dataHora)}</div>
        <div style="margin-top:10px;font-size:15px;color:${TINTA}">${esc(d.servicoNome)}${
          d.barbeiroNome ? ` <span style="color:${ACO}">com ${esc(d.barbeiroNome)}</span>` : ""
        }</div>
        ${d.barbeariaEndereco ? `<div style="margin-top:4px;font-size:14px;color:${ACO}">${esc(d.barbeariaEndereco)}</div>` : ""}
      </td></tr>
    </table>`;
}

function rodapeCancelamento(d: DetalhesAgendamento): string {
  const link = `${appUrl()}/cancelar/${d.cancelamentoToken}`;
  return `Não vai poder ir? <a href="${link}" style="color:#ffffff;font-weight:700">Cancele por aqui</a> e libere o horário para outra pessoa.`;
}

function paragrafo(texto: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:${ACO}">${texto}</p>`;
}

export async function enviarEmailConfirmacaoCliente(
  clienteEmail: string,
  d: DetalhesAgendamento,
) {
  await enviar(
    clienteEmail,
    `Horário marcado na ${d.barbeariaNome}`,
    moldura({
      previa: `${d.servicoNome}, ${formatarDataBrasilia(d.dataHora)} às ${formatarHoraBrasilia(d.dataHora)}`,
      titulo: "Horário marcado",
      corpo: `${paragrafo("Está tudo certo. Um dia antes a gente te pergunta se você vem.")}${cartaoHorario(d)}`,
      rodape: rodapeCancelamento(d),
    }),
  );
}

export async function enviarEmailLembreteCliente(clienteEmail: string, d: DetalhesAgendamento) {
  await enviar(
    clienteEmail,
    `Daqui a 1 hora na ${d.barbeariaNome}`,
    moldura({
      previa: `Seu horário é às ${formatarHoraBrasilia(d.dataHora)}`,
      titulo: "Seu horário é daqui a pouco",
      corpo: cartaoHorario(d),
      rodape: rodapeCancelamento(d),
    }),
  );
}

// Um dia antes: o cliente confirma que vai ou cancela e libera o horário.
// O link abre uma página com o botão (e-mail que abre link sozinho, como
// antivírus, não confirma nada por engano).
export async function enviarEmailPedidoConfirmacao(clienteEmail: string, d: DetalhesAgendamento) {
  const confirmar = `${appUrl()}/confirmar/${d.cancelamentoToken}`;
  await enviar(
    clienteEmail,
    `Você vem amanhã? ${d.barbeariaNome}`,
    moldura({
      previa: "Confirme seu horário com um toque",
      titulo: "Você vem?",
      corpo: `${cartaoHorario(d)}${botao(confirmar, "Sim, vou")}`,
      rodape: rodapeCancelamento(d),
    }),
  );
}

export async function enviarEmailVagaAberta(
  clienteEmail: string,
  v: { clienteNome: string; barbeariaNome: string; servicoNome: string; dataHora: Date; link: string },
) {
  await enviar(
    clienteEmail,
    `Abriu um horário na ${v.barbeariaNome}`,
    moldura({
      previa: `${formatarDataBrasilia(v.dataHora)} às ${formatarHoraBrasilia(v.dataHora)} ficou livre`,
      titulo: `${esc(v.clienteNome.split(" ")[0])}, abriu um horário`,
      corpo: `${paragrafo(
        "Você estava na lista de espera e alguém cancelou. Avisamos mais de uma pessoa: quem marcar primeiro fica com o horário.",
      )}${cartaoHorario(v)}${botao(v.link, "Marcar agora")}`,
    }),
  );
}

export async function enviarEmailNotificacaoAdmin(
  adminEmail: string,
  d: DetalhesAgendamento & { clienteNome: string },
) {
  await enviar(
    adminEmail,
    `Novo horário: ${d.clienteNome}`,
    moldura({
      previa: `${d.servicoNome}, ${formatarDataBrasilia(d.dataHora)} às ${formatarHoraBrasilia(d.dataHora)}`,
      titulo: `${esc(d.clienteNome)} marcou um horário`,
      corpo: `${cartaoHorario(d)}${botao(`${appUrl()}/admin`, "Abrir a agenda")}`,
    }),
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
      <p><strong>${esc(barbeariaNome)}</strong> quer saber mais sobre o site personalizado.</p>
      ${mensagem ? `<p>Mensagem: ${esc(mensagem)}</p>` : ""}
    `,
  );
}
