"use client";

import { useEffect, useId, useRef, useState } from "react";

// O símbolo do Naviu (relógio de bolso com ponteiros de navalha) desenhado em
// código, igual a public/marca/naviu-simbolo.svg. Com `aoVivo`, as navalhas
// marcam a hora certa de Brasília e andam sozinhas.

// Navalha apontando para cima a partir do eixo (mesma forma da logo).
function navalha(L: number) {
  const s = L * 0.42;
  return `M-2 0V-${L - 1}Q-2-${L} -1-${L}H.2Q3.2-${L} 3.2-${L - 3}V-${s.toFixed(1)}Q3.2-${(s - 2.5).toFixed(1)} .4-${(s - 3.5).toFixed(1)}V0Z`;
}

// Posição da logo parada: hora em -58°, minuto em 42°.
const LOGO = { hora: -58, minuto: 42 };

function anguloAgora() {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const h = Number(partes.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(partes.find((p) => p.type === "minute")?.value ?? 0);
  return { hora: (h % 12) * 30 + m * 0.5, minuto: m * 6 };
}

// Mantém o ângulo sempre crescendo, para o ponteiro não voltar para trás
// quando passa do 12.
function avancar(anterior: number, novo: number) {
  let a = novo;
  while (a < anterior - 1) a += 360;
  return a;
}

export function RelogioNaviu({
  cor = "#C1272D",
  aoVivo = false,
  className,
  titulo = "Naviu",
}: {
  cor?: string;
  aoVivo?: boolean;
  className?: string;
  titulo?: string;
}) {
  const id = useId().replace(/:/g, "");
  const [angulos, setAngulos] = useState(LOGO);
  const atual = useRef(LOGO);

  useEffect(() => {
    if (!aoVivo) return;
    const semAnimacao = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let quadro = 0;

    // Gira da posição atual até a nova em ~1,2s (desacelerando no fim).
    const atualizar = () => {
      const agora = anguloAgora();
      const de = atual.current;
      const para = {
        hora: avancar(de.hora, agora.hora),
        minuto: avancar(de.minuto, agora.minuto),
      };
      atual.current = para;
      if (semAnimacao) {
        setAngulos(para);
        return;
      }
      const inicio = performance.now();
      const passo = (t: number) => {
        const p = Math.min(1, (t - inicio) / 1200);
        const k = 1 - Math.pow(1 - p, 3);
        setAngulos({
          hora: de.hora + (para.hora - de.hora) * k,
          minuto: de.minuto + (para.minuto - de.minuto) * k,
        });
        if (p < 1) quadro = requestAnimationFrame(passo);
      };
      cancelAnimationFrame(quadro);
      quadro = requestAnimationFrame(passo);
    };
    const espera = setTimeout(atualizar, 300);
    const relogio = setInterval(atualizar, 15_000);
    return () => {
      clearTimeout(espera);
      clearInterval(relogio);
      cancelAnimationFrame(quadro);
    };
  }, [aoVivo]);

  return (
    <svg viewBox="0 0 128 128" role="img" aria-label={titulo} className={className}>
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="128" height="128">
          <rect x="54" y="13" width="20" height="24" rx="10" fill="#fff" />
          <circle cx="64" cy="23" r="4.2" fill="#000" />
          <circle cx="64" cy="70" r="44" fill="#fff" />
          <circle cx="64" cy="70" r="37.5" fill="none" stroke="#000" strokeWidth="2.5" />
          <path d={navalha(24)} transform={`translate(64 70) rotate(${angulos.hora})`} fill="#000" />
          <path
            d={navalha(33)}
            transform={`translate(64 70) rotate(${angulos.minuto}) scale(-1 1)`}
            fill="#000"
          />
          <circle cx="64" cy="70" r="3.2" fill="#000" />
        </mask>
      </defs>
      <rect width="128" height="128" fill={cor} mask={`url(#${id})`} />
    </svg>
  );
}
