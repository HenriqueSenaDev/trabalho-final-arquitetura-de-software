export const logger = {
  info: (message: string, meta?: object) =>
    console.log(JSON.stringify({ level: 'info', message, ...meta, at: new Date() })),
  warn: (message: string, meta?: object) =>
    console.warn(JSON.stringify({ level: 'warn', message, ...meta, at: new Date() })),
  error: (message: string, meta?: object) =>
    console.error(JSON.stringify({ level: 'error', message, ...meta, at: new Date() })),
};

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
