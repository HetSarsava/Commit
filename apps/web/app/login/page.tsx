'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';
import { ApiError } from '../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, login } = useAuth();
  const [email, setEmail] = useState('sales@commit.local');
  const [password, setPassword] = useState('Sales123!');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [loading, user, router]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await login(email, password);
      router.replace('/dashboard');
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Unable to sign in. Check the API is running.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <section className="login-brand">
        <div className="brand-mark-row"><div className="brand-mark">AU</div><strong>AMIT UNIFORM</strong></div>
        <div className="login-pitch">
          <h1>One platform for leads, catalogue, billing and dispatch.</h1>
          <p>Sign in to manage your pipeline, catalogue, quotations and orders — all in one place.</p>
          <div className="login-features">
            <div className="login-feature"><span>✓</span> Lead to order, tracked end to end</div>
            <div className="login-feature"><span>◇</span> Products and quotations in one workspace</div>
            <div className="login-feature"><span>⌁</span> Role-aware access with audit events</div>
          </div>
        </div>
        <div className="login-foot">© 2026 Amit Uniform · Ahmedabad, Gujarat · Local demo</div>
      </section>
      <section className="login-form-panel">
        <form className="login-form" onSubmit={submit}>
          <h2>Welcome back</h2>
          <p>Sign in to your Commit workspace</p>
          {error && <div className="form-error" role="alert">{error}</div>}
          <label className="field"><span className="field-label">Email address</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" placeholder="sales@commit.local" required /></label>
          <label className="field"><span className="field-label">Password</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="••••••••" required /></label>
          <button className="btn btn-primary login-submit" type="submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in'}</button>
          <div className="login-note">Access is scoped by role. <strong>Sales</strong> can work the lead-to-order slice; <strong>Admin</strong> can also view settings, audit events and prototype modules.</div>
          <div className="login-demo"><strong>Local demo credentials</strong><br /><code>sales@commit.local</code> / <code>Sales123!</code><br /><code>admin@commit.local</code> / <code>Admin123!</code></div>
        </form>
      </section>
    </div>
  );
}
