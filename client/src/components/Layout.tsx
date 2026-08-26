import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { to: "/", label: "Dashboard", icon: "📊", end: true },
  { to: "/pos", label: "Sales / POS", icon: "🧾" },
  { to: "/products", label: "Inventory", icon: "🧸" },
  { to: "/orders", label: "Orders", icon: "📦" },
  { to: "/customers", label: "Customers", icon: "🧑‍🤝‍🧑" },
  { to: "/suppliers", label: "Suppliers", icon: "🚚" },
  { to: "/employees", label: "Employees", icon: "🗝️", adminOnly: true },
];

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-emoji">🧸</span>
          <div>
            <div className="brand-title">Toy Box</div>
            <div className="brand-subtitle">Shop Manager</div>
          </div>
        </div>
        <nav className="nav-list">
          {navItems
            .filter((item) => !item.adminOnly || user?.role === "ADMIN")
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="user-avatar">{user?.name?.[0]?.toUpperCase() ?? "?"}</div>
            <div>
              <div className="user-name">{user?.name}</div>
              <div className="user-role">{user?.role}</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-block" onClick={logout}>
            Log out
          </button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
