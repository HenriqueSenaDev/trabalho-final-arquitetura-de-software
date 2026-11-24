export interface Notice {
  deliveryId: string;
  recipient: { holderId: string; name: string; email: string };
  title: string;
  body: string;
}

/** Porta para o Provedor de notificações (serviço externo). */
export interface NotificationProvider {
  send(notice: Notice): Promise<void>;
}
