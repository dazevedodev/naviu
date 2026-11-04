// A Navi, atendente virtual do Naviu: o relógio de bolso da marca com rosto.
// Pisca de vez em quando (a animação respeita quem pediu menos movimento).

export function NaviAvatar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={className}>
      {/* Argola do relógio de bolso */}
      <rect x="26" y="2" width="12" height="12" rx="6" fill="#C1272D" />
      <circle cx="32" cy="8" r="2.4" fill="#fff" />
      <rect x="29.5" y="12" width="5" height="5" fill="#C1272D" />
      {/* Corpo e mostrador */}
      <circle cx="32" cy="38" r="24" fill="#C1272D" />
      <circle cx="32" cy="38" r="19" fill="#fff" />
      {/* Marcas das 12, 3, 6 e 9 */}
      <rect x="31" y="21" width="2" height="3.5" rx="1" fill="#C1272D" />
      <rect x="31" y="51.5" width="2" height="3.5" rx="1" fill="#C1272D" />
      <rect x="15" y="37" width="3.5" height="2" rx="1" fill="#C1272D" />
      <rect x="45.5" y="37" width="3.5" height="2" rx="1" fill="#C1272D" />
      {/* Rosto */}
      <g className="navi-olhos">
        <ellipse cx="25.5" cy="35.5" rx="2.5" ry="3.3" fill="#1C1415" />
        <ellipse cx="38.5" cy="35.5" rx="2.5" ry="3.3" fill="#1C1415" />
        <circle cx="26.3" cy="34.4" r="0.8" fill="#fff" />
        <circle cx="39.3" cy="34.4" r="0.8" fill="#fff" />
      </g>
      <ellipse cx="21.5" cy="42" rx="3" ry="1.8" fill="#F6CFCB" />
      <ellipse cx="42.5" cy="42" rx="3" ry="1.8" fill="#F6CFCB" />
      <path
        d="M27.5 42.5Q32 47 36.5 42.5"
        fill="none"
        stroke="#1C1415"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
