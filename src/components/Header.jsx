import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Login from './Login';
import Signup from './Signup';

export default function Header({ syncToCloud }) {
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const { currentUser, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      setShowDropdown(false);
    } catch (error) {
      console.error("Failed to log out:", error);
    }
  };

  const handleSyncToCloud = () => {
    syncToCloud();
    setShowDropdown(false);
  };

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="header-brand">
          <h2>Immersion Tracker</h2>
        </div>
        
        <div className="header-actions">
          {currentUser ? (
            <div className="user-account">
              <button 
                className="account-button"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <span className="user-initial">
                  {currentUser.displayName ? currentUser.displayName.charAt(0) : currentUser.email.charAt(0)}
                </span>
                <span className="user-name">{currentUser.displayName || currentUser.email.split('@')[0]}</span>
              </button>
              
              {showDropdown && (
                <div className="account-dropdown">
                  <div className="dropdown-email">{currentUser.email}</div>
                  <button onClick={handleSyncToCloud} className="dropdown-item">
                    Sync Videos
                  </button>
                  <button onClick={handleLogout} className="dropdown-item logout">
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="auth-buttons">
              <button 
                className="login-button"
                onClick={() => {
                  setShowLogin(true);
                  setShowSignup(false);
                }}
              >
                Login
              </button>
              <button 
                className="signup-button"
                onClick={() => {
                  setShowSignup(true);
                  setShowLogin(false);
                }}
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      </div>
      
      {showLogin && (
        <Login 
          onClose={() => setShowLogin(false)}
          showSignup={() => {
            setShowLogin(false);
            setShowSignup(true);
          }}
        />
      )}
      
      {showSignup && (
        <Signup 
          onClose={() => setShowSignup(false)}
          showLogin={() => {
            setShowSignup(false);
            setShowLogin(true);
          }}
        />
      )}
    </header>
  );
}