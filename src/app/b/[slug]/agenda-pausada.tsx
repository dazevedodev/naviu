// Mostrada no lugar do agendamento quando a assinatura da barbearia venceu.
export function AgendaPausada() {
  return (
    <div className="mb-8 rounded-2xl border border-zinc-200 bg-white p-5 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
      O agendamento online desta barbearia está pausado no momento. Fale com
      eles pelo WhatsApp pra marcar seu horário.
    </div>
  );
}
