import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Login({ onClose, showSignup }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, authError, setAuthError } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    
    try {
      setError('');
      setLoading(true);
      setAuthError('');
      await login(email, password);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-modal">
      <div className="auth-modal-content">
        <div className="auth-header">
          <h2>Log In</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        {error && <div className="auth-error">{error}</div>}
        {authError && <div className="auth-error">{authError}</div>}
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input 
              type="email" 
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input 
              type="password" 
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <button disabled={loading} type="submit" className="auth-button">
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>
        
        <div className="auth-footer">
          <p>
            Don't have an account?{' '}
            <button onClick={showSignup} className="auth-link">
              Sign Up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}