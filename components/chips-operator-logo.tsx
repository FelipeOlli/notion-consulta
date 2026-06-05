import type { ChipOperadora } from "@prisma/client";

interface Props {
  operadora: ChipOperadora;
  size?: number;
}

export function ChipOperadoraLogo({ operadora, size = 28 }: Props) {
  const s = size;

  if (operadora === "CLARO") {
    return (
      <span title="Claro" style={{ display: "inline-flex", alignItems: "center" }}>
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="20" fill="#E3000F" />
          <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle" fill="white" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="10">CLARO</text>
        </svg>
      </span>
    );
  }

  if (operadora === "TIM") {
    return (
      <span title="TIM" style={{ display: "inline-flex", alignItems: "center" }}>
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="20" fill="#003087" />
          <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle" fill="white" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="12">TIM</text>
        </svg>
      </span>
    );
  }

  if (operadora === "VIVO") {
    return (
      <span title="Vivo" style={{ display: "inline-flex", alignItems: "center" }}>
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="20" fill="#660099" />
          <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle" fill="white" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="10">VIVO</text>
        </svg>
      </span>
    );
  }

  // OI
  return (
    <span title="Oi" style={{ display: "inline-flex", alignItems: "center" }}>
      <svg width={s} height={s} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="20" fill="#FFCC00" />
        <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle" fill="#333" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="14">Oi</text>
      </svg>
    </span>
  );
}

export const OPERADORA_LABELS: Record<ChipOperadora, string> = {
  CLARO: "Claro",
  TIM: "TIM",
  VIVO: "Vivo",
  OI: "Oi",
};
