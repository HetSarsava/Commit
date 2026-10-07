import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import CustomerForm from "./CustomerForm";
import ManualDocument from './ManualDocument';
import { MoneySummary } from './BusinessFlow';
import "./ManualCRM.css";
const statusLabel = (s) =>
  ({
    ACCEPTED: "Waiting for delivery",
    SENT: "Sent",
    DELIVERED: "Delivered",
    READ: "Read",
    FAILED: "Not sent",
    UNKNOWN: "Delivery not confirmed",
    SENDING: "Sending",
    RECEIVED: "Received",
  })[s] || s;
export default function CustomerDirectory({ onOpenChat }) {
  const [params] = useSearchParams();
  const [documentKind, setDocumentKind] = useState(null);
  const historyRef = useRef(null);
  const { user } = useAuth(),
    navigate = useNavigate();
  const [rows, setRows] = useState([]),
    [search, setSearch] = useState(""),
    [shared, setShared] = useState(false),
    [adding, setAdding] = useState(false),
    [selected, setSelected] = useState(params.get('customerId')),
    [history, setHistory] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/manual/customer-directory");
      setRows(data);
      setError("");
    } catch {
      setError("Could not load customers. Please retry.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) void load();
    });
    return () => {
      active = false;
    };
  }, [load]);
  useEffect(() => {
    let active = true;
    if (!selected) return;
    api
      .get("/manual/customers/" + selected + "/history")
      .then(({ data }) => {
        if (active) {
          setHistory(data);
          setError("");
        }
      })
      .catch(() => {
        if (active)
          setError("Could not load this customer history. Please retry.");
      });
    return () => {
      active = false;
    };
  }, [selected, rows]);
  useEffect(() => {
    if (historyRef.current && history)
      historyRef.current.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [selected, history]);
  const filtered = rows.filter(
    (c) =>
      (!shared || c.hasDocumentMessages) &&
      [c.companyName, c.contactPerson, c.mobile, c.email]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <section
      id="whatsapp-panel-customers"
      role="tabpanel"
      aria-labelledby="whatsapp-tab-customers"
      className="manual-page customer-directory"
    >
      <div className="manual-top">
        <div>
          <h2>Customers</h2>
          <p>
            Add customers, view their documents and see recorded WhatsApp sends.
          </p>
        </div>
        {["ADMIN", "SALES"].includes(user.role) && (
          <button className="btn btn-primary" onClick={() => setAdding(true)}>
            Add customer
          </button>
        )}
      </div>
      <div className="manual-toolbar">
        <input
          aria-label="Search customers"
          placeholder="Search company, contact or phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          aria-label="Customer sharing filter"
          value={shared ? "shared" : "all"}
          onChange={(e) => setShared(e.target.value === "shared")}
        >
          <option value="all">All customers</option>
          <option value="shared">Customers sent document messages</option>
        </select>
        <button className="btn" onClick={load}>
          Refresh
        </button>
      </div>
      <p>
        Sharing filter checks the latest 1,000 recorded CRM messages. Downloads,
        copied summaries and messages sent outside Commit are not tracked.
      </p>
      {error && (
        <p role="alert" className="manual-error">
          {error}
        </p>
      )}
      <div className={"customer-columns" + (selected ? " has-history" : "")}>
        <div className="manual-list">
          {loading ? (
            <p>Loading customers…</p>
          ) : (
            filtered.map((c) => (
              <article className="manual-card" key={c.id}>
                <h3>{c.companyName}</h3>
                <p>
                  {c.contactPerson} · {c.mobile}
                </p>
                <p>
                  {c.documentCounts.quotations} quotations ·{" "}
                  {c.documentCounts.orders} orders · {c.documentCounts.invoices}{" "}
                  invoices
                </p>
                <button
                  className="btn"
                  onClick={() => {
                    if (selected !== c.id) {
                      setHistory(null);
                      setSelected(c.id);
                    }
                  }}
                >
                  View customer history
                </button>
              </article>
            ))
          )}
          {!loading && !filtered.length && (
            <p>No customers match. Add a customer or change the filter.</p>
          )}
        </div>
        {selected && (
          <article className="manual-card" ref={historyRef}>
            <button
              className="btn"
              onClick={() => {
                setSelected(null);
                setHistory(null);
              }}
            >
              Close history
            </button>
            {!history ? (
              <p>Loading history…</p>
            ) : (
              <>
                <h2>{history.customer.companyName}</h2>
                <div className="manual-actions">
                  {['ADMIN', 'SALES'].includes(user.role) && <>
                    <button className="btn btn-primary" onClick={() => setDocumentKind('quotations')}>Create quotation</button>
                    <button className="btn" onClick={() => setDocumentKind('orders')}>Create order</button>
                    <button className="btn" onClick={async () => { try {
                      const {data} = await api.post('/whatsapp/conversations', {phoneNumber: history.customer.whatsapp || history.customer.mobile});
                      onOpenChat?.(data);
                    } catch (e) { setError(e.response?.data?.error || 'Could not open chat.'); } }}>Open WhatsApp chat</button>
                  </>}
                </div>
                <MoneySummary invoice={history.documents.invoices.reduce((s, i) => ({total: s.total + Number(i.total || 0), amountPaid: s.amountPaid + Number(i.amountPaid || 0), balanceDue: s.balanceDue + Number(i.balanceDue || 0)}), {total: 0, amountPaid: 0, balanceDue: 0})} />
                <p>
                  Saved documents are listed below. WhatsApp delivery is shown
                  separately in message history.
                </p>
                <p>
                  {history.customer.contactPerson} · {history.customer.mobile}
                </p>
                {history.customer.leadId && (
                  <button
                    className="btn"
                    onClick={() =>
                      navigate(
                        "/leads?leadId=" +
                          encodeURIComponent(history.customer.leadId),
                      )
                    }
                  >
                    View source lead
                  </button>
                )}
                {Object.entries(history.documents).map(([kind, docs]) => (
                  <section className="manual-section" key={kind}>
                    <h3>{kind.charAt(0).toUpperCase() + kind.slice(1)}</h3>
                    {docs.length ? (
                      docs.map((d) => (
                        <div className="customer-document" key={d.id}>
                          <button
                            className="btn"
                            onClick={() => navigate("/" + kind + "/" + d.id)}
                          >
                            {d.number}
                          </button>
                          <span>
                            {d.status} · INR{" "}
                            {Number(d.total || 0).toLocaleString("en-IN")}
                          </span>
                          {kind === 'invoices' && d.balanceDue > 0 && <button className="btn" onClick={() => navigate('/invoices/' + d.id + '?payment=1')}>Record payment</button>}
                        </div>
                      ))
                    ) : (
                      <p>No {kind} saved yet.</p>
                    )}
                  </section>
                ))}
                <section className="manual-section">
                  <h3>WhatsApp message history</h3>
                  <p>
                    Up to 500 recent messages per linked chat. Status shows what
                    the CRM recorded.
                  </p>
                  {history.messages.length ? (
                    history.messages.map((m) => (
                      <div className="customer-message" key={m.id}>
                        <strong>
                          {m.direction === "OUTGOING" ? "You" : "Customer"} ·{" "}
                          {statusLabel(m.status)}
                        </strong>
                        <p>{m.message}</p>
                        <small>
                          {new Date(m.timestamp).toLocaleString("en-IN")} ·{" "}
                          {m.messageType?.replaceAll("_", " ")}
                        </small>
                      </div>
                    ))
                  ) : (
                    <p>No recorded WhatsApp messages for this customer.</p>
                  )}
                </section>
              </>
            )}
          </article>
        )}
      </div>
      {adding && (
        <CustomerForm
          onClose={() => setAdding(false)}
          onSuccess={() => {
            setAdding(false);
            void load();
          }}
        />
      )}
      {documentKind && history && <ManualDocument kind={documentKind} initialCustomerId={history.customer.id} onClose={() => setDocumentKind(null)} onSuccess={r => navigate('/' + documentKind + '/' + (r.quotation || r.order).id)} />}
    </section>
  );
}
