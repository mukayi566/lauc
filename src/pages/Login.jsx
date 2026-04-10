import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';

const Login = () => {
  const [form, setForm] = useState({ email: '', password: '', role: 'student' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { currentUser, userRole } = useAuth();

  // If already logged in, redirect to the correct dashboard
  useEffect(() => {
    // Only redirect if we are NOT currently in the middle of a login attempt
    if (currentUser && userRole && !loading) {
      if (userRole === 'admin')        navigate('/admin-dashboard', { replace: true });
      else if (userRole === 'staff')   navigate('/staff-dashboard', { replace: true });
      else                             navigate('/student-dashboard', { replace: true });
    }
  }, [currentUser, userRole, navigate, loading]);

  const roleConfig = {
    student: {
      label: 'Student ID / Email',
      placeholder: 'Enter your student email',
      icon: 'fa-user-graduate',
      inputIcon: 'fa-id-card'
    },
    staff: {
      label: 'Staff Email',
      placeholder: 'Enter your staff email',
      icon: 'fa-user-tie',
      inputIcon: 'fa-id-badge'
    },
    admin: {
      label: 'Admin Email',
      placeholder: 'Enter admin email',
      icon: 'fa-user-shield',
      inputIcon: 'fa-envelope'
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleRoleChange = (newRole) => {
    setForm({ ...form, role: newRole, email: '' });
    setError('');
  };

  const getFirebaseErrorMessage = (code) => {
    switch (code) {
      case 'auth/user-not-found':
        return 'This account does not exist. Please check your email or ID.';
      case 'auth/wrong-password':
        return 'Incorrect password. Contact admin if you forgot it.';
      case 'auth/invalid-credential':
        return 'Invalid credentials. Please verify your email/ID and password.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/user-disabled':
        return 'This account has been disabled. Contact support.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your internet connection.';
      default:
        return 'Login failed. Please check your credentials.';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let emailToAuth = form.email.trim();

      // 1. Resolve ID to Email if necessary (Student ID or Lecturer ID)
      if (!emailToAuth.includes('@')) {
        // Assume it's an ID
        let foundEmail = null;
        
        // Search in students
        const studentQuery = query(collection(db, 'students'), where('id', '==', emailToAuth));
        const studentSnap  = await getDocs(studentQuery);
        if (!studentSnap.empty) {
          foundEmail = studentSnap.docs[0].data().email;
        } else {
          // Search in lecturers
          const lecturerQuery = query(collection(db, 'lecturers'), where('id', '==', emailToAuth));
          const lecturerSnap  = await getDocs(lecturerQuery);
          if (!lecturerSnap.empty) {
            foundEmail = lecturerSnap.docs[0].data().email;
          }
        }

        if (foundEmail) {
          emailToAuth = foundEmail;
        } else {
          setError('User ID not found. Please use your registered email or correct ID.');
          setLoading(false);
          return;
        }
      }

      // 2. Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, emailToAuth, form.password);
      const user = userCredential.user;

      // 3. Fetch role from Firestore (with fallbacks)
      let role = 'student'; 
      let userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        role = userDoc.data().role || 'student';
      } else {
        // Fallback: Check specific collections
        const lecturerDoc = await getDoc(doc(db, 'lecturers', user.uid));
        if (lecturerDoc.exists()) {
          role = 'staff';
        } else {
          const studentDoc = await getDoc(doc(db, 'students', user.uid));
          if (studentDoc.exists()) {
            role = 'student';
          }
        }
      }

      // 4. Verify the selected tab matches the actual role
      if (role !== form.role) {
        // Special case: staff vs lecturer terminology handled internally
        if (!(role === 'staff' && form.role === 'staff') && !(role === 'student' && form.role === 'student')) {
          setError(`Note: You are logged in as "${role}". Redirecting to the correct portal…`);
          await new Promise(r => setTimeout(r, 1000));
        }
      }

      // 5. Redirect to correct dashboard
      if (role === 'admin')       navigate('/admin-dashboard');
      else if (role === 'staff')  navigate('/staff-dashboard');
      else                        navigate('/student-dashboard');

    } catch (err) {
      setError(getFirebaseErrorMessage(err.code));
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
            {/* Logo */}
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ fontSize: 48, color: '#1e3c72', marginBottom: 10 }}>
                <i className={`fas ${roleConfig[form.role].icon}`}></i>
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: '#1e3c72', margin: 0 }}>LAUC {form.role.charAt(0).toUpperCase() + form.role.slice(1)} Portal</h2>
              <p style={{ color: '#666', fontSize: 14, marginTop: 6 }}>Sign in to your {form.role} account</p>
            </div>

            {/* Role Tabs */}
            <div style={{ display: 'flex', background: '#f8f9fa', borderRadius: 10, padding: 4, marginBottom: 24 }}>
              {['student', 'staff', 'admin'].map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleRoleChange(r)}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                    background: form.role === r ? 'linear-gradient(135deg, #1e3c72, #2a5298)' : 'transparent',
                    color: form.role === r ? 'white' : '#666',
                    transition: 'all 0.2s',
                    textTransform: 'capitalize',
                  }}>
                  {r === 'student' ? 'Student' : r === 'staff' ? 'Staff' : 'Admin'}
                </button>
              ))}
            </div>

            {error && (
              <div className="alert alert-error" style={{ marginBottom: 18 }}>
                <i className="fas fa-exclamation-circle"></i> {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label htmlFor="login-email">{roleConfig[form.role].label}</label>
                <div style={{ position: 'relative' }}>
                  <i className={`fas ${roleConfig[form.role].inputIcon}`} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#2a5298', fontSize: 14 }}></i>
                  <input
                    type="text"
                    id="login-email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    placeholder={roleConfig[form.role].placeholder}
                    style={{ paddingLeft: 38 }}
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 22 }}>
                <label htmlFor="login-password">Password</label>
                <div style={{ position: 'relative' }}>
                  <i className="fas fa-lock" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#2a5298', fontSize: 14 }}></i>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="login-password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    required
                    placeholder="Enter your password"
                    style={{ paddingLeft: 38, paddingRight: 40 }}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#666',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                      zIndex: 3
                    }}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
                <div style={{ textAlign: 'right', marginTop: 6 }}>
                  <Link to="/forgot-password" style={{ fontSize: 12, color: '#2a5298', textDecoration: 'none', fontWeight: 600 }}>Forgot password?</Link>
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
                  ? <><i className="fas fa-spinner fa-spin"></i> Signing in...</>
                  : <><i className="fas fa-sign-in-alt"></i> Sign In</>}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: 24, paddingTop: 20, borderTop: '1px solid #f0f0f0' }}>
              <p style={{ fontSize: 14, color: '#666' }}>
                Don't have an account?{' '}
                <Link to="/admissions#apply" style={{ color: '#2a5298', fontWeight: 700, textDecoration: 'none' }}>
                  Apply Now
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Login;
