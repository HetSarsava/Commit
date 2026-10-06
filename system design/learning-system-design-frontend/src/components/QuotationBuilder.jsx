import ManualDocument from "./ManualDocument";
export default function QuotationBuilder({
  quotation = null,
  mode = "create",
  onClose,
  onSuccess,
}) {
  return (
    <ManualDocument
      kind="quotations"
      record={quotation}
      readOnly={mode === "view"}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}
