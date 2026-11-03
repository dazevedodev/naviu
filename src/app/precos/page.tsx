import Image from "next/image";
import Link from "next/link";
import { PlanosCards } from "@/components/planos-cards";

export const metadata = {
  title: "Preços — Naviu",
};

export default function PrecosPage() {
  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-16 dark:bg-black">
      <div className="w-full max-w-3xl">
        <div className="mb-10 text-center">
          <Link href="/" className="mb-6 inline-block" aria-label="Voltar para o início">
            <Image src="/marca/naviu-logo.svg" alt="Naviu" width={114} height={32} unoptimized />
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Escolha o plano da sua barbearia
          </h1>
          <p className="mt-3 text-zinc-600 dark:text-zinc-400">
            Sem contrato de fidelidade. Cancele quando quiser.
          </p>
        </div>

        <PlanosCards />

        <p className="mt-8 text-center text-sm text-zinc-500">
          Já é cliente?{" "}
          <Link href="/login" className="font-medium text-zinc-950 underline dark:text-zinc-50">
            Entrar no painel
          </Link>
        </p>
      </div>
    </div>
  );
}
