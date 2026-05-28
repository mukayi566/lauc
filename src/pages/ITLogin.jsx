import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import logo from '../assets/logo.png';

const ITLogin = () => {
    const [view, setView] = useState('login');
    const [form, setForm] = useState({ email: '', password: '' });
    const [resetEmail, setResetEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const navigate = useNavigate();
    const { currentUser, userRole, resetPassword } = useAuth();

    useEffect(() => {
        if (currentUser && userRole && !loading && view === 'login') {
            if (userRole === 'it') navigate('/it-dashboard', { replace: true });
        }
    }, [currentUser, userRole, navigate, loading, view]);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setError('');
    };

    const getFirebaseErrorMessage = (code) => {
        switch (code) {
            case 'auth/user-not-found': return 'This account does not exist.';
            case 'auth/wrong-password': return 'Incorrect password.';
            case 'auth/invalid-credential': return 'Invalid credentials. Please verify your email and password.';
            case 'auth/invalid-email': return 'Please enter a valid email address.';
            case 'auth/user-disabled': return 'This account has been disabled.';
            case 'auth/too-many-requests': return 'Too many failed attempts. Please try again later.';
            default: return 'Login failed. Please try again.';
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (!resetEmail) return;
        setLoading(true);
        setError('');
        setSuccessMsg('');
        try {
            await resetPassword(resetEmail);
            setSuccessMsg('Reset link sent to your registered email!');
            toast.success('Reset email sent!');
        } catch (err) {
            setError(getFirebaseErrorMessage(err.code));
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const emailToAuth = form.email.trim();
            const userCredential = await signInWithEmailAndPassword(auth, emailToAuth, form.password);
            const user = userCredential.user;

            const userDoc = await getDoc(doc(db, 'users', user.uid));
            let role = null;
            if (userDoc.exists()) role = userDoc.data().role;

            if (role !== 'it') {
                const msg = 'Access Denied: This portal is for IT Department staff only.';
                setError(msg); toast.error(msg); await auth.signOut(); setLoading(false); return;
            }

            toast.success('System Administrator Authenticated');
            navigate('/it-dashboard');
        } catch (err) {
            const msg = getFirebaseErrorMessage(err.code);
            setError(msg); toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <div
                className="portal-left-panel"
                style={{
                    flex: '0 0 42%',
                    background: 'linear-gradient(160deg, #4c1d95 0%, #5b21b6 50%, #6d28d9 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '40px 48px',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                <div style={{ position: 'absolute', top: -80, right: -80, width: 280, height: 280, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', bottom: -60, left: -60, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

                <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
                    <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'rgba(255, 255, 255, 1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 36, color: '#5b21b6', backdropFilter: 'blur(8px)', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
                        <img src={logo} alt="Logo" style={{ width: 105 }} />
                    </div>
                    <h1 style={{ color: 'white', fontWeight: 800, fontSize: 26, marginBottom: 10, letterSpacing: '-0.02em' }}>IT Support Portal</h1>
                    <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 1.8, maxWidth: 280 }}>
                        System configuration, user management, and technical assistance hub for Fairview University College.
                    </p>

                    <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {['System Configuration', 'User Access Control', 'Technical Assistance', 'Database Management'].map(f => (
                            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>
                                <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <i className="fas fa-microchip" style={{ fontSize: 10, color: 'white' }}></i>
                                </span>
                                {f}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8faff', padding: '40px 24px' }}>
                <div style={{ width: '100%', maxWidth: 420 }}>
                    <div className="mobile-logo-header" style={{ display: 'none', justifyContent: 'center', marginBottom: 32 }}>
                        <div style={{ width: 100, height: 95, borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                            <img src={logo} alt="University Logo" style={{ width: 105 }} />
                        </div>
                    </div>

                    {view === 'login' ? (
                        <>
                            <div style={{ marginBottom: 32 }}>
                                <h2 style={{ fontSize: 26, fontWeight: 800, color: '#4c1d95', marginBottom: 6 }}>Admin Sign In</h2>
                                <p style={{ color: '#64748b', fontSize: 14 }}>Enter your IT credentials to access the console</p>
                            </div>

                            {error && (
                                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '12px 16px', borderRadius: 10, marginBottom: 20, fontSize: 13, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                    <i className="fas fa-exclamation-circle" style={{ marginTop: 2, flexShrink: 0 }}></i>
                                    <span>{error}</span>
                                </div>
                            )}

                            <form onSubmit={handleSubmit}>
                                <div style={{ marginBottom: 18 }}>
                                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>IT Email Address</label>
                                    <div style={{ position: 'relative' }}>
                                        <i className="fas fa-terminal" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#6d28d9', fontSize: 14 }}></i>
                                        <input
                                            type="email"
                                            name="email"
                                            value={form.email}
                                            onChange={handleChange}
                                            required
                                            placeholder="it.admin@fairview.edu"
                                            style={inputStyle}
                                        />
                                    </div>
                                </div>

                                <div style={{ marginBottom: 8 }}>
                                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Access Password</label>
                                    <div style={{ position: 'relative' }}>
                                        <i className="fas fa-key" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#6d28d9', fontSize: 14 }}></i>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            name="password"
                                            value={form.password}
                                            onChange={handleChange}
                                            required
                                            placeholder="••••••••"
                                            style={{ ...inputStyle, paddingRight: 44 }}
                                        />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} style={eyeBtnStyle}>
                                            <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                        </button>
                                    </div>
                                </div>

                                <div style={{ textAlign: 'right', marginBottom: 24 }}>
                                    <button
                                        type="button"
                                        onClick={() => { setView('forgot'); setError(''); setSuccessMsg(''); setResetEmail(form.email); }}
                                        style={{ background: 'none', border: 'none', color: '#6d28d9', fontWeight: 600, fontSize: 12, cursor: 'pointer', padding: 0 }}>
                                        Forgot access keys?
                                    </button>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    style={submitBtnStyle('#4c1d95', '#6d28d9', loading)}
                                >
                                    {loading
                                        ? <><i className="fas fa-spinner fa-spin"></i> Authenticating...</>
                                        : <><i className="fas fa-fingerprint"></i> Authorized Entry</>}
                                </button>
                            </form>
                        </>
                    ) : (
                        <>
                            <div style={{ marginBottom: 32 }}>
                                <h2 style={{ fontSize: 26, fontWeight: 800, color: '#4c1d95', marginBottom: 6 }}>Access Recovery</h2>
                                <p style={{ color: '#64748b', fontSize: 14 }}>Enter your registered email to reset your security keys.</p>
                            </div>

                            {error && (
                                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '12px 16px', borderRadius: 10, marginBottom: 20, fontSize: 13, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                    <i className="fas fa-exclamation-circle" style={{ marginTop: 2, flexShrink: 0 }}></i>
                                    <span>{error}</span>
                                </div>
                            )}
                            {successMsg && (
                                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', padding: '12px 16px', borderRadius: 10, marginBottom: 20, fontSize: 13, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                    <i className="fas fa-check-circle" style={{ marginTop: 2, flexShrink: 0 }}></i>
                                    <span>{successMsg}</span>
                                </div>
                            )}

                            <form onSubmit={handleResetPassword}>
                                <div style={{ marginBottom: 24 }}>
                                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>IT Email Address</label>
                                    <div style={{ position: 'relative' }}>
                                        <i className="fas fa-envelope" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#6d28d9', fontSize: 14 }}></i>
                                        <input
                                            type="email"
                                            value={resetEmail}
                                            onChange={(e) => setResetEmail(e.target.value)}
                                            required
                                            placeholder="admin@fairview.edu"
                                            style={inputStyle}
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    style={submitBtnStyle('#4c1d95', '#6d28d9', loading)}
                                >
                                    {loading
                                        ? <><i className="fas fa-spinner fa-spin"></i> Processing...</>
                                        : <><i className="fas fa-key"></i> Request Reset</>}
                                </button>

                                <div style={{ textAlign: 'center', marginTop: 24 }}>
                                    <button
                                        type="button"
                                        onClick={() => { setView('login'); setError(''); setSuccessMsg(''); }}
                                        style={{ background: 'none', border: 'none', color: '#4c1d95', fontSize: 14, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, margin: '0 auto' }}>
                                        <i className="fas fa-arrow-left"></i> Return to console
                                    </button>
                                </div>
                            </form>
                        </>
                    )}
                </div>
            </div>

            <style>{`
        @media (max-width: 768px) {
          .portal-left-panel { display: none !important; }
          .mobile-logo-header { display: flex !important; }
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

export default ITLogin;
