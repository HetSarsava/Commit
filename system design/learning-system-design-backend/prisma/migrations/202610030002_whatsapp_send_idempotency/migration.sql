ALTER TABLE "whatsapp_messages" ADD COLUMN "idempotencyKey" TEXT;
ALTER TABLE "whatsapp_messages" ADD COLUMN "requestHash" TEXT;
CREATE UNIQUE INDEX "whatsapp_messages_idempotencyKey_key" ON "whatsapp_messages"("idempotencyKey");
