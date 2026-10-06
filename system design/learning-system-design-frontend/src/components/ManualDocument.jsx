import { useState, useEffect } from "react";
import api from "../api/client";
import "./ManualCRM.css";
export default function ManualDocument({
  kind = "orders",
  record = null,
  readOnly = false,
  onClose,
  onSuccess,
}) {
  const [customers, setCustomers] = useState([]),
    [search, setSearch] = useState(""),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => ({
    customerId: record?.customerId || "",
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
      (record?.subtotal
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
  const total =
    Math.max(
      0,
      form.items.reduce(
        (sum, i) =>
          sum +
          Math.max(
            0,
            Number(i.quantity || 0) * Number(i.unitPrice || 0) -
              Number(i.discount || 0),
          ),
        0,
      ) - Number(form.discountAmount || 0),
    ) *
    (1 + Number(form.taxPercent || 0) / 100);
  async function save(e) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const r = await api[record ? "put" : "post"](
        "/manual/" + kind + (record ? "/" + record.id : ""),
        form,
      );
      onSuccess(r.data);
    } catch (e) {
      setError(e.response?.data?.error || "Could not save. Please retry.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="manual-overlay">
      <section
        className="manual-dialog"
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
            <fieldset disabled={saving || readOnly}>
              <div className="manual-grid">
                <label>
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
                        onChange={(e) => change("deliveryDate", e.target.value)}
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
                    Item discount (INR)
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={i.discount || 0}
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
                  <label className="manual-full">
                    Item notes
                    <input
                      value={i.customization}
                      onChange={(e) =>
                        itemChange(index, "customization", e.target.value)
                      }
                    />
                  </label>
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
                  Discount (INR)
                  <input
                    type="number"
                    min="0"
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
                    step="0.01"
                    value={form.taxPercent}
                    onChange={(e) => change("taxPercent", e.target.value)}
                  />
                </label>
                <label>
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
                    onChange={(e) => change("termsConditions", e.target.value)}
                  />
                </label>
              </div>
            </fieldset>
          </div>
          <footer>
            <strong>
              Total: INR{" "}
              {total.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </strong>
            {!readOnly && (
              <button
                className="btn btn-primary"
                disabled={saving}
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
  );
}
