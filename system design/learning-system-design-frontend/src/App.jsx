import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import DashboardPrototype from './pages/DashboardPrototype';
import LeadsEnhanced from './pages/LeadsEnhanced';
import Products from './pages/Products';
import Quotations from './pages/Quotations';
import QuotationDetail from './pages/QuotationDetail';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Invoices from './pages/Invoices';
import InvoiceDetail from './pages/InvoiceDetail';
import Production from './pages/Production';
import Reports from './pages/Reports';
import Users from './pages/Users';
import ActivityLogs from './pages/ActivityLogs';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';
import Inventory from './pages/Inventory';
import PurchaseOrders from './pages/PurchaseOrders';
import Catalogues from './pages/Catalogues';
import ProformaInvoices from './pages/ProformaInvoices';
import Dispatch from './pages/Dispatch';
import Marketing from './pages/Marketing';
// NOTE: './pages/WhatsApp' is deliberately NOT imported. It is an unrouted legacy
// page, and importing it pulled WhatsApp.css into the bundle, where its unscoped
// rules (e.g. `.whatsapp-tabs .tab`) silently overrode the live WhatsApp page.
import WhatsAppEnhanced from './pages/WhatsAppEnhanced';

// Protected Route Component with Layout
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Wrap protected routes with Layout (sidebar)
  return <Layout>{children}</Layout>;
};

// Public Route Component (redirect if already logged in)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return !isAuthenticated ? children : <Navigate to="/dashboard" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />

          {/* Protected Routes - All wrapped with Layout */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPrototype />
              </ProtectedRoute>
            }
          />

          <Route
            path="/leads"
            element={
              <ProtectedRoute>
                <LeadsEnhanced />
              </ProtectedRoute>
            }
          />

          <Route
            path="/products"
            element={
              <ProtectedRoute>
                <Products />
              </ProtectedRoute>
            }
          />

          <Route
            path="/quotations"
            element={
              <ProtectedRoute>
                <Quotations />
              </ProtectedRoute>
            }
          />

          <Route
            path="/quotations/:id"
            element={
              <ProtectedRoute>
                <QuotationDetail />
              </ProtectedRoute>
            }
          />

          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <Orders />
              </ProtectedRoute>
            }
          />

          <Route
            path="/orders/:id"
            element={
              <ProtectedRoute>
                <OrderDetail />
              </ProtectedRoute>
            }
          />

          <Route
            path="/invoices"
            element={
              <ProtectedRoute>
                <Invoices />
              </ProtectedRoute>
            }
          />

          <Route
            path="/invoices/:id"
            element={
              <ProtectedRoute>
                <InvoiceDetail />
              </ProtectedRoute>
            }
          />

          <Route
            path="/production"
            element={
              <ProtectedRoute>
                <Production />
              </ProtectedRoute>
            }
          />

          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            }
          />

          <Route
            path="/users"
            element={
              <ProtectedRoute>
                <Users />
              </ProtectedRoute>
            }
          />

          <Route
            path="/activity-logs"
            element={
              <ProtectedRoute>
                <ActivityLogs />
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />

          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            }
          />

          <Route
            path="/inventory"
            element={
              <ProtectedRoute>
                <Inventory />
              </ProtectedRoute>
            }
          />

          <Route
            path="/purchase"
            element={
              <ProtectedRoute>
                <PurchaseOrders />
              </ProtectedRoute>
            }
          />

          <Route
            path="/catalogues"
            element={
              <ProtectedRoute>
                <Catalogues />
              </ProtectedRoute>
            }
          />

          <Route
            path="/proformas"
            element={
              <ProtectedRoute>
                <ProformaInvoices />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dispatch"
            element={
              <ProtectedRoute>
                <Dispatch />
              </ProtectedRoute>
            }
          />

          <Route
            path="/marketing"
            element={
              <ProtectedRoute>
                <Marketing />
              </ProtectedRoute>
            }
          />

          <Route
            path="/whatsapp"
            element={
              <ProtectedRoute>
                <WhatsAppEnhanced />
              </ProtectedRoute>
            }
          />

          {/* Default Route */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* 404 */}
          <Route path="*" element={<div>404 - Page Not Found</div>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
