import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ordersAPI } from "../api/orders";
import { invoicesAPI } from "../api/invoices";
import { whatsappAPI } from "../api/whatsapp";
import { useAuth } from "../context/AuthContext";
import ManualDocument from "../components/ManualDocument";
import "../components/ManualCRM.css";
export default function OrderDetail() {
  const { id } = useParams(),
    navigate = useNavigate(),
    { user } = useAuth();
  const [order, setOrder] = useState(null),
    [error, setError] = useState(""),
    [edit, setEdit] = useState(false),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    try {
      setOrder((await ordersAPI.getOrder(id)).order);
    } catch {
      setError("Could not load this order.");
    }
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);
  async function invoice() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (order.invoice) {
        await invoicesAPI.syncFromOrder(order.invoice.id);
        await load();
      } else {
        const r = await invoicesAPI.createInvoiceFromOrder(id);
        navigate("/invoices/" + r.invoice.id);
      }
    } catch (e) {
      setError(e.response?.data?.error || "Could not save invoice.");
    } finally {
      setBusy(false);
    }
  }
  async function send() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await whatsappAPI.sendOrderConfirmation(id);
      setNotice("Message submitted. Check WhatsApp for its delivery status.");
    } catch (e) {
      setError(e.response?.data?.error || "Message was not sent.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="manual-page">
      {error && (
        <p role="alert" className="manual-error">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {order ? (
        <>
          <div className="manual-top">
            <div>
              <h1>{order.orderNumber}</h1>
              <p>
                {order.customer?.companyName} ·{" "}
                {order.status === "IN_PRODUCTION"
                  ? "In progress"
                  : order.status.replaceAll("_", " ")}
              </p>
            </div>
            <button className="btn" onClick={() => navigate("/orders")}>
              Back to orders
            </button>
          </div>
          <article className="manual-card">
            <p>
              Delivery:{" "}
              {order.deliveryDate
                ? new Date(order.deliveryDate).toLocaleDateString("en-IN")
                : "Not set"}
            </p>
            {order.items.map((i) => (
              <p key={i.id}>
                <strong>{i.description || i.product?.name || "Item"}</strong> ·{" "}
                {i.quantity} × INR {Number(i.unitPrice).toLocaleString("en-IN")}{" "}
                = INR {Number(i.total).toLocaleString("en-IN")}
              </p>
            ))}
            <hr />
            <p>
              Discount: INR{" "}
              {Number(order.discountAmount || 0).toLocaleString("en-IN")} · GST:
              INR {Number(order.taxAmount).toLocaleString("en-IN")}
            </p>
            <h2>Total: INR {Number(order.total).toLocaleString("en-IN")}</h2>
            <p>
              Advance: INR{" "}
              {Number(order.advanceAmount || 0).toLocaleString("en-IN")}
            </p>
            <p style={{ whiteSpace: "pre-wrap" }}>{order.notes}</p>
            <div className="manual-actions">
              {["ADMIN", "SALES"].includes(user.role) && (
                <button className="btn" onClick={() => setEdit(true)}>
                  Edit order
                </button>
              )}
              {order.invoice ? (
                <>
                  <button
                    className="btn"
                    onClick={() => navigate("/invoices/" + order.invoice.id)}
                  >
                    View invoice
                  </button>
                  {order.invoice.needsUpdate && (
                    <button
                      className="btn"
                      disabled={busy || order.invoice.hasPayments}
                      onClick={invoice}
                    >
                      Update existing invoice
                    </button>
                  )}
                </>
              ) : (
                ["ADMIN", "SALES", "ACCOUNTANT"].includes(user.role) && (
                  <button
                    className="btn"
                    disabled={
                      busy || ["PENDING", "CANCELLED"].includes(order.status)
                    }
                    onClick={invoice}
                  >
                    Generate invoice
                  </button>
                )
              )}
              {["ADMIN", "SALES"].includes(user.role) && (
                <button className="btn" disabled={busy} onClick={send}>
                  Send order on WhatsApp
                </button>
              )}
              <button className="btn" onClick={() => window.print()}>
                Print / save PDF
              </button>
            </div>
          </article>
          {edit && (
            <ManualDocument
              record={order}
              onClose={() => setEdit(false)}
              onSuccess={() => {
                setEdit(false);
                load();
              }}
            />
          )}
        </>
      ) : (
        !error && <p>Loading order…</p>
      )}
    </main>
  );
}
