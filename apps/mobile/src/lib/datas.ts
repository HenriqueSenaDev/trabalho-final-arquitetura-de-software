/** Só dígitos; as barras entram sozinhas: 05122026 → 05/12/2026. */
export function mascararData(texto: string): string {
  const digitos = texto.replace(/\D/g, '').slice(0, 8);
  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 4) return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
  return `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`;
}

/** Só dígitos; os dois-pontos entram sozinhos: 1430 → 14:30. */
export function mascararHora(texto: string): string {
  const digitos = texto.replace(/\D/g, '').slice(0, 4);
  if (digitos.length <= 2) return digitos;
  return `${digitos.slice(0, 2)}:${digitos.slice(2)}`;
}

/** DD/MM/AAAA + HH:MM no fuso do aparelho → ISO em UTC. Recusa datas que não existem (31/02, 25:00). */
export function instante(data: string, hora: string): string | null {
  const d = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(data);
  const h = /^(\d{2}):(\d{2})$/.exec(hora);
  if (!d || !h) return null;

  const [dia, mes, ano, horas, minutos] = [d[1], d[2], d[3], h[1], h[2]].map(Number);
  const valor = new Date(ano, mes - 1, dia, horas, minutos);
  const existe =
    valor.getFullYear() === ano &&
    valor.getMonth() === mes - 1 &&
    valor.getDate() === dia &&
    valor.getHours() === horas &&
    valor.getMinutes() === minutos;
  return existe ? valor.toISOString() : null;
}

/** ISO → campos do formulário no fuso do aparelho. */
export function paraCampos(iso: string): { data: string; hora: string } {
  const valor = new Date(iso);
  const doisDigitos = (numero: number) => String(numero).padStart(2, '0');
  return {
    data: `${doisDigitos(valor.getDate())}/${doisDigitos(valor.getMonth() + 1)}/${valor.getFullYear()}`,
    hora: `${doisDigitos(valor.getHours())}:${doisDigitos(valor.getMinutes())}`,
  };
}

export function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * UUID v4 gerado no aparelho para o registro da consulta: repetir o envio
 * (por exemplo, depois de perder a resposta) não duplica. Não é segredo, então
 * o fallback com Math.random basta onde não há crypto.randomUUID.
 */
export function novoIdentificador(): string {
  const nativo = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto?.randomUUID;
  if (nativo) return nativo.call((globalThis as { crypto?: object }).crypto);
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (caractere) => {
    const aleatorio = (Math.random() * 16) | 0;
    return (caractere === 'x' ? aleatorio : (aleatorio & 0x3) | 0x8).toString(16);
  });
}
