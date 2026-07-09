/**
 * 수치를 축약 표기로 포맷한다.
 *
 * @example
 * formatCount(12400); // "12.4K"
 * formatCount(940); // "940"
 */
export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  const k = n / 1000;
  return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}K`;
}

/**
 * 핸들에서 아바타 이니셜 2글자를 뽑는다.
 *
 * @example
 * avatarInitials("@kop_anfield"); // "KO"
 */
export function avatarInitials(handle: string): string {
  return handle.replace("@", "").slice(0, 2).toUpperCase();
}
