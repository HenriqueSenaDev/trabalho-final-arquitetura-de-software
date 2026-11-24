/** Só dígitos; as barras entram sozinhas: 05122026 → 05/12/2026. */
export function maskDate(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** Só dígitos; os dois-pontos entram sozinhos: 1430 → 14:30. */
export function maskTime(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

/** DD/MM/AAAA + HH:MM no fuso do aparelho → ISO em UTC. Recusa datas que não existem (31/02, 25:00). */
export function toInstant(date: string, time: string): string | null {
  const d = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date);
  const t = /^(\d{2}):(\d{2})$/.exec(time);
  if (!d || !t) return null;

  const [day, month, year, hours, minutes] = [d[1], d[2], d[3], t[1], t[2]].map(Number);
  const value = new Date(year, month - 1, day, hours, minutes);
  const exists =
    value.getFullYear() === year &&
    value.getMonth() === month - 1 &&
    value.getDate() === day &&
    value.getHours() === hours &&
    value.getMinutes() === minutes;
  return exists ? value.toISOString() : null;
}

/** ISO → campos do formulário no fuso do aparelho. */
export function toFields(iso: string): { date: string; time: string } {
  const value = new Date(iso);
  const two = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${two(value.getDate())}/${two(value.getMonth() + 1)}/${value.getFullYear()}`,
    time: `${two(value.getHours())}:${two(value.getMinutes())}`,
  };
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** "2026-03" → "Março de 2026". */
export function monthName(month: string): string {
  const [year, number] = month.split('-').map(Number);
  const name = new Date(year, number - 1, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * UUID v4 gerado no aparelho para o registro: repetir o envio não duplica.
 * Não é segredo, então o fallback com Math.random basta onde não há crypto.randomUUID.
 */
export function newId(): string {
  const crypto = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (crypto?.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    return (char === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });
}
