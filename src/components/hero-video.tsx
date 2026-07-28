"use client";

import { useEffect, useRef, useState } from "react";

// Colar aqui o ID do vídeo do YouTube quando estiver pronto — é o trecho
// depois de "v=" na URL (ex: "dQw4w9WgXcQ"). Enquanto for null, mostra só
// o placeholder abaixo.
const YOUTUBE_VIDEO_ID: string | null = null;

type YTPlayer = {
  unMute: () => void;
  playVideo: () => void;
};

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement,
        options: {
          videoId: string;
          playerVars?: Record<string, number | string>;
          events?: { onReady?: (event: { target: YTPlayer }) => void };
        },
      ) => YTPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

export function HeroVideo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const [comSom, setComSom] = useState(false);

  useEffect(() => {
    const videoId = YOUTUBE_VIDEO_ID;
    if (!videoId || !containerRef.current) return;

    function criarPlayer() {
      if (!containerRef.current || !window.YT || !videoId) return;
      // Navegadores bloqueiam autoplay com som quase sempre — a única forma
      // confiável de autoplay é mudo. Começa mudo e mostra um botão bem
      // visível pra ativar o som com um clique real do usuário.
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: { autoplay: 1, mute: 1, playsinline: 1, rel: 0 },
        events: {
          onReady: (event) => event.target.playVideo(),
        },
      });
    }

    if (window.YT) {
      criarPlayer();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(script);
    window.onYouTubeIframeAPIReady = criarPlayer;
  }, []);

  function ativarSom() {
    playerRef.current?.unMute();
    setComSom(true);
  }

  if (!YOUTUBE_VIDEO_ID) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-950 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-950">
            ▶
          </div>
          <p className="text-sm text-zinc-500">Vídeo em breve</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black">
      <div ref={containerRef} className="h-full w-full" />
      {!comSom && (
        <button
          onClick={ativarSom}
          className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-zinc-950/90 px-5 py-3 text-sm font-medium text-zinc-50 shadow-lg hover:bg-zinc-950"
        >
          🔊 Ativar som
        </button>
      )}
    </div>
  );
}
