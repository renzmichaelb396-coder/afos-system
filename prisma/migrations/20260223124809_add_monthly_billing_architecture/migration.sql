-- CreateTable
CREATE TABLE "BillingPeriod" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientStatusByMonth" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "billingPeriodId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNPAID',

    CONSTRAINT "ClientStatusByMonth_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BillingPeriod_year_month_key" ON "BillingPeriod"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "ClientStatusByMonth_clientId_billingPeriodId_key" ON "ClientStatusByMonth"("clientId", "billingPeriodId");

-- AddForeignKey
ALTER TABLE "ClientStatusByMonth" ADD CONSTRAINT "ClientStatusByMonth_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientStatusByMonth" ADD CONSTRAINT "ClientStatusByMonth_billingPeriodId_fkey" FOREIGN KEY ("billingPeriodId") REFERENCES "BillingPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
