import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CompanyProvider } from "./context/CompanyContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/DashboardPrototype";
import Leads from "./pages/LeadsEnhanced";
import Quotations from "./pages/Quotations";
import QuotationDetail from "./pages/QuotationDetail";
import Orders from "./pages/Orders";
import OrderDetail from "./pages/OrderDetail";
import Invoices from "./pages/Invoices";
import InvoiceDetail from "./pages/InvoiceDetail";
import Users from "./pages/Users";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import Proformas from "./pages/ProformaInvoices";
import Dispatch from "./pages/Dispatch";
import Marketing from "./pages/Marketing";
import WhatsApp from "./pages/WhatsAppEnhanced";
function Protected({ children }) {
  const { loading, isAuthenticated } = useAuth();
  if (loading) return <p role="status">Loading…</p>;
  return isAuthenticated ? (
    <Layout>{children}</Layout>
  ) : (
    <Navigate to="/login" replace />
  );
}
function LoginRoute() {
  const { loading, isAuthenticated } = useAuth();
  if (loading) return <p role="status">Loading…</p>;
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />;
}
const pages = [
  ["/dashboard", Dashboard],
  ["/leads", Leads],
  ["/quotations", Quotations],
  ["/quotations/:id", QuotationDetail],
  ["/orders", Orders],
  ["/orders/:id", OrderDetail],
  ["/invoices", Invoices],
  ["/invoices/:id", InvoiceDetail],
  ["/users", Users],
  ["/settings", Settings],
  ["/notifications", Notifications],
  ["/proformas", Proformas],
  ["/dispatch", Dispatch],
  ["/marketing", Marketing],
  ["/whatsapp", WhatsApp],
];
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CompanyProvider>
          <Routes>
            <Route path="/login" element={<LoginRoute />} />
            {pages.map(([path, Page]) => (
              <Route
                key={path}
                path={path}
                element={
                  <Protected>
                    <Page />
                  </Protected>
                }
              />
            ))}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </CompanyProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
