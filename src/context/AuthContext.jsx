import { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
  deleteUser
} from 'firebase/auth';
import { auth } from '../firebase';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [pendingUser, setPendingUser] = useState(null);
  const [requiresVerification, setRequiresVerification] = useState(false);

  function signup(email, password, displayName) {
    return createUserWithEmailAndPassword(auth, email, password)
      .then((result) => {
        // Set display name for the user
        return updateProfile(result.user, {
          displayName: displayName
        }).then(() => {
          // Set this user as pending until verification is complete
          setPendingUser(result.user);
          
          // Send verification email with link
          return sendEmailVerification(result.user);
        });
      })
      .then(() => {
        // Set verification mode to true to show verification component
        setIsVerifying(true);
        // Set this flag to true to indicate verification is required
        setRequiresVerification(true);
        // We keep the user signed in so we can check if they verified their email
      })
      .catch(error => {
        let errorMessage;
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorMessage = 'This email is already in use.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Invalid email address.';
            break;
          case 'auth/weak-password':
            errorMessage = 'Password should be at least 6 characters.';
            break;
          default:
            errorMessage = error.message;
        }
        setAuthError(errorMessage);
        throw new Error(errorMessage);
      });
  }

  function cancelVerification() {
    // Function to handle when user cancels verification process
    if (pendingUser) {
      // Delete the unverified user account
      deleteUser(pendingUser)
        .catch(error => console.error("Error deleting unverified user:", error));
    }
    
    setIsVerifying(false);
    setPendingUser(null);
    setRequiresVerification(false);
    return signOut(auth);
  }

  function resendVerificationEmail() {
    if (!pendingUser) {
      const errorMessage = "No pending user found to verify.";
      setAuthError(errorMessage);
      throw new Error(errorMessage);
    }

    return sendEmailVerification(pendingUser)
      .catch(error => {
        let errorMessage;
        switch (error.code) {
          case 'auth/too-many-requests':
            errorMessage = 'Too many requests. Please try again later.';
            break;
          default:
            errorMessage = error.message;
        }
        setAuthError(errorMessage);
        throw new Error(errorMessage);
      });
  }

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password)
      .then((result) => {
        // Check if user's email is verified
        if (!result.user.emailVerified) {
          // If not verified, send another verification email
          setPendingUser(result.user);
          setIsVerifying(true);
          setRequiresVerification(true);
          return sendEmailVerification(result.user).then(() => {
            throw new Error("Please verify your email before logging in.");
          });
        }
        return result;
      })
      .catch(error => {
        let errorMessage;
        switch (error.code) {
          case 'auth/invalid-email':
            errorMessage = 'Invalid email address.';
            break;
          case 'auth/user-disabled':
            errorMessage = 'This account has been disabled.';
            break;
          case 'auth/user-not-found':
            errorMessage = 'No account found with this email.';
            break;
          case 'auth/wrong-password':
            errorMessage = 'Incorrect password.';
            break;
          default:
            errorMessage = error.message;
        }
        setAuthError(errorMessage);
        throw new Error(errorMessage);
      });
  }

  function logout() {
    return signOut(auth);
  }

  function resetPassword(email) {
    return sendPasswordResetEmail(auth, email)
      .catch(error => {
        let errorMessage;
        switch (error.code) {
          case 'auth/invalid-email':
            errorMessage = 'Invalid email address.';
            break;
          case 'auth/user-not-found':
            errorMessage = 'No account found with this email.';
            break;
          default:
            errorMessage = error.message;
        }
        setAuthError(errorMessage);
        throw new Error(errorMessage);
      });
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // Only set as current user if they're not in verification process
      // and if the user has verified their email
      if (user && !isVerifying) {
        if (user.emailVerified) {
          setCurrentUser(user);
          setRequiresVerification(false);
        } else {
          // If user isn't verified but tries to access the site
          setPendingUser(user);
          setIsVerifying(true);
          setRequiresVerification(true);
          setCurrentUser(null);
        }
      } else if (!isVerifying) {
        setCurrentUser(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, [isVerifying]);

  const value = {
    currentUser,
    pendingUser,
    isVerifying,
    requiresVerification,
    login,
    signup,
    logout,
    resetPassword,
    resendVerificationEmail,
    cancelVerification,
    authError,
    setAuthError,
    setIsVerifying
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}