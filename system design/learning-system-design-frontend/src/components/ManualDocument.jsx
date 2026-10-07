import { useState, useEffect, useRef } from "react";
import CustomerForm from "./CustomerForm";
import api from "../api/client";
import { calculateDocument, formatINR } from "../utils/documentCalculation";
import "./ManualCRM.css";
export default function ManualDocument({
  kind = "orders",
  record = null,
  initialCustomerId = '',
  readOnly = false,
  onClose,
  onSuccess,
}) {
  const calculationRef = useRef(null);
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [chooseCustomer, setChooseCustomer] = useState(!initialCustomerId);
  const [customers, setCustomers] = useState([]),
    [search, setSearch] = useState(""),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => ({
    customerId: record?.customerId || initialCustomerId || "",
    status:
      record?.status === "DELIVERED"
        ? "COMPLETED"
        : record?.status || "PENDING",
    deliveryDate: record?.deliveryDate?.slice(0, 10) || "",
    validUntil: record?.validUntil?.slice(0, 10) || "",
    poNumber: record?.poNumber || "",
    notes: record?.notes || "",
    termsConditions: record?.termsConditions || "",
    taxPercent:
      record?.taxPercent ??
      (Number(record?.subtotal) - Number(record?.discountAmount || 0) > 0
        ? Math.round(
            (Number(record.taxAmount) * 100) /
              (Number(record.subtotal) - Number(record.discountAmount || 0)),
          )
        : 18),
    discountAmount: record?.discountAmount || 0,
    advanceAmount: record?.advanceAmount || 0,
    items: record?.items?.map((i) => ({
      description: i.description || i.product?.name || "",
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      discount: i.discount || 0,
      customization: i.customization || "",
    })) || [{ description: "", quantity: 1, unitPrice: 0, customization: "" }],
  }));
  useEffect(() => {
    let active = true;
    api
      .get("/manual/customers")
      .then((r) => active && setCustomers(r.data))
      .catch(
        () =>
          active &&
          setError("Could not load customers. Close this form and retry."),
      );
    return () => {
      active = false;
    };
  }, []);
  const change = (key, value) => setForm((s) => ({ ...s, [key]: value }));
  const itemChange = (index, key, value) =>
    setForm((s) => ({
      ...s,
      items: s.items.map((item, i) =>
        i === index ? { ...item, [key]: value } : item,
      ),
    }));
  const calculation = calculateDocument(form);
  const summaryAmount = value => calculation.errors.length ? '—' : formatINR(value);
  async function save(e) {
    e.preventDefault();
    if (saving || calculation.errors.length) return;
    setSaving(true);
    setError("");
    try {
      const r = await api[record ? "put" : "post"](
        "/manual/" + kind + (record ? "/" + record.id : ""),
        { ...form, items: form.items.map(item => ({ ...item, discount: item.discount ?? 0 })) },
      );
      onSuccess(r.data);
    } catch (e) {
      setError(e.response?.data?.error || "Could not save. Please retry.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <div className="manual-overlay">
        <section
          className="manual-dialog document-dialog"
          role="dialog"
          aria-modal="true"
          aria-label={
            (record ? "Edit " : "New ") +
            (kind === "orders" ? "order" : "quotation")
          }
        >
          <header>
            <h2>
              {readOnly ? "View" : record ? "Edit" : "New"}{" "}
              {kind === "orders" ? "order" : "quotation"}
            </h2>
            <button className="btn" onClick={onClose} type="button">
              Close
            </button>
          </header>
          <form onSubmit={save}>
            <div className="manual-body">
              {error && (
                <p role="alert" className="manual-error">
                  {error}
                </p>
              )}
              <div className="document-editor">
              <fieldset disabled={saving || readOnly}>
                <div className="manual-grid">
{chooseCustomer ? <>                  <label>
                    Find customer
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Company or contact name"
                    />
                  </label>
                  <label>
                    Customer
                    <select
                      required
                      value={form.customerId}
                      onChange={(e) => change("customerId", e.target.value)}
                    >
                      <option value="">Choose customer</option>
                      {customers
                        .filter(
                          (c) =>
                            c.id === form.customerId ||
                            (c.companyName + " " + c.contactPerson)
                              .toLowerCase()
                              .includes(search.toLowerCase()),
                        )
                        .sort(
                          (a, b) =>
                            Number(b.id === form.customerId) -
                            Number(a.id === form.customerId),
                        )
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.companyName}
                          </option>
                        ))}
                    </select>
                  </label>
</> : <div className="manual-full selected-customer"><strong>{customers.find(c => c.id === form.customerId)?.companyName || 'Loading customer...'}</strong><button className="btn" type="button" onClick={() => setChooseCustomer(true)}>Change customer</button></div>}
                  {kind === "orders" ? (
                    <>
                      <label>
                        Status
                        <select
                          value={form.status}
                          onChange={(e) => change("status", e.target.value)}
                        >
                          {[
                            ["PENDING", "Pending"],
                            ["CONFIRMED", "Confirmed"],
                            ["IN_PRODUCTION", "In progress"],
                            ["READY", "Ready"],
                            ["DISPATCHED", "Dispatched"],
                            ["COMPLETED", "Completed"],
                            ["CANCELLED", "Cancelled"],
                          ].map(([v, l]) => (
                            <option key={v} value={v}>
                              {l}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Delivery date
                        <input
                          type="date"
                          value={form.deliveryDate}
                          onChange={(e) =>
                            change("deliveryDate", e.target.value)
                          }
                        />
                      </label>
                      <label>
                        Customer PO reference
                        <input
                          value={form.poNumber}
                          onChange={(e) => change("poNumber", e.target.value)}
                        />
                      </label>
                      <label>
                        Advance received (INR)
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.advanceAmount}
                          onChange={(e) =>
                            change("advanceAmount", e.target.value)
                          }
                        />
                      </label>
                    </>
                  ) : (
                    <label>
                      Valid until
                      <input
                        type="date"
                        value={form.validUntil}
                        onChange={(e) => change("validUntil", e.target.value)}
                      />
                    </label>
                  )}
                </div>
                {!readOnly && chooseCustomer && (
                  <button
                    className="btn"
                    type="button"
                    onClick={() => setAddingCustomer(true)}
                  >
                    Add customer
                  </button>
                )}
                <h3>Items</h3>
                <p>
                  Type the description, quantity and price. No product list is
                  required.
                </p>
                {form.items.map((i, index) => (
                  <div className="manual-item" key={index}>
                    <label>
                      Item description
                      <input
                        required
                        maxLength={250}
                        value={i.description}
                        onChange={(e) =>
                          itemChange(index, "description", e.target.value)
                        }
                      />
                    </label>
                    <label>
                      Quantity
                      <input
                        required
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={i.quantity}
                        onChange={(e) =>
                          itemChange(index, "quantity", e.target.value)
                        }
                      />
                    </label>
                    <label>
                      Unit price (INR)
                      <input
                        required
                        type="number"
                        min="0"
                        step="0.01"
                        value={i.unitPrice}
                        onChange={(e) =>
                          itemChange(index, "unitPrice", e.target.value)
                        }
                      />
                    </label>
                    <label>
                      Line discount (INR)
                      <input
                        type="number"
                        min="0"
                        max={calculation.items[index].gross}
                        required
                        step="0.01"
                        aria-describedby={"line-discount-help-" + index}
                        value={i.discount ?? 0}
                        onChange={(e) =>
                          itemChange(index, "discount", e.target.value)
                        }
                      />
                    </label>
                    <button
                      className="btn"
                      type="button"
                      disabled={form.items.length === 1}
                      onClick={() =>
                        change(
                          "items",
                          form.items.filter((_, n) => n !== index),
                        )
                      }
                    >
                      Remove item {index + 1}
                    </button>
                    <div className="line-calculation manual-full">
                      <small id={"line-discount-help-" + index} className="calculation-hint">Discount applies once to the whole line.</small>
                      {calculation.items[index].valid ? <>
                      <span>{i.quantity || 0} × {formatINR(calculation.items[index].unitPrice)} = {formatINR(calculation.items[index].gross)}</span>
                      <span>− {formatINR(calculation.items[index].discount)} line discount</span>
                      <strong>Line total: {formatINR(calculation.items[index].total)}</strong>
                      </> : <strong>Check this item's quantity, price and discount.</strong>}
                    </div>
<details className="workflow-details manual-full"><summary>Item note (optional)</summary>                    <label className="manual-full">
                      Item notes
                      <input
                        value={i.customization}
                        onChange={(e) =>
                          itemChange(index, "customization", e.target.value)
                        }
                      />
                    </label></details>
                  </div>
                ))}
                <button
                  className="btn"
                  type="button"
                  disabled={form.items.length >= 50}
                  onClick={() =>
                    change("items", [
                      ...form.items,
                      {
                        description: "",
                        quantity: 1,
                        unitPrice: 0,
                        customization: "",
                      },
                    ])
                  }
                >
                  Add item
                </button>
                <div className="manual-grid manual-section">
                  <label>
                    Overall discount (INR)
                    <input
                      type="number"
                      min="0"
                      max={calculation.subtotal}
                      required
                      step="0.01"
                      value={form.discountAmount}
                      onChange={(e) => change("discountAmount", e.target.value)}
                    />
                  </label>
                  <label>
                    GST (%)
                    <input
                      type="number"
                      min="0"
                      max="100"
                      required
                      step="0.01"
                      value={form.taxPercent}
                      onChange={(e) => change("taxPercent", e.target.value)}
                    />
                  </label>
</div><details className="workflow-details"><summary>Notes and terms (optional)</summary><div className="manual-grid">                  <label>
                    Notes
                    <textarea
                      value={form.notes}
                      onChange={(e) => change("notes", e.target.value)}
                    />
                  </label>
                  <label>
                    Terms
                    <textarea
                      value={form.termsConditions}
                      onChange={(e) =>
                        change("termsConditions", e.target.value)
                      }
                    />
                  </label>
</div></details>
              </fieldset>
              </div>
              <aside className="document-calculation" ref={calculationRef} aria-label="Live calculation">
                <h3>Live calculation</h3>
                <p className="calculation-hint">Updates as you type. Discounts are applied before GST.</p>
                <div className="calculation-lines">
                  {calculation.items.map((item, index) => (
                    <div className="calculation-line" key={index}>
                      <strong>{item.description}</strong>
                      {item.valid ? <>
                      <span>{item.quantity} × {formatINR(item.unitPrice)} = {formatINR(item.gross)}</span>
                      <span>− {formatINR(item.discount)} line discount</span>
                      <b>{formatINR(item.total)}</b>
                      </> : <span>Check this item's quantity, price and discount.</span>}
                    </div>
                  ))}
                </div>
                <dl className="calculation-totals">
                  <div><dt>Items after line discounts</dt><dd>{summaryAmount(calculation.subtotal)}</dd></div>
                  <div><dt>Overall discount</dt><dd>− {summaryAmount(calculation.discountAmount)}</dd></div>
                  <div><dt>Amount before GST</dt><dd>{summaryAmount(calculation.taxableAmount)}</dd></div>
                  <div><dt>GST ({form.taxPercent || 0}%)</dt><dd>+ {summaryAmount(calculation.taxAmount)}</dd></div>
                  <div className="calculation-grand-total"><dt>Total</dt><dd>{calculation.errors.length ? 'Check amounts' : formatINR(calculation.total)}</dd></div>
                </dl>
                {calculation.errors.length > 0 && <div className="manual-error" role="alert">{calculation.errors.map(message => <p key={message}>{message}</p>)}</div>}
              </aside>
            </div>
            <footer>
              <div className="document-footer-total">
                <strong aria-live="polite" aria-atomic="true">Total: {calculation.errors.length ? 'Check amounts' : formatINR(calculation.total)}</strong>
                <button className="calculation-jump" type="button" onClick={() => calculationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>View calculation</button>
              </div>
              {!readOnly && (
                <button
                  className="btn btn-primary"
                  disabled={saving || calculation.errors.length > 0}
                  type="submit"
                >
                  {saving
                    ? "Saving…"
                    : "Save " + (kind === "orders" ? "order" : "quotation")}
                </button>
              )}
            </footer>
          </form>
        </section>
      </div>
      {addingCustomer && (
        <CustomerForm
          onClose={() => setAddingCustomer(false)}
          onSuccess={(c) => {
            setCustomers((rows) => [...rows, c]);
            change("customerId", c.id);
            setAddingCustomer(false);
          }}
        />
      )}
    </>
  );
}
