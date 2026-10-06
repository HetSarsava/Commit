import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ordersAPI } from "../api/orders";
import { useAuth } from "../context/AuthContext";
import "../components/ManualCRM.css";
export default function Dashboard() {
  const { user } = useAuth(),
    navigate = useNavigate();
  const [orders, setOrders] = useState([]),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    ordersAPI
      .getOrders({ limit: 100 })
      .then((r) => active && setOrders(r.orders))
      .catch(
        () =>
          active &&
          setError("Orders are unavailable. Please open Orders to retry."),
      );
    return () => {
      active = false;
    };
  }, []);
  return (
    <main className="manual-page">
      <div className="manual-top">
        <div>
          <h1>Business overview</h1>
          <p>A simpler CRM for customers, quotations, orders and delivery.</p>
        </div>
      </div>
      {error && <p role="alert">{error}</p>}
      <div className="manual-grid">
        {[
          [
            "Pending orders",
            orders.filter((o) => o.status === "PENDING").length,
          ],
          [
            "Open orders",
            orders.filter((o) => !["COMPLETED", "DELIVERED", "CANCELLED"].includes(o.status))
              .length,
          ],
        ].map(([label, count]) => (
          <article className="manual-card" key={label}>
            <h2>{label}</h2>
            <strong>{count}</strong>
            <p>From the latest 100 orders you can access.</p>
            <button className="btn" onClick={() => navigate("/orders")}>
              View orders
            </button>
          </article>
        ))}
      </div>
      <div className="manual-actions">
        {[
          ["Leads", "/leads"],
          ["Quotations", "/quotations"],
          ["Orders", "/orders"],
          ["Invoices", "/invoices"],
          ...(["ADMIN", "SALES", "MARKETING"].includes(user.role)
            ? [["WhatsApp", "/whatsapp"]]
            : []),
        ].map(([label, path]) => (
          <button className="btn" key={path} onClick={() => navigate(path)}>
            {label}
          </button>
        ))}
      </div>
    </main>
  );
}
