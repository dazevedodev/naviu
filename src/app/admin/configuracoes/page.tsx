import { getBarbeariaAtual } from "@/lib/current-barbearia";
import { salvarConfigSinal } from "./actions";
import { DadosBarbeariaForm } from "./dados-barbearia-form";
import { MensagensWhatsAppForm } from "./mensagens-whatsapp-form";

export default async function ConfiguracoesPage() {
  const barbearia = await getBarbeariaAtual();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
        Configurações
      </h1>

      <DadosBarbeariaForm barbearia={barbearia} />

      <MensagensWhatsAppForm barbearia={barbearia} />

      <form
        action={salvarConfigSinal}
        className="max-w-md rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
      >
        <h2 className="mb-4 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
          Sinal (pagamento antecipado)
        </h2>

        <label className="mb-4 flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <input
            type="checkbox"
            name="sinal_ativo"
            defaultChecked={barbearia.sinal_ativo}
            className="h-4 w-4"
          />
          Exigir sinal para confirmar agendamento
        </label>

        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Tipo
        </label>
        <select
          name="sinal_tipo"
          defaultValue={barbearia.sinal_tipo}
          className="mb-4 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="fixo">Valor fixo (R$)</option>
          <option value="percentual">Percentual do serviço (%)</option>
        </select>

        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Valor
        </label>
        <input
          name="sinal_valor"
          type="number"
          min={0}
          step={0.5}
          defaultValue={barbearia.sinal_valor}
          className="mb-4 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
        />

        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Tempo para expirar sem pagamento (min)
        </label>
        <input
          name="sinal_tempo_expiracao_min"
          type="number"
          min={1}
          defaultValue={barbearia.sinal_tempo_expiracao_min}
          className="mb-6 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
        />

        <button
          type="submit"
          className="w-full rounded-full bg-zinc-950 py-2.5 text-sm font-medium text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          Salvar
        </button>
      </form>
    </div>
  );
}
