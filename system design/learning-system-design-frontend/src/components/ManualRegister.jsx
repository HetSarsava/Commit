import { useState, useEffect, useCallback } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useSearchParams, useNavigate } from 'react-router-dom';
import "./ManualCRM.css";
const today = () => new Date().toISOString().slice(0, 10);
const configs = {
  dispatches: {
    title: "Dispatch",
    subtitle: "Record shipments and delivery updates manually.",
    create: "New dispatch",
    fields: [
      ["orderId", "Order", "order"],
      ["courierName", "Courier"],
      ["trackingNumber", "Tracking number"],
      ["address", "Delivery address", "textarea"],
      ["dispatchDate", "Dispatch date", "date"],
      ["expectedDeliveryDate", "Expected delivery date", "date"],
      ["status", "Delivery status", "status"],
      ["actualDeliveryDate", "Delivered on", "date"],
      ["notes", "Notes", "textarea"],
    ],
  },
  marketing: {
    title: "Marketing",
    subtitle:
      "Record campaign costs and results yourself. No ad account connection is required.",
    create: "New campaign",
    fields: [
      ["name", "Campaign name"],
      ["platform", "Channel"],
      ["budget", "Budget (INR)", "number"],
      ["spent", "Spent so far (INR)", "number"],
      ["manualLeads", "Leads received", "number"],
      ["manualRevenue", "Order value brought in (INR)", "number"],
      ["startDate", "Start date", "date"],
      ["endDate", "End date", "date"],
      ["status", "Status", "status"],
      ["description", "Notes", "textarea"],
    ],
  },
};
export default function ManualRegister({ kind }) {
  const [params] = useSearchParams(), navigate = useNavigate();
  const orderId = kind === 'dispatches' ? params.get('orderId') : null;
  const c = configs[kind],
    { user } = useAuth();
  const [rows, setRows] = useState([]),
    [orders, setOrders] = useState([]),
    [search, setSearch] = useState(""),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [form, setForm] = useState(null),
    [selected, setSelected] = useState(null),
    [saving, setSaving] = useState(false),
    [formError, setFormError] = useState("");
  const canEdit = (
    kind === "marketing"
      ? ["ADMIN", "MARKETING"]
      : ["ADMIN", "SALES", "PRODUCTION"]
  ).includes(user.role);
  const load = useCallback(async () => {
    try {
      setError("");
      setRows(
        (await api.get("/manual/" + kind)).data.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
        ),
      );
      if (kind === "dispatches")
        setOrders(
          (await api.get("/orders", { params: { limit: 100 } })).data.orders,
        );
    } catch {
      setError("Could not load records. Please retry.");
    } finally {
      setLoading(false);
    }
  }, [kind]);
  useEffect(() => {
    load();
  }, [load]);
  const open = (record = null) => {
    setSelected(record);
    setFormError("");
    setForm(
      record
        ? {
            ...record,
            address: record.deliveryAddress?.street || "",
            dispatchDate: record.dispatchDate?.slice(0, 10) || "",
            expectedDeliveryDate:
              record.expectedDeliveryDate?.slice(0, 10) || "",
            actualDeliveryDate: record.actualDeliveryDate?.slice(0, 10) || "",
            startDate: record.startDate?.slice(0, 10) || "",
            endDate: record.endDate?.slice(0, 10) || "",
          }
        : kind === "dispatches"
          ? {
              orderId: orderId || "",
              courierName: "",
              trackingNumber: "",
              address: "",
              dispatchDate: today(),
              expectedDeliveryDate: "",
              actualDeliveryDate: "",
              notes: "",
              status: "DISPATCHED",
            }
          : {
              name: "",
              platform: "",
              budget: 0,
              spent: 0,
              manualLeads: 0,
              manualRevenue: 0,
              startDate: today(),
              endDate: "",
              status: "ACTIVE",
              description: "",
            },
    );
  };
  async function save(e) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setFormError("");
    try {
      await api[selected ? "put" : "post"](
        "/manual/" + kind + (selected ? "/" + selected.id : ""),
        form,
      );
      setForm(null);
      await load();
    } catch (e) {
      setFormError(e.response?.data?.error || "Could not save. Please retry.");
    } finally {
      setSaving(false);
    }
  }
  const customerName = (r) =>
    r.customer?.companyName ||
    orders.find((o) => o.id === r.orderId)?.customer?.companyName ||
    "Customer";
  const eligible = orders.filter(
    (o) =>
      ["CONFIRMED", "IN_PRODUCTION", "READY"].includes(o.status) &&
      !rows.some((r) => r.orderId === o.id),
  );
  return (
    <main className="manual-page">
      {orderId && <div className="manual-card"><p>Delivery for {orders.find(o => o.id === orderId)?.orderNumber || 'this order'}</p><div className="manual-actions"><button className="btn" onClick={() => navigate('/orders/' + orderId)}>Back to order</button><button className="btn" onClick={() => navigate('/dispatch')}>All deliveries</button>{canEdit && !loading && <button className="btn btn-primary" onClick={() => open(rows.find(r => r.orderId === orderId) || null)}>{rows.some(r => r.orderId === orderId) ? 'Update delivery' : 'Record dispatch'}</button>}</div></div>}
      <div className="manual-top">
        <div>
          <h1>{c.title}</h1>
          <p>{c.subtitle}</p>
        </div>
        {canEdit && !orderId && (
          <button className="btn btn-primary" onClick={() => open()}>
            {c.create}
          </button>
        )}
      </div>
      <div className="manual-toolbar">
        <input
          aria-label={"Search " + c.title}
          placeholder={
            kind === "marketing"
              ? "Search campaign or channel"
              : "Search customer, courier or tracking number"
          }
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {error && (
        <p role="alert">
          {error}
          <button className="btn" onClick={load}>
            Retry
          </button>
        </p>
      )}
      {loading ? (
        <p>Loading…</p>
      ) : (
        <div className="manual-list">
          {rows
            .filter(r => !orderId || r.orderId === orderId)
            .filter((r) =>
              (kind === "marketing"
                ? r.name + " " + r.platform
                : r.dispatchNumber +
                  " " +
                  customerName(r) +
                  " " +
                  r.trackingNumber +
                  " " +
                  r.courierName
              )
                .toLowerCase()
                .includes(search.toLowerCase()),
            )
            .map((r) => (
              <article className="manual-card" key={r.id}>
                <h2>
                  {kind === "marketing"
                    ? r.name
                    : r.dispatchNumber + " · " + customerName(r)}
                </h2>
                <p className="manual-status">{r.status.replaceAll("_", " ")}</p>
                {kind === "marketing" ? (
                  <>
                    <p>
                      {r.platform || "Channel not set"} · Budget: INR{" "}
                      {Number(r.budget || 0).toLocaleString("en-IN")}
                    </p>
                    <p>
                      Spent: INR {Number(r.spent || 0).toLocaleString("en-IN")}{" "}
                      · Manually entered leads: {r.manualLeads ?? "Not entered"}{" "}
                      · Manually entered order value:{" "}
                      {r.manualRevenue === undefined
                        ? "Not entered"
                        : "INR " +
                          Number(r.manualRevenue).toLocaleString("en-IN")}
                    </p>
                    <p>
                      Sales return:{" "}
                      {r.manualRevenue !== undefined && Number(r.spent) > 0
                        ? (
                            ((Number(r.manualRevenue) - Number(r.spent)) *
                              100) /
                            Number(r.spent)
                          ).toFixed(1) + "%"
                        : "Not available"}{" "}
                      · Calculated from your entries; this is not profit.
                    </p>
                    <p>{r.description}</p>
                  </>
                ) : (
                  <>
                    <p>
                      {r.order?.orderNumber} · {r.courierName} · Tracking:{" "}
                      {r.trackingNumber}
                    </p>
                    <p>
                      Dispatched:{" "}
                      {new Date(r.dispatchDate).toLocaleDateString("en-IN")} ·
                      Expected:{" "}
                      {r.expectedDeliveryDate
                        ? new Date(r.expectedDeliveryDate).toLocaleDateString(
                            "en-IN",
                          )
                        : "Not set"}
                    </p>
                    <p>{r.deliveryAddress?.street}</p>
                    <p>{r.notes}</p>
                  </>
                )}
                {kind === "dispatches" && <button className="btn" onClick={() => navigate("/orders/" + r.orderId)}>View order</button>}
                {canEdit && (
                  <button className="btn" onClick={() => open(r)}>
                    Edit {kind === "marketing" ? "campaign" : "dispatch"}
                  </button>
                )}
              </article>
            ))}
          {!rows.length && (
            <p className="manual-empty">
              No records yet. Add your first entry.
            </p>
          )}
        </div>
      )}
      {form && (
        <div className="manual-overlay">
          <section
            className="manual-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={selected ? "Edit " + c.title : c.create}
          >
            <header>
              <h2>{selected ? "Edit " + c.title : c.create}</h2>
              <button
                className="btn"
                type="button"
                onClick={() => setForm(null)}
              >
                Close
              </button>
            </header>
            <form onSubmit={save}>
              <div className="manual-body">
                {formError && (
                  <p role="alert" className="manual-error">
                    {formError}
                  </p>
                )}
                {kind === "dispatches" && !selected && !eligible.length && (
                  <p>
                    No eligible orders. Confirm an order first. Cancelled,
                    pending and already dispatched orders are excluded.
                  </p>
                )}
                <fieldset disabled={saving}>
                  <div className="manual-grid">
                    {c.fields
                      .filter(
                        ([key]) =>
                          kind !== "dispatches" ||
                          (selected
                            ? ![
                                "orderId",
                                "dispatchDate",
                                "expectedDeliveryDate",
                              ].includes(key)
                            : !["status", "actualDeliveryDate"].includes(key)),
                      )
                      .map(([key, label, type]) => (
                        <label key={key}>
                          {label}
                          {type === "order" ? (
                            <select
                              required
                              value={form[key] || ""}
                              onChange={(e) => {
                                const order = orders.find(
                                  (o) => o.id === e.target.value,
                                );
                                setForm((s) => ({
                                  ...s,
                                  orderId: e.target.value,
                                  address:
                                    (typeof order?.customer?.address ===
                                    "string"
                                      ? order.customer.address
                                      : "") ||
                                    s.address ||
                                    "",
                                }));
                              }}
                            >
                              <option value="">Choose order</option>
                              {eligible.map((o) => (
                                <option key={o.id} value={o.id}>
                                  {o.orderNumber} · {o.customer?.companyName}
                                </option>
                              ))}
                            </select>
                          ) : type === "status" ? (
                            <select
                              value={form[key]}
                              onChange={(e) =>
                                setForm((s) => ({
                                  ...s,
                                  [key]: e.target.value,
                                }))
                              }
                            >
                              {(kind === "marketing"
                                ? ["ACTIVE", "PAUSED", "COMPLETED"]
                                : ["DISPATCHED", "IN_TRANSIT", "DELIVERED"]
                              ).map((v) => (
                                <option value={v} key={v}>
                                  {v.replaceAll("_", " ")}
                                </option>
                              ))}
                            </select>
                          ) : type === "textarea" ? (
                            <textarea
                              required={key === "address"}
                              value={form[key] || ""}
                              onChange={(e) =>
                                setForm((s) => ({
                                  ...s,
                                  [key]: e.target.value,
                                }))
                              }
                            />
                          ) : (
                            <input
                              type={type || "text"}
                              required={
                                [
                                  "name",
                                  "courierName",
                                  "trackingNumber",
                                  "dispatchDate",
                                  "startDate",
                                ].includes(key) ||
                                (key === "actualDeliveryDate" &&
                                  form.status === "DELIVERED")
                              }
                              min={type === "number" ? 0 : undefined}
                              step={
                                type === "number"
                                  ? key === "manualLeads"
                                    ? 1
                                    : "0.01"
                                  : undefined
                              }
                              value={form[key] ?? ""}
                              onChange={(e) =>
                                setForm((s) => ({
                                  ...s,
                                  [key]: e.target.value,
                                }))
                              }
                            />
                          )}
                        </label>
                      ))}
                  </div>
                </fieldset>
              </div>
              <footer>
                <span>
                  {kind === "marketing"
                    ? "Enter cumulative totals, not daily increments."
                    : "One whole-order dispatch per order."}
                </span>
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={
                    saving ||
                    (kind === "dispatches" && !selected && !eligible.length)
                  }
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
