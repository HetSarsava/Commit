import { useState } from "react";
import api from "../api/client";
import "./ManualCRM.css";
export default function CustomerForm({ lead = null, onClose, onSuccess }) {
  const [form, setForm] = useState({
    companyName: lead?.companyName || "",
    contactPerson: lead?.contactPerson || "",
    mobile: lead?.mobile || "",
    whatsapp: lead?.whatsapp || "",
    email: lead?.email || "",
    address: lead?.address || "",
    city: lead?.city || "",
    state: lead?.state || "",
  });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function save(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post(
        lead ? "/manual/leads/" + lead.id + "/customer" : "/manual/customers",
        form,
      );
      onSuccess(data.customer);
    } catch (e) {
      setError(
        e.response?.data?.error || "Could not save customer. Please retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="manual-overlay">
      <section
        className="manual-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={lead ? "Turn lead into customer" : "Add customer"}
      >
        <header>
          <h2>{lead ? "Turn lead into customer" : "Add customer"}</h2>
          <button
            type="button"
            className="btn"
            onClick={onClose}
            disabled={busy}
          >
            Close
          </button>
        </header>
        <form onSubmit={save}>
          <div className="manual-body">
            <p>
              Company, contact name and phone are required. Include the country
              code, for example +91. WhatsApp uses the phone number if left
              blank.
            </p>
            {error && (
              <p role="alert" className="manual-error">
                {error}
              </p>
            )}
            <fieldset disabled={busy}>
              <div className="manual-grid">
                {[
                  ["companyName", "Company name"],
                  ["contactPerson", "Contact name"],
                  ["mobile", "Phone number"],
                  ["whatsapp", "WhatsApp number (optional)"],
                  ["email", "Email (optional)"],
                  ["address", "Address (optional)"],
                  ["city", "City (optional)"],
                  ["state", "State (optional)"],
                ].map(([key, label]) => (
                  <label key={key}>
                    {label}
                    <input
                      required={[
                        "companyName",
                        "contactPerson",
                        "mobile",
                      ].includes(key)}
                      type={
                        key === "email"
                          ? "email"
                          : key === "mobile" || key === "whatsapp"
                            ? "tel"
                            : "text"
                      }
                      value={form[key]}
                      maxLength={key === "address" ? 2000 : 254}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, [key]: e.target.value }))
                      }
                    />
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
          <footer>
            <span>
              {lead
                ? "The lead and its existing documents remain linked."
                : "Available in quotation and order customer lists after saving."}
            </span>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "Saving…" : lead ? "Save as customer" : "Save customer"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
