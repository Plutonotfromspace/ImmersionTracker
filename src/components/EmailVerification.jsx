import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/EmailVerification.css';

export default function EmailVerification({ onClose }) {
  const [emailSent, setEmailSent] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  
  const { 
    resendVerificationEmail, 
    pendingUser, 
    authError, 
    setAuthError,
    cancelVerification 
  } = useAuth();
  
  async function handleResend() {
    try {
      setError('');
      setAuthError('');
      setResendDisabled(true);
      await resendVerificationEmail();
      
      setEmailSent(true);
      
      // Start a countdown for the resend button (60 seconds)
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setResendDisabled(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
    } catch (err) {
      setError(err.message);
      setResendDisabled(false);
    }
  }

  // Handle cancel verification
  const handleCancel = () => {
    if (window.confirm("Are you sure you want to cancel? This will delete your account and you'll need to sign up again.")) {
      cancelVerification().then(() => {
        if (onClose) onClose();
      });
    }
  };

  // Check if the user has verified their email
  useEffect(() => {
    if (pendingUser) {
      const checkVerification = setInterval(() => {
        // Reload the user to check if email is verified
        pendingUser.reload()
          .then(() => {
            if (pendingUser.emailVerified) {
              setVerificationSuccess(true);
              clearInterval(checkVerification);
              
              // Close modal after showing success
              setTimeout(() => {
                if (onClose) onClose();
              }, 2000);
            }
          })
          .catch(err => {
            console.error("Error checking verification status:", err);
          });
      }, 3000); // Check every 3 seconds
      
      return () => clearInterval(checkVerification);
    }
  }, [pendingUser, onClose]);

  // Prevent closing the modal with escape key
  useEffect(() => {
    const handleEscapeKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    
    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, []);

  return (
    <div className="auth-modal verification-modal">
      <div className="auth-modal-content">
        <div className="auth-header">
          <h2>Email Verification</h2>
          {/* Only show close button if verification is successful */}
          {verificationSuccess ? (
            <button className="close-button" onClick={onClose}>×</button>
          ) : (
            <button className="close-button" onClick={handleCancel} title="Cancel verification">×</button>
          )}
        </div>
        
        {verificationSuccess ? (
          <div className="verification-success">
            <div className="success-icon">✓</div>
            <h3>Email Verified Successfully!</h3>
            <p>You can now log in to your account.</p>
          </div>
        ) : (
          <>
            <div className="verification-info">
              <p>A verification link has been sent to <strong>{pendingUser?.email}</strong>.</p>
              <p>Please click the link in the email to verify your address.</p>
              <p className="verification-warning">
                <strong>Important:</strong> You must verify your email before you can access your account.
              </p>
              
              {emailSent && (
                <div className="email-sent-confirmation">
                  <p>✓ Verification email sent!</p>
                  <p>Check your inbox (and spam folder)</p>
                </div>
              )}
            </div>
            
            {error && <div className="auth-error">{error}</div>}
            {authError && <div className="auth-error">{authError}</div>}
            
            <div className="auth-form verification-options">
              <div className="resend-code">
                <p>Didn't receive the email?</p>
                <button 
                  type="button"
                  onClick={handleResend} 
                  disabled={resendDisabled}
                  className="auth-link"
                >
                  {resendDisabled 
                    ? `Resend in ${countdown}s` 
                    : 'Resend verification email'}
                </button>
              </div>
              
              <div className="cancel-verification">
                <button 
                  type="button" 
                  onClick={handleCancel}
                  className="auth-link cancel-link"
                >
                  Cancel signup and start over
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}