import { FormEvent, useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import type { EmployeeUser, Role } from "../api/types";
import Modal from "../components/Modal";
import Badge from "../components/Badge";
import { formatDate } from "../lib/format";
import { useAuth } from "../context/AuthContext";

const emptyForm = { name: "", email: "", password: "", role: "STAFF" as Role };

const roleTone: Record<Role, "info" | "warning" | "default"> = {
  ADMIN: "warning",
  MANAGER: "info",
  STAFF: "default",
};

export default function Employees() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<EmployeeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setUsers(await api.get<EmployeeUser[]>("/users"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post("/users", form);
      setShowForm(false);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create employee");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(u: EmployeeUser) {
    await api.put(`/users/${u.id}`, { active: !u.active });
    await load();
  }

  async function changeRole(u: EmployeeUser, role: Role) {
    await api.put(`/users/${u.id}`, { role });
    await load();
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Employees</h1>
          <p className="page-subtitle">Manage staff accounts and access levels</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          + Add Employee
        </button>
      </div>

      {loading ? (
        <div className="page-loading">Loading employees&hellip;</div>
      ) : (
        <div className="table-wrap card">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <select value={u.role} disabled={u.id === me?.id} onChange={(e) => changeRole(u, e.target.value as Role)}>
                      <option value="ADMIN">Admin</option>
                      <option value="MANAGER">Manager</option>
                      <option value="STAFF">Staff</option>
                    </select>
                  </td>
                  <td>
                    <Badge tone={u.active ? "success" : "danger"}>{u.active ? "Active" : "Disabled"}</Badge>
                  </td>
                  <td>{formatDate(u.createdAt)}</td>
                  <td className="row-actions">
                    <button className="btn btn-ghost btn-sm" disabled={u.id === me?.id} onClick={() => toggleActive(u)}>
                      {u.active ? "Disable" : "Enable"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <Modal title="Add Employee" onClose={() => setShowForm(false)} width={440}>
          <form onSubmit={handleSubmit} className="form-grid">
            {error && <div className="alert alert-error span-2">{error}</div>}
            <label className="field span-2">
              <span>Full Name</span>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <label className="field span-2">
              <span>Email</span>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </label>
            <label className="field">
              <span>Temporary Password</span>
              <input type="password" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </label>
            <label className="field">
              <span>Role</span>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
                <option value="ADMIN">Admin</option>
                <option value="MANAGER">Manager</option>
                <option value="STAFF">Staff</option>
              </select>
            </label>
            <div className="form-actions span-2">
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Creating…" : "Create Employee"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
