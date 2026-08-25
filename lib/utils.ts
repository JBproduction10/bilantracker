export function money(n: number): string {
  const neg = n < 0;
  const v = Math.round(Math.abs(n)).toLocaleString("fr-FR");
  return `${neg ? "-" : ""}${v} FC`;
}

export function initials(name: string | undefined | null): string {
  return (name || "").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

export const PERIODS = ["June 2026", "July 2026", "August 2026", "September 2026"];
