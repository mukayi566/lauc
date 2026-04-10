import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { resetPassword } = useAuth();

  const getFirebaseErrorMessage = (code) => {
    switch (code) {
      case 'auth/user-not-found':
        return 'No account found with this email address.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/too-many-requests':
        return 'Too many requests. Please try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your internet connection.';
      default:
        return 'Failed to send reset email. Please try again.';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      await resetPassword(email);
      const msg = 'A password reset link has been sent to your email. Check your inbox and spam folder.';
      setMessage(msg);
      toast.success(msg);
    } catch (err) {
      const msg = getFirebaseErrorMessage(err.code);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <section className="hero" style={{ padding: '80px 20px 60px', minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
        <div style={{ width: '100%' }}>
          <div style={{
            maxWidth: 440,
            margin: '0 auto',
            background: 'white',
            borderRadius: 18,
            padding: '44px 40px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            position: 'relative',
            zIndex: 2,
          }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ fontSize: 48, color: '#1e3c72', marginBottom: 10 }}>
                <i className="fas fa-key"></i>
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: '#1e3c72', margin: 0 }}>Forgot Password</h2>
              <p style={{ color: '#666', fontSize: 14, marginTop: 6 }}>Enter your email to receive a reset link</p>
            </div>

            {error && (
              <div className="alert alert-error" style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: '10px', background: '#fff5f5', color: '#e53e3e', padding: '12px', borderRadius: '8px', fontSize: '14px', border: '1px solid #fed7d7' }}>
                <i className="fas fa-exclamation-circle"></i> {error}
              </div>
            )}

            {message && (
              <div className="alert alert-success" style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: '10px', background: '#f0fff4', color: '#38a169', padding: '12px', borderRadius: '8px', fontSize: '14px', border: '1px solid #c6f6d5' }}>
                <i className="fas fa-check-circle"></i> {message}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: 24 }}>
                <label htmlFor="reset-email" style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#333' }}>Email Address</label>
                <div style={{ position: 'relative' }}>
                  <i className="fas fa-envelope" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#2a5298', fontSize: 14 }}></i>
                  <input
                    type="email"
                    id="reset-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Enter your registered email"
                    style={{ 
                      width: '100%',
                      padding: '12px 14px 12px 38px',
                      borderRadius: '8px',
                      border: '1px solid #ddd',
                      fontSize: '15px',
                      outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '13px',
                  background: 'linear-gradient(135deg, #1e3c72, #2a5298)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  transition: 'all 0.3s',
                  opacity: loading ? 0.8 : 1,
                }}>
                {loading
                  ? <><i className="fas fa-spinner fa-spin"></i> Sending...</>
                  : <><i className="fas fa-paper-plane"></i> Send Reset Link</>}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: 24, paddingTop: 20, borderTop: '1px solid #f0f0f0' }}>
              <p style={{ fontSize: 14, color: '#666' }}>
                Remember your password?{' '}
                <Link to="/login" style={{ color: '#2a5298', fontWeight: 700, textDecoration: 'none' }}>
                  Back to Login
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default ForgotPassword;
