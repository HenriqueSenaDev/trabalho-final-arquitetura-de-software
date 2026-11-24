-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "health_record_kind" AS ENUM ('CONSULTATION', 'EXAM', 'VACCINE', 'PRESCRIPTION', 'OTHER');

-- CreateEnum
CREATE TYPE "reminder_status" AS ENUM ('SCHEDULED', 'CANCELLED', 'DONE');

-- CreateEnum
CREATE TYPE "notification_status" AS ENUM ('RESERVED', 'SENT', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "outbox_status" AS ENUM ('PENDING', 'PROCESSED', 'FAILED');

-- CreateTable
CREATE TABLE "holders" (
    "id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "holders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_records" (
    "id" UUID NOT NULL,
    "holder_id" UUID NOT NULL,
    "kind" "health_record_kind" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "health_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" UUID NOT NULL,
    "record_id" UUID NOT NULL,
    "storage_key" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "indicators" (
    "id" UUID NOT NULL,
    "holder_id" UUID NOT NULL,
    "type" VARCHAR(60) NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "unit" VARCHAR(20) NOT NULL,
    "measured_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "indicators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminders" (
    "id" UUID NOT NULL,
    "holder_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "remind_at" TIMESTAMP(3) NOT NULL,
    "status" "reminder_status" NOT NULL DEFAULT 'SCHEDULED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_deliveries" (
    "id" UUID NOT NULL,
    "reminder_id" UUID NOT NULL,
    "scheduled_for" TIMESTAMP(3) NOT NULL,
    "status" "notification_status" NOT NULL DEFAULT 'RESERVED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" UUID NOT NULL,
    "aggregate_type" TEXT NOT NULL,
    "aggregate_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "outbox_status" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "holders_email_key" ON "holders"("email");

-- CreateIndex
CREATE INDEX "health_records_holder_id_occurred_at_idx" ON "health_records"("holder_id", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "attachments_storage_key_key" ON "attachments"("storage_key");

-- CreateIndex
CREATE INDEX "indicators_holder_id_type_measured_at_idx" ON "indicators"("holder_id", "type", "measured_at");

-- CreateIndex
CREATE INDEX "reminders_holder_id_remind_at_idx" ON "reminders"("holder_id", "remind_at");

-- CreateIndex
CREATE INDEX "notification_deliveries_status_scheduled_for_idx" ON "notification_deliveries"("status", "scheduled_for");

-- CreateIndex
CREATE UNIQUE INDEX "notification_deliveries_reminder_id_scheduled_for_key" ON "notification_deliveries"("reminder_id", "scheduled_for");

-- CreateIndex
CREATE INDEX "outbox_events_status_occurred_at_idx" ON "outbox_events"("status", "occurred_at");

-- AddForeignKey
ALTER TABLE "health_records" ADD CONSTRAINT "health_records_holder_id_fkey" FOREIGN KEY ("holder_id") REFERENCES "holders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "health_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indicators" ADD CONSTRAINT "indicators_holder_id_fkey" FOREIGN KEY ("holder_id") REFERENCES "holders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_holder_id_fkey" FOREIGN KEY ("holder_id") REFERENCES "holders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_reminder_id_fkey" FOREIGN KEY ("reminder_id") REFERENCES "reminders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

