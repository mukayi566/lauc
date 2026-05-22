import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import logo from '../assets/logo.png';

const StudentLogin = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { currentUser, userRole } = useAuth();

  // If already logged in as student, redirect
  useEffect(() => {
    if (currentUser && userRole && !loading) {
      if (userRole === 'student') navigate('/student-dashboard', { replace: true });
    }
  }, [currentUser, userRole, navigate, loading]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const getFirebaseErrorMessage = (code) => {
    switch (code) {
      case 'auth/user-not-found': return 'This account does not exist. Please check your email or ID.';
      case 'auth/wrong-password': return 'Incorrect password. Contact admin if you forgot it.';
      case 'auth/invalid-credential': return 'Invalid credentials. Please verify your email/ID and password.';
      case 'auth/invalid-email': return 'Please enter a valid email address.';
      case 'auth/user-disabled': return 'This account has been disabled. Contact support.';
      case 'auth/too-many-requests': return 'Too many failed attempts. Please try again later.';
      default: return 'Login failed. Please check your credentials.';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      let emailToAuth = form.email.trim();

      // Resolve Student ID → email if needed
      if (!emailToAuth.includes('@')) {
        const q = query(collection(db, 'students'), where('id', '==', emailToAuth));
        const snap = await getDocs(q);
        if (!snap.empty) {
          emailToAuth = snap.docs[0].data().email;
        } else {
          const msg = 'Student ID not found. Please use your registered email or correct ID.';
          setError(msg); toast.error(msg); setLoading(false); return;
        }
      }

      const userCredential = await signInWithEmailAndPassword(auth, emailToAuth, form.password);
      const user = userCredential.user;

      // Verify role
      let role = 'student';
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) role = userDoc.data().role || 'student';

      if (role !== 'student') {
        const msg = 'Access Denied: This portal is for students only. Please use the correct portal.';
        setError(msg); toast.error(msg); await auth.signOut(); setLoading(false); return;
      }

      toast.success('Welcome back, Student!');
      navigate('/student-dashboard');
    } catch (err) {
      const msg = getFirebaseErrorMessage(err.code);
      setError(msg); toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Left panel */}
      <div style={{
        flex: '0 0 42%',
        background: 'linear-gradient(160deg, #0d2b5e 0%, #1e3c72 50%, #2a5298 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 48px',
        position: 'relative',
        overflow: 'hidden',
      }}
        className="portal-left-panel"
      >
        {/* Decorative blobs */}
        <div style={{ position: 'absolute', top: -80, right: -80, width: 280, height: 280, borderRadius: '50%', background: 'rgba(245,158,11,0.10)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -60, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255, 255, 255, 1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 36, color: '#f59e0b', backdropFilter: 'blur(8px)' }}>
             <img src={logo} alt="Fairview Logo"/>
          </div>
          <h1 style={{ color: 'white', fontWeight: 800, fontSize: 26, marginBottom: 10, letterSpacing: '-0.02em' }}>Student Portal</h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 1.8, maxWidth: 280 }}>
            Access your academic dashboard results, timetable, fee statements, and more.
          </p>

          <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {['View Exam Results', 'Download Transcripts', 'Check Timetable', 'Fee Statements'].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>
                <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(245,158,11,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className="fas fa-check" style={{ fontSize: 10, color: '#f59e0b' }}></i>
                </span>
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8faff',
        padding: '40px 24px',
      }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: '#0d2b5e', marginBottom: 6 }}>Sign In</h2>
            <p style={{ color: '#64748b', fontSize: 14 }}>Enter your student email or Student ID to continue</p>
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '12px 16px', borderRadius: 10, marginBottom: 20, fontSize: 13, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <i className="fas fa-exclamation-circle" style={{ marginTop: 2, flexShrink: 0 }}></i>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Email / ID */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Student Email or ID</label>
              <div style={{ position: 'relative' }}>
                <i className="fas fa-id-card" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#2a5298', fontSize: 14 }}></i>
                <input
                  id="student-email"
                  type="text"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  placeholder="e.g. student@fairview.edu or STU-001"
                  autoComplete="username"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <i className="fas fa-lock" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#2a5298', fontSize: 14 }}></i>
                <input
                  id="student-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  style={{ ...inputStyle, paddingRight: 44 }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={eyeBtnStyle}>
                  <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
            </div>

            <div style={{ textAlign: 'right', marginBottom: 24 }}>
              <Link to="/forgot-password" style={{ fontSize: 12, color: '#2a5298', fontWeight: 600, textDecoration: 'none' }}>Forgot password?</Link>
            </div>

            <button
              id="student-login-btn"
              type="submit"
              disabled={loading}
              style={submitBtnStyle('#1e3c72', '#2a5298', loading)}
            >
              {loading
                ? <><i className="fas fa-spinner fa-spin"></i> Signing in...</>
                : <><i className="fas fa-sign-in-alt"></i> Sign In to Student Portal</>}
            </button>
          </form>

          <div style={{ marginTop: 28, padding: '20px', background: 'white', borderRadius: 12, border: '1px solid #e2e8f4', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Don't have a student account?</p>
            <Link to="/admissions#apply" style={{ color: '#1e3c72', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
              <i className="fas fa-file-alt" style={{ marginRight: 6 }}></i>Apply Now
            </Link>
          </div>

          <p style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', marginTop: 20 }}>
            Not a student?{' '}
            <Link to="/login" style={{ color: '#2a5298', fontWeight: 600, textDecoration: 'none' }}>Choose a different portal</Link>
          </p>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .portal-left-panel { display: none !important; }
        }
      `}</style>
    </div>
  );
};

const inputStyle = {
  width: '100%',
  padding: '11px 14px 11px 40px',
  border: '1.5px solid #e2e8f4',
  borderRadius: 10,
  fontSize: 14,
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  outline: 'none',
  background: 'white',
  color: '#0f172a',
  transition: 'border-color 0.2s',
};

const eyeBtnStyle = {
  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
  background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer',
  padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
};

const submitBtnStyle = (from, to, loading) => ({
  width: '100%',
  padding: '13px',
  background: `linear-gradient(135deg, ${from}, ${to})`,
  color: 'white',
  border: 'none',
  borderRadius: 10,
  fontWeight: 700,
  fontSize: 15,
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  cursor: loading ? 'not-allowed' : 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  opacity: loading ? 0.8 : 1,
  transition: 'all 0.25s',
  boxShadow: `0 4px 16px ${from}40`,
});

export default StudentLogin;
