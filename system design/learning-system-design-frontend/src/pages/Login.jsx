import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const Login = () => {
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
          <div className="sq">AU</div>
          <div className="txt">AMIT UNIFORM</div>
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
              <span className="feature-dot">💬</span> WhatsApp automation with AI assistance
            </div>
            <div className="feature-item">
              <span className="feature-dot">🔒</span> Role-based access with 2FA and audit logs
            </div>
          </div>
        </div>

        <div className="brand-foot">© 2026 Amit Uniform · Ahmedabad, Gujarat</div>
      </div>

      {/* Right: Form Panel */}
      <div className="form-panel">
        <div className="form-box">
          <h2>Welcome back</h2>
          <div className="sub">Sign in to your Amit Uniform account</div>

          {(localError || error) && (
            <div className="error-message">
              {localError || error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Email or mobile number</label>
              <input
                type="text"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="admin@example.com"
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
              <span className="forgot">Forgot password?</span>
            </div>

            <button type="submit" className="btn-login" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="divider">
            <span>OR</span>
          </div>

          <button className="otp-btn">📱 Sign in with OTP</button>

          <div className="role-note">
            Signing in as <b>Sales</b>, <b>Accounts</b>, or <b>Production</b>? Your access
            is limited to the modules assigned by your Admin.
          </div>

          <div className="demo-credentials">
            <p><strong>Demo Credentials:</strong></p>
            <p>Admin: admin@example.com / admin123</p>
            <p>Sales: sales1@example.com / sales123</p>
          </div>

          <div className="foot-links">
            Need an account? Ask your <a href="#">Admin to invite you</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
