-- Fail safely if historical duplicates exist; do not remove any invoices.
DO $$ BEGIN
  IF EXISTS (SELECT "orderId" FROM "invoices" GROUP BY "orderId" HAVING COUNT(*) > 1) THEN
    RAISE EXCEPTION 'Duplicate invoices exist for an order. Review them before applying the one-to-one constraint.';
  END IF;
END $$;
CREATE UNIQUE INDEX "invoices_orderId_key" ON "invoices"("orderId");
