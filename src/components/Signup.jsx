import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import EmailVerification from './EmailVerification';

export default function Signup({ onClose, showLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup, authError, setAuthError, isVerifying } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    
    if (password !== passwordConfirm) {
      return setError("Passwords don't match");
    }
    
    try {
      setError('');
      setAuthError('');
      setLoading(true);
      await signup(email, password, displayName);
      // Do not close the modal here - we need to keep it open for verification
      // The component will redirect based on isVerifying state
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // If verification process is active, show the verification component instead
  if (isVerifying) {
    return <EmailVerification onClose={onClose} />;
  }

  return (
    <div className="auth-modal">
      <div className="auth-modal-content">
        <div className="auth-header">
          <h2>Sign Up</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        {error && <div className="auth-error">{error}</div>}
        {authError && <div className="auth-error">{authError}</div>}
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="displayName">Name</label>
            <input 
              type="text" 
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>
          
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
          
          <div className="form-group">
            <label htmlFor="password-confirm">Confirm Password</label>
            <input 
              type="password" 
              id="password-confirm"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              required
            />
          </div>
          
          <button disabled={loading} type="submit" className="auth-button">
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>
        
        <div className="auth-footer">
          Already have an account? 
          <button 
            className="auth-link" 
            onClick={() => {
              setAuthError('');
              showLogin();
            }}
          >
            Log In
          </button>
        </div>
      </div>
    </div>
  );
}