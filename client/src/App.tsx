import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Suppliers from "./pages/Suppliers";
import Customers from "./pages/Customers";
import POS from "./pages/POS";
import Orders from "./pages/Orders";
import Employees from "./pages/Employees";

function ProtectedRoute({ children, roles }: { children: JSX.Element; roles?: Array<"ADMIN" | "MANAGER" | "STAFF"> }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="full-page-loading">Loading&hellip;</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <div className="full-page-loading">Loading&hellip;</div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="pos" element={<POS />} />
        <Route path="products" element={<Products />} />
        <Route path="orders" element={<Orders />} />
        <Route path="customers" element={<Customers />} />
        <Route path="suppliers" element={<Suppliers />} />
        <Route
          path="employees"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <Employees />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
