CREATE TABLE eventos_outbox (
  id uuid PRIMARY KEY,
  tipo text NOT NULL,
  origem_id uuid NOT NULL,
  titular_id uuid NOT NULL,
  versao integer NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  processado_em timestamptz,
  UNIQUE (tipo, origem_id, versao)
);

CREATE INDEX eventos_outbox_pendentes ON eventos_outbox (criado_em, id)
  WHERE processado_em IS NULL;
