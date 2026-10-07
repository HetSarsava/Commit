import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ordersAPI } from "../api/orders";
import ManualDocument from "../components/ManualDocument";
import { useAuth } from "../context/AuthContext";
import "../components/ManualCRM.css";
export default function Orders() {
  const [orders, setOrders] = useState([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [creating, setCreating] = useState(false);
  const navigate = useNavigate(),
    { user } = useAuth();
  const load = useCallback(async () => {
    try {
      setError("");
      const r = await ordersAPI.getOrders({ limit: 100 });
      setOrders(r.orders);
    } catch {
      setError("Could not load orders. Please retry.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  return (
    <main className="manual-page">
      <div className="manual-top">
        <div>
          <h1>Orders</h1>
          <p>Enter customer orders and update their progress manually.</p>
        </div>
        {["ADMIN", "SALES"].includes(user.role) && (
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            New order
          </button>
        )}
      </div>
      <div className="manual-toolbar">
        <input
          aria-label="Search orders"
          placeholder="Search customer or order number"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          aria-label="Order status filter"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          {[
            "PENDING",
            "CONFIRMED",
            "IN_PRODUCTION",
            "READY",
            "DISPATCHED",
            "COMPLETED",
            "CANCELLED",
          ].map((s) => (
            <option key={s} value={s}>
              {s === "IN_PRODUCTION" ? "In progress" : s.replaceAll("_", " ")}
            </option>
          ))}
        </select>
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
        <p>Loading orders…</p>
      ) : (
        <div className="manual-list">
          {orders
            .filter(
              (o) =>
                (!status || (o.status === "DELIVERED" ? "COMPLETED" : o.status) === status) &&
                (o.orderNumber + " " + o.customer?.companyName)
                  .toLowerCase()
                  .includes(search.toLowerCase()),
            )
            .map((o) => (
              <article className="manual-card" key={o.id}>
                <h2>{o.orderNumber}</h2>
                <p>{o.customer?.companyName}</p>
                <p className="manual-status">
                  {o.status === "IN_PRODUCTION"
                    ? "In progress"
                    : (o.status === "DELIVERED" ? "Completed" : o.status.replaceAll("_", " "))}{" "}
                  · Delivery:{" "}
                  {o.deliveryDate
                    ? new Date(o.deliveryDate).toLocaleDateString("en-IN")
                    : "Not set"}
                </p>
                <strong>INR {Number(o.total).toLocaleString("en-IN")}</strong>
                <div className="manual-actions">
                  <button
                    className="btn"
                    onClick={() => navigate("/orders/" + o.id)}
                  >
                    Open order
                  </button>
                </div>
              </article>
            ))}
          {!orders.length && (
            <p className="manual-empty">
              No orders yet. Add your first customer order.
            </p>
          )}
        </div>
      )}
      {creating && (
        <ManualDocument
          onClose={() => setCreating(false)}
          onSuccess={() => {
            setCreating(false);
            load();
          }}
        />
      )}
    </main>
  );
}
