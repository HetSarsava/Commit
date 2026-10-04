import { useCompany } from '../context/CompanyData';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const Login = () => {
  const company = useCompany();
  const navigate = useNavigate();
  const { login, error } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setLocalError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLocalError('');

    try {
      const result = await login(formData.email, formData.password);

      if (result.success) {
        navigate('/dashboard');
      } else {
        setLocalError(result.error);
      }
    } catch (err) {
      setLocalError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-app">
      {/* Left: Brand Panel */}
      <div className="brand-panel">
        <div className="brand-mark">
          <div className="sq">{company.initials}</div>
          <div className="txt">{company.name}</div>
        </div>

        <div className="brand-mid">
          <h1>One platform for leads, catalogue, billing and dispatch.</h1>
          <p>
            Sign in to manage your pipeline, WhatsApp conversations, quotations,
            production and payments — all in one place.
          </p>

          <div className="feature-list">
            <div className="feature-item">
              <span className="feature-dot">✓</span> Lead to dispatch, tracked end to end
            </div>
            <div className="feature-item">
              <span className="feature-dot"></span> WhatsApp automation with AI assistance
            </div>
            <div className="feature-item">
              <span className="feature-dot"></span> Role-based access with 2FA and audit logs
            </div>
          </div>
        </div>

        <div className="brand-foot">© {new Date().getFullYear()} {company.name}</div>
      </div>

      {/* Right: Form Panel */}
      <div className="form-panel">
        <div className="form-box">
          <h2>Welcome back</h2>
          <div className="sub">Sign in to your {company.name} account</div>

          {(localError || error) && (
            <div className="error-message">
              {localError || error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Work email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="name@yourcompany.com"
                required
                disabled={loading}
              />
            </div>

            <div className="field">
              <label>Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••••"
                required
                disabled={loading}
              />
            </div>

            <div className="row-between">
              <label className="remember">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  disabled={loading}
                />
                Remember me
              </label>
              <span className="forgot" title="Password reset is handled by your administrator">Ask your admin to reset your password</span>
            </div>

            <button type="submit" className="btn-login" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="divider">
            <span>OR</span>
          </div>

          <button type="button" className="otp-btn" disabled title="OTP sign-in is not enabled in this demo"> Sign in with OTP (unavailable)</button>

          <div className="role-note">
            Signing in as <b>Sales</b>, <b>Accounts</b>, or <b>Production</b>? Your access
            is limited to the modules assigned by your Admin.
          </div>

          <div className="demo-credentials">
            <p><strong>Demo Credentials:</strong></p>
            <p>Admin: admin@amituniform.com / admin123</p>
            <p>Sales: ravi@amituniform.com / sales123</p>
            <p>Production: kiran@amituniform.com / production123</p>
          </div>

          <div className="foot-links">
            Need an account? Ask your <span className="invite-note">Admin to invite you</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
