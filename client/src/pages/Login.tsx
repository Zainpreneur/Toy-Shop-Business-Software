import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@toyshop.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to log in");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-brand">
          <span className="brand-emoji">🧸</span>
          <div>
            <div className="brand-title">Toy Box</div>
            <div className="brand-subtitle">Shop Manager</div>
          </div>
        </div>
        <h2>Welcome back</h2>
        <p className="login-sub">Sign in to manage inventory, sales, and more.</p>

        {error && <div className="alert alert-error">{error}</div>}

        <label className="field">
          <span>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>

        <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </button>

        <div className="login-hint">
          Demo accounts: <code>admin@toyshop.com / admin123</code> (Admin) or{" "}
          <code>staff@toyshop.com / staff123</code> (Staff)
        </div>
      </form>
    </div>
  );
}
