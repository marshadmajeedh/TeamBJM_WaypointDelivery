-- AlterTable
ALTER TABLE "Order"
ADD COLUMN "nextDeliveryDate" TIMESTAMP(3),
ADD COLUMN "deferralTimeSlot" TEXT,
ADD COLUMN "deferralPriority" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "deferredVehicleId" TEXT,
ADD COLUMN "dispatcherNotes" TEXT;

-- CreateIndex
CREATE INDEX "Order_deferredVehicleId_idx" ON "Order"("deferredVehicleId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_deferredVehicleId_fkey"
FOREIGN KEY ("deferredVehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
