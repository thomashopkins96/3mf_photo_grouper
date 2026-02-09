import { useEffect, useState } from 'react';

interface LoginFormProps {
  onCheckAuth: () => void;
}

export default function LoginForm({ onCheckAuth }: LoginFormProps) {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    onCheckAuth();
    const timer = setTimeout(() => setChecking(false), 500);
    return () => clearTimeout(timer);
  }, [onCheckAuth]);

  const handleLogin = () => {
    window.location.href = '/api/auth/login';
  };

  if (checking) {
    return (
      <div className="login-container">
        <h1>SBA Cloud Storage Management</h1>
        <p>Checking authentication...</p>
      </div>
    );
  }

  return (
    <div className="login-container">
      <h1>SBA Cloud Storage Management</h1>
      <p>Sign in with your Google account to continue</p>
      <button onClick={handleLogin} className="login-button">
        Sign in with Google
      </button>
    </div>
  );
}
