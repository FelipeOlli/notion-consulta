-- Substitui os status INADIMPLENTE/CONGELADO por EM_CANCELAMENTO
CREATE TYPE "AlterdataClienteStatus_new" AS ENUM ('ATIVO', 'EM_ANDAMENTO', 'INATIVO', 'EM_CANCELAMENTO', 'DISTRATADO');

ALTER TABLE "AlterdataCliente" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "AlterdataCliente" ALTER COLUMN "status" TYPE "AlterdataClienteStatus_new" USING (
  CASE "status"::text
    WHEN 'INADIMPLENTE' THEN 'EM_CANCELAMENTO'
    WHEN 'CONGELADO' THEN 'EM_CANCELAMENTO'
    ELSE "status"::text
  END::"AlterdataClienteStatus_new"
);

DROP TYPE "AlterdataClienteStatus";
ALTER TYPE "AlterdataClienteStatus_new" RENAME TO "AlterdataClienteStatus";

ALTER TABLE "AlterdataCliente" ALTER COLUMN "status" SET DEFAULT 'ATIVO';
