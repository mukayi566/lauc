import React, { useState, useEffect, useCallback, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  doc, getDoc, setDoc, updateDoc,
  collection, getDocs, addDoc,
  serverTimestamp, query, orderBy, where
} from 'firebase/firestore';
import { db } from '../firebase';
import '../dashboards.css';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/* ─────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────── */
const ZMW = (amount) =>
  `K ${Number(amount).toLocaleString('en-ZM', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const Badge = ({ status }) => {
  const map = {
    Registered: 'badge-teal',
    Pass: 'badge-green',
    credit: 'badge-green',
    debit: 'badge-red',
    Active: 'badge-green',
    Inactive: 'badge-red',
    'First Class': 'badge-gold',
    'Second Class Upper': 'badge-teal',
    'Second Class Lower': 'badge-teal',
    Pending: 'badge-gold',
  };
  return (
    <span className={`sd-badge ${map[status] || 'badge-teal'}`}>
      {status}
    </span>
  );
};

const Spinner = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px', color: '#0d9488', fontSize: 28 }}>
    <i className="fas fa-circle-notch fa-spin"></i>
  </div>
);

/* ─────────────────────────────────────────────────────────────────
   DASHBOARD CONSTANTS (Live Data Only)
───────────────────────────────────────────────────────────────── */

/* ═══════════════════════════════════════════════════════════════ */
const StudentDashboard = () => {
  const { signOut, currentUser, changePassword } = useAuth();
  const navigate = useNavigate();

  /* ── local UI state ── */
  const [activeTab, setActiveTab] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showRegModal, setShowRegModal] = useState(false);
  const [showHostelModal, setShowHostelModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('mobile_money');
  const [payDesc, setPayDesc] = useState('');
  const [payStep, setPayStep] = useState(1); // 1: Amount/Desc, 2: Method/Details, 3: Processing, 4: Success
  const [payProgress, setPayProgress] = useState(0);
  const [cardData, setCardData] = useState({ number: '', expiry: '', cvc: '', name: '' });
  const [paySuccessMsg, setPaySuccessMsg] = useState('');
  const [regSelected, setRegSelected] = useState([]);
  const [regSuccessMsg, setRegSuccessMsg] = useState('');
  const [profileForm, setProfileForm] = useState({});
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
  const [downloadMsg, setDownloadMsg] = useState('');
  const [showPasswordForce, setShowPasswordForce] = useState(false);
  const [passForm, setPassForm] = useState({ new: '', confirm: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [payingFee, setPayingFee] = useState(false);
  const [registeringCourse, setRegisteringCourse] = useState(false);
  const [selectedHostel, setSelectedHostel] = useState(null);
  const [bookingHostel, setBookingHostel] = useState(false);
  const [bookingSuccessMsg, setBookingSuccessMsg] = useState('');

  /* ── DB data state ── */
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState('');
  const [profile, setProfile] = useState(null);
  const [courses, setCourses] = useState([]);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [results, setResults] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [cgpa, setCgpa] = useState('—');
  const [balanceDue, setBalanceDue] = useState(0);

  /* ── Exam Docket state ── */
  const [examDocket, setExamDocket] = useState(null);
  const [clearanceStatus, setClearanceStatus] = useState(null);
  const [docketView, setDocketView] = useState('docket'); // 'docket' | 'timetable'
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const docketRef = useRef(null);

  const uid = currentUser?.uid;

  /* ══════════════════════════════════════════════
     SEED + LOAD from Firestore
  ══════════════════════════════════════════════ */
  const loadData = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    setDbError('');

    try {
      const studentRef = doc(db, 'students', uid);

      /* ── profile ── */
      const profileSnap = await getDoc(studentRef);
      let prof;
      if (!profileSnap.exists()) {
        prof = {
          name: currentUser?.displayName || 'New Student',
          email: currentUser?.email || '',
          studentId: '',
          program: '',
          school: '',
          level: 'Year 1 – Semester 1',
          status: 'Active',
          phone: '',
          createdAt: serverTimestamp(),
        };
        await setDoc(studentRef, prof);
      } else {
        prof = profileSnap.data();
        if (!prof.email && currentUser?.email) {
          await updateDoc(studentRef, { email: currentUser.email });
          prof.email = currentUser.email;
        }
      }
      setProfile(prof);
      if (prof.mustChangePassword) {
        setShowPasswordForce(true);
      }
      setProfileForm({
        name: prof.name || '',
        email: prof.email || currentUser?.email || '',
        phone: prof.phone || '',
        program: prof.program || '',
      });

      /* ── courses ── */
      const coursesCol = collection(db, 'students', uid, 'courses');
      const coursesSnap = await getDocs(coursesCol);
      const loadedCourses = coursesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCourses(loadedCourses);

      /* ── available courses ── */
      const availCol = collection(db, 'courses');
      const availSnap = await getDocs(availCol);
      setAvailableCourses(availSnap.docs.map(d => ({ docId: d.id, ...d.data(), code: d.data().code || d.data().id })));

      /* ── results (published only) ── */
      const resultsQuery = query(
        collection(db, 'results'),
        where('studentId', '==', uid),
        where('status', '==', 'published')
      );
      const resultsSnap = await getDocs(resultsQuery);
      const loadedResults = resultsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setResults(loadedResults);

      if (loadedResults.length > 0) {
        const totalPoints = loadedResults.reduce((s, r) => s + (parseFloat(r.gpa) || 0), 0);
        const avg = totalPoints / loadedResults.length;
        setCgpa(avg.toFixed(2));
      } else {
        setCgpa('0.00');
      }

      /* ── timetable ── */
      const ttCol = collection(db, 'students', uid, 'timetable');
      const ttSnap = await getDocs(ttCol);
      setTimetable(ttSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      /* ── transactions ── */
      const txCol = collection(db, 'students', uid, 'transactions');
      const txSnap = await getDocs(query(txCol, orderBy('date', 'desc')));
      const loadedTx = txSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTransactions(loadedTx);

      const bal = loadedTx.reduce((s, t) => {
        const amt = Number(t.amount) || 0;
        return t.type === 'credit' ? s - amt : s + amt;
      }, 0);
      const currentBalance = Math.max(0, bal);
      setBalanceDue(currentBalance);

      /* ── exam docket ── */
      const docketRef2 = doc(db, 'students', uid, 'examDocket', 'current');
      const docketSnap = await getDoc(docketRef2);
      let docketData;
      if (!docketSnap.exists()) {
        docketData = {
          academicYear: '2025/2026',
          semester: 'Semester 2',
          examPeriod: 'June 9 – June 27, 2026',
          clearance: {
            fees: currentBalance === 0,
            library: prof.libraryCleared ?? true,
            hostel: prof.hostelCleared ?? true,
            academic: true,
          },
          exams: (loadedCourses.length > 0 ? loadedCourses : []).map((c, i) => {
            const dates = ['2026-06-10', '2026-06-12', '2026-06-14', '2026-06-16', '2026-06-18', '2026-06-20', '2026-06-23', '2026-06-25'];
            const times = ['08:00 – 10:00', '10:30 – 12:30', '14:00 – 16:00'];
            const venues = ['Hall A – Room 101', 'Hall B – Room 204', 'LT 1', 'LT 2', 'Main Hall', 'Hall C – Room 308'];
            return {
              code: c.code,
              name: c.name,
              date: dates[i % dates.length],
              time: times[i % times.length],
              venue: venues[i % venues.length],
              seat: `${String.fromCharCode(65 + (i % 6))}${String(Math.floor(Math.random() * 40) + 1).padStart(2, '0')}`,
            };
          }),
          createdAt: serverTimestamp(),
        };
        await setDoc(docketRef2, docketData);
      } else {
        docketData = docketSnap.data();
        // Dynamically update fees clearance based on current balance
        if (docketData.clearance) {
          docketData.clearance.fees = currentBalance === 0;
        }
        if (!docketData.exams || docketData.exams.length === 0) {
          const dates = ['2026-06-10', '2026-06-12', '2026-06-14', '2026-06-16', '2026-06-18', '2026-06-20'];
          const times = ['08:00 – 10:00', '10:30 – 12:30', '14:00 – 16:00'];
          const venues = ['Hall A – Room 101', 'Hall B – Room 204', 'LT 1', 'LT 2', 'Main Hall'];
          docketData.exams = loadedCourses.map((c, i) => ({
            code: c.code,
            name: c.name,
            date: dates[i % dates.length],
            time: times[i % times.length],
            venue: venues[i % venues.length],
            seat: `${String.fromCharCode(65 + (i % 5))}${String(i + 1).padStart(2, '0')}`,
          }));
        }
      }
      setExamDocket(docketData);

      // Derive clearance status
      const cl = docketData.clearance || {};
      const blocked = Object.entries(cl).filter(([, v]) => !v);
      setClearanceStatus({
        cleared: blocked.length === 0,
        blockedReasons: blocked.map(([k]) => {
          const labels = { fees: 'Outstanding fee balance', library: 'Library fine or unreturned book', hostel: 'Unpaid hostel charges', academic: 'Academic irregularity hold' };
          return labels[k] || k;
        }),
        details: cl,
      });

      /* ── notifications ── */
      const notifCol = collection(db, 'students', uid, 'notifications');
      const notifSnap = await getDocs(notifCol);
      setNotifications(notifSnap.docs.map(d => ({ id: d.id, ...d.data() })));

    } catch (err) {
      console.error('Dashboard load error:', err);
      if (err.code === 'permission-denied') {
        navigate('/login', { state: { error: "Access Denied: You do not have permission to view this dashboard." } });
        return;
      }

      if (!navigator.onLine || err.code === 'unavailable') {
        setDbError('You are offline. Showing cached data if available.');
      } else {
        setDbError('Unable to load some dashboard data. Please check your connection or refresh the page.');
      }
    } finally {
      setLoading(false);
    }
  }, [uid, currentUser]);

  useEffect(() => { loadData(); }, [loadData]);

  /* ══════════════════════════════════════════════
     ACTIONS
  ══════════════════════════════════════════════ */
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (passForm.new !== passForm.confirm) {
      alert("Passwords do not match");
      return;
    }
    try {
      // 1. Update Firebase Auth Password
      await changePassword(passForm.new);

      // 2. Update Firestore record
      await updateDoc(doc(db, 'students', uid), {
        password: passForm.new,
        mustChangePassword: false,
        updatedAt: serverTimestamp()
      });

      setProfile(prev => ({ ...prev, mustChangePassword: false }));
      setShowPasswordForce(false);
      setPassForm({ new: '', confirm: '' });
      alert("Password updated successfully!");
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/requires-recent-login') {
        alert('For security reasons, please log out and log back in before changing your password.');
      } else {
        alert("Error updating password: " + err.message);
      }
    }
  };

  const logout = async () => { await signOut(); navigate('/login'); };

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = async () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    try {
      for (const n of updated) {
        if (!n.read && n.id) {
          await updateDoc(doc(db, 'students', uid, 'notifications', n.id), { read: true });
        }
      }
    } catch { }
  };

  /* Pay fees */
  /* Pay fees simulation */
  const handlePay = async (e) => {
    if (e) e.preventDefault();

    if (payStep === 1) {
      if (!payAmount || parseFloat(payAmount) <= 0) return;
      setPayStep(2);
      return;
    }

    if (payStep === 2) {
      setPayStep(3);
      setPayProgress(0);

      // Simulate progress
      const interval = setInterval(() => {
        setPayProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 5;
        });
      }, 100);

      setTimeout(async () => {
        setPayingFee(true);
        try {
          const amt = parseFloat(payAmount);
          const txCol = collection(db, 'students', uid, 'transactions');
          const today = new Date().toISOString().split('T')[0];
          const newTx = {
            date: today,
            desc: payDesc || `Tuition Payment – ${payMethod === 'mobile_money' ? 'Mobile Money' : payMethod === 'card' ? 'Card' : 'Bank Transfer'}`,
            type: 'credit',
            amount: amt,
            method: payMethod,
            createdAt: serverTimestamp(),
          };
          await addDoc(txCol, newTx);

          // refresh transactions & balance
          const txSnap = await getDocs(query(txCol, orderBy('date', 'desc')));
          const loadedTx = txSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          setTransactions(loadedTx);
          const bal = loadedTx.reduce((s, t) => {
            const a = Number(t.amount) || 0;
            return t.type === 'credit' ? s - a : s + a;
          }, 0);
          setBalanceDue(Math.max(0, bal));

          setPayStep(4);
          setPaySuccessMsg(`Receipt #TX-${Math.random().toString(36).substr(2, 9).toUpperCase()}`);
          await loadData();
        } catch (err) {
          console.error('Pay error:', err);
          setPayStep(1);
          alert("Error processing payment. Please try again.");
        } finally {
          setPayingFee(false);
          clearInterval(interval);
        }
      }, 2500);
    }
  };

  const closePayModal = () => {
    setShowPayModal(false);
    setPayStep(1);
    setPayAmount('');
    setPayDesc('');
    setPayProgress(0);
    setCardData({ number: '', expiry: '', cvc: '', name: '' });
  };

  /* Register course */
  const toggleCourse = (id) =>
    setRegSelected(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);

  const handleRegister = async () => {
    if (regSelected.length === 0) return;
    setRegisteringCourse(true);
    try {
      const coursesCol = collection(db, 'students', uid, 'courses');
      for (const id of regSelected) {
        const found = availableCourses.find(c => c.id === id);
        if (found) {
          await addDoc(coursesCol, {
            code: found.code || found.id,
            id: found.id || found.code,
            name: found.name,
            units: found.units || 3,
            lecturer: found.lecturer,
            status: 'Registered',
            grade: '—',
            createdAt: serverTimestamp(),
          });

          // Increment enrolled count in the main courses collection
          if (found.docId) {
            const courseRef = doc(db, 'courses', found.docId);
            const courseSnap = await getDoc(courseRef);
            if (courseSnap.exists()) {
              const currentEnrolled = courseSnap.data().enrolled || 0;
              await updateDoc(courseRef, { enrolled: currentEnrolled + 1 });
            }
          }
        }
      }
      // Refresh all dashboard data
      await loadData();
      setRegSuccessMsg('Courses registered successfully! Your timetable and docket have been updated.');
      setRegSelected([]);
      setTimeout(() => { setRegSuccessMsg(''); setShowRegModal(false); }, 3000);
    } catch (err) {
      console.error('Register error:', err);
      if (!navigator.onLine || err.code === 'unavailable') {
        setRegSuccessMsg('You are offline. Registration will complete when you are back online.');
      } else {
        setRegSuccessMsg('Error registering courses. Please try again.');
      }
    } finally {
      setRegisteringCourse(false);
    }
  };

  /* Save profile */
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateDoc(doc(db, 'students', uid), {
        name: profileForm.name,
        phone: profileForm.phone,
        program: profileForm.program,
        updatedAt: serverTimestamp(),
      });
      setProfile(prev => ({ ...prev, ...profileForm }));
      setProfileSuccessMsg('Profile updated successfully!');
      setTimeout(() => { setProfileSuccessMsg(''); setShowProfileModal(false); }, 2500);
    } catch (err) {
      console.error('Profile save error:', err);
      if (!navigator.onLine || err.code === 'unavailable') {
        setProfileSuccessMsg('You are offline. Changes will sync when you are back online.');
      } else {
        setProfileSuccessMsg('Error saving profile. Try again.');
      }
    } finally {
      setSavingProfile(false);
    }
  };

  /* Download result stub */
  const downloadResult = (sem) => {
    setDownloadMsg(`Transcript for "${sem}" is being prepared for download.`);
    setTimeout(() => setDownloadMsg(''), 3000);
  };

  /* ── derived values ── */
  const student = {
    name: profile?.name || currentUser?.displayName || 'Student',
    email: profile?.email || currentUser?.email || '—',
    initials: (profile?.name || currentUser?.displayName || 'ST')
      .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
    id: profile?.studentId || profile?.student_id ||
      (uid ? `FU/${new Date().getFullYear()}/STU/${uid.slice(0, 6).toUpperCase()}` : '—'),
    program: profile?.program || '—',
    school: profile?.school || '—',
    level: profile?.level || '—',
    status: profile?.status || 'Active',
    phone: profile?.phone || '—',
  };

  const creditHours = courses.reduce((s, c) => s + (Number(c.units) || 0), 0);

  /* ══ Nav items ══ */
  const navItems = [
    { id: 'home', icon: 'fa-home', label: 'Dashboard', group: 'Main' },
    { id: 'courses', icon: 'fa-book-open', label: 'Register Courses', group: 'Academics' },
    { id: 'results', icon: 'fa-chart-bar', label: 'Results', group: 'Academics' },
    { id: 'timetable', icon: 'fa-calendar-alt', label: 'Timetable', group: 'Academics' },
    { id: 'docket', icon: 'fa-id-card', label: 'Exam Docket', group: 'Academics' },
    { id: 'finance', icon: 'fa-wallet', label: 'Payments', group: 'Finance' },
    { id: 'hostel', icon: 'fa-hotel', label: 'Hostel & Housing', group: 'Services' },
  ];
  const groups = [...new Set(navItems.map(i => i.group))];

  /* ══ PDF Download ══ */
  const downloadDocketPdf = async () => {
    if (!docketRef.current) return;
    setGeneratingPdf(true);
    try {
      const canvas = await html2canvas(docketRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = (canvas.height * pdfW) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
      pdf.save(`ExamDocket_${student.id}_${examDocket?.semester?.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
    } catch (err) {
      console.error('PDF error:', err);
      alert('Could not generate PDF. Please try print instead.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  /* ══════════════════════════════════════════════
     SIDEBAR
  ══════════════════════════════════════════════ */
  const sidebar = (
    <div className={`sd-sidebar ${sidebarOpen ? 'sd-sidebar--open' : ''}`}>
      <div className="sd-sidebar-logo">
        <div className="sd-logo-icon"><i className="fas fa-graduation-cap"></i></div>
        <div>
          <div className="sd-logo-title">Fairview Portal</div>
          <div className="sd-logo-sub">Student</div>
        </div>
      </div>

      <div className="sd-profile-pill">
        <div className="sd-avatar">{student.initials}</div>
        <div className="sd-profile-text">
          <div className="sd-profile-name">{student.name}</div>
          <div className="sd-profile-id">{student.id}</div>
        </div>
      </div>

      <nav className="sd-nav">
        {groups.map(grp => (
          <div key={grp}>
            <div className="sd-nav-group">{grp}</div>
            {navItems.filter(i => i.group === grp).map(item => (
              <a key={item.id} href="#"
                className={`sd-nav-link ${activeTab === item.id ? 'active' : ''}`}
                onClick={e => { e.preventDefault(); setActiveTab(item.id); setSidebarOpen(false); }}>
                <i className={`fas ${item.icon}`}></i>
                <span>{item.label}</span>
                {activeTab === item.id && <div className="sd-nav-indicator"></div>}
              </a>
            ))}
          </div>
        ))}
      </nav>

      <div className="sd-sidebar-footer">
        <a href="#" className="sd-nav-link"
          onClick={e => { e.preventDefault(); setShowProfileModal(true); setSidebarOpen(false); }}>
          <i className="fas fa-user-cog"></i><span>Account Settings</span>
        </a>
        <a href="#" className="sd-nav-link sd-logout"
          onClick={e => { e.preventDefault(); logout(); }}>
          <i className="fas fa-sign-out-alt"></i><span>Logout</span>
        </a>
      </div>
    </div>
  );

  /* ══════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════ */
  return (
    <div className="sd-shell">
      {sidebarOpen && <div className="sd-overlay" onClick={() => setSidebarOpen(false)} />}
      {sidebar}

      <div className="sd-body">
        {/* Topbar */}
        <header className="sd-topbar">
          <button className="sd-hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <i className="fas fa-bars"></i>
          </button>
          <div className="sd-topbar-title">
            {navItems.find(i => i.id === activeTab)?.label || 'Dashboard'}
          </div>
          <div className="sd-topbar-right">
            <div style={{ position: 'relative' }}>
              <button className="sd-icon-btn-top" onClick={() => setShowNotifPanel(!showNotifPanel)}>
                <i className="fas fa-bell"></i>
                {unreadCount > 0 && <span className="sd-notif-dot">{unreadCount}</span>}
              </button>
              {showNotifPanel && (
                <div className="sd-notif-panel">
                  <div className="sd-notif-header">
                    <span>Notifications</span>
                    <button className="sd-link-btn" onClick={markAllRead}>Mark all read</button>
                  </div>
                  {notifications.map(n => (
                    <div key={n.id} className={`sd-notif-item ${!n.read ? 'unread' : ''}`}>
                      <i className={`fas ${n.icon}`} style={{ color: n.color, marginTop: 2 }}></i>
                      <div>
                        <div className="sd-notif-text">{n.text}</div>
                        <div className="sd-notif-time">{n.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="sd-topbar-avatar" onClick={() => setShowProfileModal(true)}>
              {student.initials}
            </div>
          </div>
        </header>

        {/* Error banner */}
        {dbError && (
          <div className="sd-toast sd-toast-err">
            <i className="fas fa-exclamation-triangle"></i> {dbError}
          </div>
        )}

        <main className="sd-main">
          {loading ? <Spinner /> : (
            <>
              {/* ═══════════ HOME ═══════════ */}
              {activeTab === 'home' && (
                <div className="sd-tab-fade">
                  <div className="sd-welcome-banner">
                    <div>
                      <h1 className="sd-welcome-h1">
                        Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {student.name.split(' ')[0]} 👋
                      </h1>
                      <p className="sd-welcome-p">
                        {new Date().toLocaleDateString('en-ZM', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </p>
                    </div>
                    <div className="sd-welcome-actions">
                      <button className="sd-btn sd-btn-white" onClick={() => setActiveTab('courses')}>
                        <i className="fas fa-book-open"></i> Register Courses
                      </button>
                      <button className="sd-btn sd-btn-glass" onClick={() => setActiveTab('results')}>
                        <i className="fas fa-chart-bar"></i> View Results
                      </button>
                    </div>
                  </div>

                  {/* stat cards */}
                  <div className="sd-stats-row">
                    {[
                      { icon: 'fa-chart-line', val: cgpa, lbl: 'Current CGPA', color: '#0d9488', bg: 'rgba(13,148,136,0.12)' },
                      { icon: 'fa-book', val: courses.length, lbl: 'Enrolled Courses', color: '#7c3aed', bg: 'rgba(124,58,237,0.12)' },
                      { icon: 'fa-layer-group', val: creditHours, lbl: 'Credit Hours', color: '#2563eb', bg: 'rgba(37,99,235,0.12)' },
                      { icon: 'fa-money-bill-wave', val: ZMW(balanceDue), lbl: 'Balance Due', color: '#dc2626', bg: 'rgba(220,38,38,0.12)' },
                    ].map((s) => (
                      <div key={s.lbl} className="sd-stat-card">
                        <div className="sd-stat-icon" style={{ background: s.bg, color: s.color }}>
                          <i className={`fas ${s.icon}`}></i>
                        </div>
                        <div className="sd-stat-val">{s.val}</div>
                        <div className="sd-stat-lbl">{s.lbl}</div>
                      </div>
                    ))}
                  </div>

                  <div className="sd-two-col">
                    {/* profile card */}
                    <div className="sd-card">
                      <div className="sd-card-header">
                        <span>Student Profile</span>
                        <button className="sd-link-btn" onClick={() => setShowProfileModal(true)}>Edit</button>
                      </div>
                      <div className="sd-card-body">
                        <div className="sd-profile-large">
                          <div className="sd-avatar-lg">{student.initials}</div>
                          <div>
                            <h2 className="sd-profile-fullname">{student.name}</h2>
                            <p className="sd-profile-email">{student.email}</p>
                          </div>
                        </div>
                        <div className="sd-profile-grid">
                          {[
                            ['Student ID', student.id],
                            ['Program', student.program],
                            ['School', student.school],
                            ['Level', student.level],
                            ['Status', student.status],
                            ['CGPA', cgpa],
                          ].map(([k, v]) => (
                            <div className="sd-kv" key={k}>
                              <span className="sd-kv-key">{k}</span>
                              <span className="sd-kv-val">
                                {k === 'Status' ? <Badge status={v} /> : v}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* today's schedule */}
                    <div className="sd-card">
                      <div className="sd-card-header">
                        <span>Today's Schedule</span>
                        <button className="sd-link-btn" onClick={() => setActiveTab('timetable')}>Full Timetable</button>
                      </div>
                      <div className="sd-card-body">
                        {courses.slice(0, 2).map((cls, i) => (
                          <div className="sd-schedule-item" key={cls.id || cls.code}>
                            <div className="sd-schedule-dot" style={{ background: ['#7c3aed', '#0d9488', '#2563eb', '#f59e0b'][i % 4] }}>
                              <i className="fas fa-book"></i>
                            </div>
                            <div className="sd-schedule-info">
                              <div className="sd-schedule-course">{cls.code} – {cls.name}</div>
                              <div className="sd-schedule-meta">{cls.lecturer}</div>
                            </div>
                          </div>
                        ))}
                        <div className="sd-schedule-free">
                          <i className="fas fa-info-circle"></i> View full timetable for times & rooms
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* notifications */}
                  <div className="sd-card" style={{ marginTop: 24 }}>
                    <div className="sd-card-header">
                      <span>Notifications</span>
                      <button className="sd-link-btn" onClick={markAllRead}>Mark all read</button>
                    </div>
                    <div className="sd-card-body" style={{ padding: 0 }}>
                      {notifications.length === 0
                        ? <div style={{ padding: '20px', color: '#94a3b8', textAlign: 'center' }}>No notifications.</div>
                        : notifications.map(n => (
                          <div key={n.id} className={`sd-notif-row ${!n.read ? 'unread' : ''}`}>
                            <div style={{ color: n.color, fontSize: 18 }}><i className={`fas ${n.icon}`}></i></div>
                            <div className="sd-notif-body">
                              <div className="sd-notif-text">{n.text}</div>
                              <div className="sd-notif-time">{n.time}</div>
                            </div>
                            {!n.read && <span className="sd-unread-dot"></span>}
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ═══════════ COURSES ═══════════ */}
              {activeTab === 'courses' && (
                <div className="sd-tab-fade">
                  <div className="sd-page-header">
                    <div>
                      <h2 className="sd-page-title">Course Registration</h2>
                      <p className="sd-page-sub">Registration closes April 20</p>
                    </div>
                    <button className="sd-btn sd-btn-primary" onClick={() => setShowRegModal(true)}>
                      <i className="fas fa-plus"></i> Add Course
                    </button>
                  </div>

                  <div className="sd-card">
                    <div className="sd-card-header">
                      <span>Currently Enrolled Courses</span>
                      <span className="sd-badge badge-teal">{courses.length} courses</span>
                    </div>
                    <div className="sd-table-wrapper">
                      {courses.length === 0
                        ? <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No courses registered yet.</div>
                        : (
                          <table className="sd-table">
                            <thead>
                              <tr><th>Code</th><th>Course Name</th><th>Units</th><th>Lecturer</th><th>Grade</th><th>Status</th></tr>
                            </thead>
                            <tbody>
                              {courses.map(c => (
                                <tr key={c.id}>
                                  <td><span className="sd-code">{c.code}</span></td>
                                  <td className="sd-td-bold">{c.name}</td>
                                  <td>{c.units}</td>
                                  <td>{c.lecturer}</td>
                                  <td><span className="sd-grade">{c.grade}</span></td>
                                  <td><Badge status={c.status} /></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                    </div>
                  </div>

                  <div className="sd-stats-row" style={{ marginTop: 24 }}>
                    {[
                      { icon: 'fa-layer-group', val: creditHours, lbl: 'Credit Hours', color: '#2563eb', bg: 'rgba(37,99,235,0.1)' },
                      { icon: 'fa-book', val: courses.length, lbl: 'Enrolled', color: '#0d9488', bg: 'rgba(13,148,136,0.1)' },
                      { icon: 'fa-check-double', val: courses.filter(c => c.status === 'Registered').length, lbl: 'Registered', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
                      { icon: 'fa-clock', val: courses.filter(c => c.status === 'Pending').length, lbl: 'Pending', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
                    ].map((s) => (
                      <div key={s.lbl} className="sd-stat-card">
                        <div className="sd-stat-icon" style={{ background: s.bg, color: s.color }}><i className={`fas ${s.icon}`}></i></div>
                        <div className="sd-stat-val">{s.val}</div>
                        <div className="sd-stat-lbl">{s.lbl}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ═══════════ RESULTS ═══════════ */}
              {activeTab === 'results' && (
                <div className="sd-tab-fade">
                  {downloadMsg && (
                    <div className="sd-toast"><i className="fas fa-check-circle"></i> {downloadMsg}</div>
                  )}
                  <div className="sd-page-header">
                    <div>
                      <h2 className="sd-page-title">Academic Results</h2>
                      <p className="sd-page-sub">Cumulative GPA: <strong style={{ color: '#0d9488' }}>{cgpa}</strong></p>
                    </div>
                  </div>

                  {/* GPA bar chart */}
                  {results.length > 0 && (
                    <div className="sd-card" style={{ marginBottom: 24 }}>
                      <div className="sd-card-header"><span>GPA Trend</span></div>
                      <div className="sd-card-body">
                        <div className="sd-gpa-bars">
                          {results.map(r => (
                            <div key={r.semester} className="sd-gpa-bar-grp">
                              <div className="sd-gpa-bar-wrap">
                                <div className="sd-gpa-bar" style={{ height: `${(parseFloat(r.gpa) / 4) * 100}%` }}></div>
                              </div>
                              <div className="sd-gpa-val">{r.gpa}</div>
                              <div className="sd-gpa-sem">{r.semester}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="sd-card">
                    <div className="sd-card-header"><span>Published Results</span></div>
                    {results.length === 0
                      ? <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No results have been published yet.</div>
                      : (
                        <div className="sd-table-wrapper">
                          <table className="sd-table">
                            <thead>
                              <tr>
                                <th>Code</th>
                                <th>Course Name</th>
                                <th>CA</th>
                                <th>Exam</th>
                                <th>Total</th>
                                <th>Grade</th>
                                <th>GPA</th>
                              </tr>
                            </thead>
                            <tbody>
                              {results.map(r => (
                                <tr key={r.id}>
                                  <td className="sd-td-bold">{r.courseCode}</td>
                                  <td>{r.courseName}</td>
                                  <td>{r.caScore}</td>
                                  <td>{r.examScore}</td>
                                  <td><strong>{r.total}</strong></td>
                                  <td><span className="sd-grade">{r.grade}</span></td>
                                  <td>{parseFloat(r.gpa).toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                  </div>
                </div>
              )}

              {/* ═══════════ TIMETABLE ═══════════ */}
              {activeTab === 'timetable' && (
                <div className="sd-tab-fade">
                  <div className="sd-page-header">
                    <div>
                      <h2 className="sd-page-title">Weekly Timetable</h2>
                      <p className="sd-page-sub"> semester schedule</p>
                    </div>
                    <button className="sd-btn sd-btn-primary" onClick={() => window.print()}>
                      <i className="fas fa-print"></i> Print
                    </button>
                  </div>

                  <div className="sd-card">
                    <div className="sd-table-wrapper">
                      <table className="sd-table sd-timetable">
                        <thead>
                          <tr>
                            <th>Day</th>
                            <th>08:00 – 10:00</th>
                            <th>10:00 – 12:00</th>
                            <th>14:00 – 16:00</th>
                          </tr>
                        </thead>
                        <tbody>
                          {timetable.length === 0
                            ? <tr><td colSpan={4} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>Timetable not available.</td></tr>
                            : timetable.map((row, i) => (
                              <tr key={row.day || i}>
                                <td className="sd-td-bold">{row.day}</td>
                                {(row.slots || ['—', '—', '—']).map((s, j) => (
                                  <td key={j}>
                                    {s && s !== '—'
                                      ? <div className="sd-tt-slot">{s}</div>
                                      : <span style={{ color: '#cbd5e1' }}>—</span>}
                                  </td>
                                ))}
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="sd-legend">
                    {courses.map((c, i) => (
                      <div key={c.id} className="sd-legend-item">
                        <div className="sd-legend-dot" style={{ background: ['#7c3aed', '#0d9488', '#2563eb', '#f59e0b'][i % 4] }}></div>
                        <span><strong>{c.code}</strong> – {c.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ═══════════ FINANCE ═══════════ */}
              {activeTab === 'finance' && (
                <div className="sd-tab-fade">
                  <div className="sd-page-header">
                    <div>
                      <h2 className="sd-page-title">Fee Portal</h2>
                      <p className="sd-page-sub">Zambian Kwacha (ZMW)</p>
                    </div>
                    <button className="sd-btn sd-btn-primary" onClick={() => setShowPayModal(true)}>
                      <i className="fas fa-credit-card"></i> Pay Fees
                    </button>
                  </div>

                  {/* balance banner */}
                  <div className="sd-balance-banner">
                    <div>
                      <div className="sd-balance-label">Outstanding Balance</div>
                      <div className="sd-balance-amount">{ZMW(balanceDue)}</div>
                      <div className="sd-balance-due">Due: April 30, 2026</div>
                    </div>
                    <div className="sd-balance-right">
                      <div className="sd-balance-stat">
                        <span className="sd-bs-val">
                          {ZMW(transactions.filter(t => t.type === 'credit').reduce((s, t) => s + Number(t.amount), 0))}
                        </span>
                        <span className="sd-bs-lbl">Total Paid</span>
                      </div>
                      <div className="sd-bs-divider"></div>
                      <div className="sd-balance-stat">
                        <span className="sd-bs-val">
                          {ZMW(transactions.filter(t => t.type === 'debit').reduce((s, t) => s + Number(t.amount), 0))}
                        </span>
                        <span className="sd-bs-lbl">Total Fees</span>
                      </div>
                      <button className="sd-btn sd-btn-white" onClick={() => setShowPayModal(true)}>
                        Pay Now →
                      </button>
                    </div>
                  </div>

                  <div className="sd-stats-row" style={{ marginTop: 24 }}>
                    {[
                      { icon: 'fa-check-circle', val: ZMW(transactions.filter(t => t.type === 'credit').reduce((s, t) => s + Number(t.amount), 0)), lbl: 'Total Paid', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
                      { icon: 'fa-exclamation-circle', val: ZMW(balanceDue), lbl: 'Balance Due', color: '#dc2626', bg: 'rgba(220,38,38,0.1)' },
                      { icon: 'fa-receipt', val: transactions.length, lbl: 'Transactions', color: '#2563eb', bg: 'rgba(37,99,235,0.1)' },
                      { icon: 'fa-calendar-check', val: 'Apr 30', lbl: 'Due Date', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
                    ].map((s, i) => (
                      <div key={i} className="sd-stat-card">
                        <div className="sd-stat-icon" style={{ background: s.bg, color: s.color }}><i className={`fas ${s.icon}`}></i></div>
                        <div className="sd-stat-val" style={{ fontSize: s.val.toString().length > 8 ? '16px' : undefined }}>{s.val}</div>
                        <div className="sd-stat-lbl">{s.lbl}</div>
                      </div>
                    ))}
                  </div>

                  <div className="sd-card" style={{ marginTop: 24 }}>
                    <div className="sd-card-header"><span>Transaction History</span></div>
                    {transactions.length === 0
                      ? <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No transactions yet.</div>
                      : (
                        <div className="sd-table-wrapper">
                          <table className="sd-table">
                            <thead>
                              <tr><th>Date</th><th>Description</th><th>Method</th><th>Type</th><th>Amount (ZMW)</th></tr>
                            </thead>
                            <tbody>
                              {transactions.map((t, i) => (
                                <tr key={t.id || i}>
                                  <td>{t.date}</td>
                                  <td className="sd-td-bold">{t.desc}</td>
                                  <td style={{ color: '#94a3b8', fontSize: 12 }}>{t.method || '—'}</td>
                                  <td><Badge status={t.type} /></td>
                                  <td className={t.type === 'credit' ? 'text-credit' : 'text-debit'}>
                                    {t.type === 'credit' ? '+' : '-'}{ZMW(t.amount)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                  </div>
                </div>
              )}
              {/* ═══════════ EXAM DOCKET ═══════════ */}
              {activeTab === 'docket' && (
                <div className="sd-tab-fade">
                  <div className="sd-page-header">
                    <div>
                      <h2 className="sd-page-title">Exam Docket</h2>
                      <p className="sd-page-sub">{examDocket?.academicYear} · {examDocket?.semester}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <div className="sd-docket-view-toggle">
                        <button
                          className={`sd-toggle-btn ${docketView === 'docket' ? 'active' : ''}`}
                          onClick={() => setDocketView('docket')}
                        >
                          <i className="fas fa-id-card"></i> Docket
                        </button>
                        <button
                          className={`sd-toggle-btn ${docketView === 'timetable' ? 'active' : ''}`}
                          onClick={() => setDocketView('timetable')}
                        >
                          <i className="fas fa-calendar-week"></i> Timetable
                        </button>
                      </div>
                      {clearanceStatus?.cleared && (
                        <>
                          <button className="sd-btn sd-btn-primary" onClick={downloadDocketPdf} disabled={generatingPdf}>
                            {generatingPdf
                              ? <><i className="fas fa-circle-notch fa-spin"></i> Generating…</>
                              : <><i className="fas fa-download"></i> Download PDF</>}
                          </button>
                          <button className="sd-btn sd-btn-ghost" onClick={() => window.print()}>
                            <i className="fas fa-print"></i> Print
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* ── Clearance Status Banner ── */}
                  {clearanceStatus && (
                    <div className={`sd-clearance-banner ${clearanceStatus.cleared ? 'cleared' : 'blocked'}`}>
                      <div className="sd-clearance-icon">
                        <i className={`fas ${clearanceStatus.cleared ? 'fa-shield-alt' : 'fa-ban'}`}></i>
                      </div>
                      <div className="sd-clearance-body">
                        <div className="sd-clearance-title">
                          {clearanceStatus.cleared ? 'You are Cleared for Examinations' : 'Docket Access Blocked'}
                        </div>
                        {clearanceStatus.cleared
                          ? <div className="sd-clearance-sub">All clearance checks passed. Your exam docket is valid and ready to download.</div>
                          : (
                            <ul className="sd-clearance-reasons">
                              {clearanceStatus.blockedReasons.map((r, i) => (
                                <li key={i}><i className="fas fa-exclamation-circle"></i> {r}</li>
                              ))}
                            </ul>
                          )
                        }
                      </div>
                      <div className="sd-clearance-badge-wrap">
                        <span className={`sd-clearance-badge ${clearanceStatus.cleared ? 'badge-cleared' : 'badge-blocked'}`}>
                          <i className={`fas ${clearanceStatus.cleared ? 'fa-check' : 'fa-times'}`}></i>
                          {clearanceStatus.cleared ? 'Cleared' : 'Blocked'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* ── Clearance Checklist ── */}
                  {clearanceStatus && (
                    <div className="sd-clearance-checklist">
                      {Object.entries(clearanceStatus.details).map(([key, passed]) => {
                        const labels = {
                          fees: { icon: 'fa-money-bill-wave', label: 'Tuition Fees' },
                          library: { icon: 'fa-book', label: 'Library' },
                          hostel: { icon: 'fa-home', label: 'Hostel' },
                          academic: { icon: 'fa-graduation-cap', label: 'Academic Standing' },
                        };
                        const info = labels[key] || { icon: 'fa-circle', label: key };
                        return (
                          <div key={key} className={`sd-clearance-check-item ${passed ? 'passed' : 'failed'}`}>
                            <div className="sd-cc-icon">
                              <i className={`fas ${info.icon}`}></i>
                            </div>
                            <div className="sd-cc-info">
                              <div className="sd-cc-label">{info.label}</div>
                              <div className="sd-cc-status">{passed ? 'Cleared' : 'Not Cleared'}</div>
                            </div>
                            <i className={`fas ${passed ? 'fa-check-circle' : 'fa-times-circle'} sd-cc-result`}></i>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* ── DOCKET VIEW ── */}
                  {docketView === 'docket' && (
                    <>
                      {!clearanceStatus?.cleared && (
                        <div className="sd-docket-blocked">
                          <i className="fas fa-lock"></i>
                          <h3>Docket Unavailable</h3>
                          <p>Your exam docket cannot be viewed or downloaded until all clearance holds are resolved. Please visit the relevant offices to clear your account.</p>
                        </div>
                      )}

                      {clearanceStatus?.cleared && (
                        <div className="sd-docket-card" ref={docketRef}>
                          {/* Docket Header */}
                          <div className="sd-docket-header">
                            <div className="sd-docket-logo">
                              <div className="sd-docket-logo-icon"><i className="fas fa-graduation-cap"></i></div>
                              <div>
                                <div className="sd-docket-university">Fairview University College</div>
                                <div className="sd-docket-type">OFFICIAL EXAMINATION DOCKET</div>
                              </div>
                            </div>
                            <div className="sd-docket-header-right">
                              <div className="sd-docket-qr-wrapper">
                                <QRCodeCanvas
                                  value={JSON.stringify({
                                    id: student.id,
                                    name: student.name,
                                    sem: examDocket?.semester,
                                    year: examDocket?.academicYear,
                                    v: 'Fairview-verified'
                                  })}
                                  size={90}
                                  level="H"
                                  includeMargin={false}
                                  className="sd-docket-qr-img"
                                />
                                <span className="sd-qr-caption">Scan to Verify</span>
                              </div>
                              <div className="sd-docket-header-meta">
                                <span className="sd-clearance-badge badge-cleared">
                                  <i className="fas fa-check"></i> Cleared
                                </span>
                                <div className="sd-docket-period">
                                  <i className="fas fa-calendar"></i> {examDocket?.examPeriod}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Student Info */}
                          <div className="sd-docket-info-grid">
                            {[
                              ['Full Name', student.name],
                              ['Student ID', student.id],
                              ['Programme', student.program || profile?.program || '—'],
                              ['School', student.school || profile?.school || '—'],
                              ['Academic Year', examDocket?.academicYear],
                              ['Semester', examDocket?.semester],
                            ].map(([k, v]) => (
                              <div key={k} className="sd-docket-info-item">
                                <span className="sd-docket-info-key">{k}</span>
                                <span className="sd-docket-info-val">{v || '—'}</span>
                              </div>
                            ))}
                          </div>

                          {/* Exam Table */}
                          <div className="sd-docket-table-wrap">
                            <div className="sd-docket-table-title">
                              <i className="fas fa-clipboard-list"></i> Registered Examinations
                            </div>
                            {(!examDocket?.exams || examDocket.exams.length === 0) ? (
                              <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                                No exams found. Please register your courses first.
                              </div>
                            ) : (
                              <table className="sd-docket-table">
                                <thead>
                                  <tr>
                                    <th>#</th>
                                    <th>Course Code</th>
                                    <th>Course Title</th>
                                    <th>Date</th>
                                    <th>Time</th>
                                    <th>Venue</th>
                                    <th>Seat No.</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {examDocket.exams.map((ex, i) => (
                                    <tr key={ex.code + i}>
                                      <td className="sd-docket-num">{i + 1}</td>
                                      <td><span className="sd-code">{ex.code}</span></td>
                                      <td className="sd-td-bold">{ex.name}</td>
                                      <td>{ex.date ? new Date(ex.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                                      <td><span className="sd-docket-time">{ex.time}</span></td>
                                      <td>{ex.venue}</td>
                                      <td><span className="sd-docket-seat">{ex.seat}</span></td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>

                          {/* Footer */}
                          <div className="sd-docket-footer">
                            <div>
                              <i className="fas fa-info-circle"></i>
                              This docket must be presented at the examination hall. Issued: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </div>
                            <div>Fairview University College · Academic Registrar's Office</div>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* ── TIMETABLE VIEW ── */}
                  {docketView === 'timetable' && (
                    <div className="sd-card" style={{ marginTop: 0 }}>
                      <div className="sd-card-header">
                        <span>Exam Timetable</span>
                        <span className="sd-badge badge-teal">{examDocket?.exams?.length || 0} exams</span>
                      </div>
                      {(!examDocket?.exams || examDocket.exams.length === 0) ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                          <i className="fas fa-calendar-times" style={{ fontSize: 40, marginBottom: 12, display: 'block' }}></i>
                          No exams scheduled. Register your courses first.
                        </div>
                      ) : (
                        <div className="sd-exam-timeline">
                          {[...examDocket.exams]
                            .sort((a, b) => new Date(a.date) - new Date(b.date))
                            .map((ex, i) => {
                              const d = new Date(ex.date);
                              const isUpcoming = d >= new Date();
                              const colors = ['#0d9488', '#7c3aed', '#2563eb', '#f59e0b', '#dc2626', '#10b981', '#ec4899', '#6366f1'];
                              return (
                                <div key={ex.code + i} className={`sd-exam-event ${isUpcoming ? 'upcoming' : 'past'}`}>
                                  <div className="sd-exam-event-date" style={{ background: colors[i % colors.length] }}>
                                    <div className="sd-eed-day">{d.toLocaleDateString('en-GB', { day: '2-digit' })}</div>
                                    <div className="sd-eed-mon">{d.toLocaleDateString('en-GB', { month: 'short' })}</div>
                                  </div>
                                  <div className="sd-exam-event-body">
                                    <div className="sd-eeb-course">
                                      <span className="sd-code" style={{ fontSize: 11 }}>{ex.code}</span>
                                      <span className="sd-eeb-name">{ex.name}</span>
                                    </div>
                                    <div className="sd-eeb-meta">
                                      <span><i className="fas fa-clock"></i> {ex.time}</span>
                                      <span><i className="fas fa-map-marker-alt"></i> {ex.venue}</span>
                                      <span><i className="fas fa-chair"></i> Seat {ex.seat}</span>
                                    </div>
                                  </div>
                                  <div className="sd-exam-event-status">
                                    <span className={`sd-badge ${isUpcoming ? 'badge-teal' : 'badge-gold'}`}>
                                      {isUpcoming ? 'Upcoming' : 'Completed'}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ═══════════ HOSTEL & ACCOMMODATION ═══════════ */}
              {activeTab === 'hostel' && (
                <div className="sd-tab-fade">
                  <div className="sd-page-header">
                    <div>
                      <h2 className="sd-page-title">Hostel & Accommodation</h2>
                      <p className="sd-page-sub">Book your on-campus or off-campus housing</p>
                    </div>
                  </div>

                  <div className="sd-stats-row">
                    {[
                      { icon: 'fa-bed', val: profile?.hostelRoom || 'Not Assigned', lbl: 'Current Room', color: '#0d9488', bg: 'rgba(13,148,136,0.12)' },
                      { icon: 'fa-building', val: profile?.hostelName || 'None', lbl: 'Hostel Block', color: '#7c3aed', bg: 'rgba(124,58,237,0.12)' },
                      { icon: 'fa-user-friends', val: '2/4', lbl: 'Roommates', color: '#2563eb', bg: 'rgba(37,99,235,0.12)' },
                      { icon: 'fa-receipt', val: profile?.hostelCleared ? 'Paid' : 'Pending', lbl: 'Housing Status', color: profile?.hostelCleared ? '#10b981' : '#dc2626', bg: profile?.hostelCleared ? 'rgba(16,185,129,0.12)' : 'rgba(220,38,38,0.12)' },
                    ].map((s) => (
                      <div key={s.lbl} className="sd-stat-card">
                        <div className="sd-stat-icon" style={{ background: s.bg, color: s.color }}>
                          <i className={`fas ${s.icon}`}></i>
                        </div>
                        <div className="sd-stat-val">{s.val}</div>
                        <div className="sd-stat-lbl">{s.lbl}</div>
                      </div>
                    ))}
                  </div>

                  <div className="sd-card" style={{ marginTop: 24 }}>
                    <div className="sd-card-header">
                      <span>Available Hostels</span>
                    </div>
                    <div className="sd-card-body">
                      <div className="sd-hostel-grid">
                        {[
                          { id: 'h1', name: 'Kafue Block', type: 'Male', capacity: '4 per room', price: 4500, status: 'Available', features: ['WiFi', 'Common Room', 'Laundry'] },
                          { id: 'h2', name: 'Zambezi Block', type: 'Female', capacity: '2 per room', price: 6500, status: 'Limited', features: ['WiFi', 'En-suite', 'Kitchenette'] },
                          { id: 'h3', name: 'Luangwa Block', type: 'Male', capacity: '2 per room', price: 6000, status: 'Full', features: ['WiFi', 'Study Area', 'Gym Access'] },
                          { id: 'h4', name: 'Victoria Falls Wing', type: 'Female', capacity: '1 per room', price: 9500, status: 'Available', features: ['WiFi', 'Premium Lounge', 'Air-con'] },
                        ].map((h) => (
                          <div key={h.id} className="sd-hostel-card">
                            <div className="sd-hostel-img-placeholder">
                              <i className="fas fa-building"></i>
                              {h.status === 'Limited' && <span className="sd-hostel-tag-limited">Limited</span>}
                              {h.status === 'Full' && <span className="sd-hostel-tag-full">Full</span>}
                            </div>
                            <div className="sd-hostel-content">
                              <div className="sd-hostel-row-top">
                                <span className={`sd-hostel-type-badge ${h.type.toLowerCase()}`}>{h.type}</span>
                                <span className="sd-hostel-price-tag">{ZMW(h.price)}</span>
                              </div>
                              <h3 className="sd-hostel-name">{h.name}</h3>
                              <p className="sd-hostel-capacity"><i className="fas fa-users"></i> {h.capacity}</p>
                              <div className="sd-hostel-features">
                                {h.features.map(f => <span key={f} className="sd-hostel-feat-tag">{f}</span>)}
                              </div>
                              <button
                                className={`sd-btn ${h.status === 'Full' ? 'sd-btn-ghost' : 'sd-btn-primary'} sd-hostel-btn`}
                                disabled={h.status === 'Full'}
                                onClick={() => { setSelectedHostel(h); setShowHostelModal(true); }}
                              >
                                {h.status === 'Full' ? 'Hostel Full' : 'Book Accomodation'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </>
          )}
        </main>
      </div>

      {/* ════════════ PAY MODAL ════════════ */}
      {showPayModal && (
        <div className="sd-modal-overlay" onClick={closePayModal}>
          <div className="sd-modal" onClick={e => e.stopPropagation()}>
            <div className="sd-modal-head">
              <h3><i className="fas fa-credit-card"></i> Pay Fees</h3>
              <button className="sd-close-btn" onClick={closePayModal}>&times;</button>
            </div>

            <div className="sd-pay-steps">
              {[1, 2, 3, 4].map(s => (
                <div key={s} className={`sd-pay-step-dot ${payStep >= s ? 'active' : ''}`}></div>
              ))}
            </div>

            {/* Step 1: Amount & Desc */}
            {payStep === 1 && (
              <form onSubmit={handlePay} className="sd-modal-form">
                <label>Amount (ZMW – K)</label>
                <input
                  type="number" placeholder="e.g. 5000"
                  value={payAmount} onChange={e => setPayAmount(e.target.value)}
                  required min="1" autoFocus
                />
                <label>Description (optional)</label>
                <input
                  type="text" placeholder="e.g. Semester Tuition"
                  value={payDesc} onChange={e => setPayDesc(e.target.value)}
                />
                <div className="sd-modal-info">
                  <i className="fas fa-info-circle"></i> Outstanding: <strong>{ZMW(balanceDue)}</strong>
                </div>
                <div className="sd-modal-actions">
                  <button type="button" className="sd-btn sd-btn-ghost" onClick={closePayModal}>Cancel</button>
                  <button type="submit" className="sd-btn sd-btn-primary">Next Step <i className="fas fa-arrow-right"></i></button>
                </div>
              </form>
            )}

            {/* Step 2: Method & Details */}
            {payStep === 2 && (
              <div className="sd-modal-form">
                <label>Select Payment Method</label>
                <div className="sd-payment-methods-grid">
                  {[
                    { id: 'mobile_money', icon: 'fa-mobile-alt', label: 'Mobile Money' },
                    { id: 'card', icon: 'fa-credit-card', label: 'Card' },
                    { id: 'bank_transfer', icon: 'fa-university', label: 'Bank Transfer' },
                    { id: 'cash', icon: 'fa-money-bill-wave', label: 'Cash' },
                  ].map(m => (
                    <div
                      key={m.id}
                      className={`sd-method-card ${payMethod === m.id ? 'active' : ''}`}
                      onClick={() => setPayMethod(m.id)}
                    >
                      <i className={`fas ${m.icon}`}></i>
                      <span>{m.label}</span>
                    </div>
                  ))}
                </div>

                {payMethod === 'card' && (
                  <div className="sd-tab-fade">
                    <div className="sd-card-preview">
                      <div className="sd-card-chip"></div>
                      <div className="sd-card-number-view">
                        {cardData.number || '•••• •••• •••• ••••'}
                      </div>
                      <div className="sd-card-bottom">
                        <div>
                          <div className="sd-card-label">Card Holder</div>
                          <div className="sd-card-holder-view">{cardData.name || student.name}</div>
                        </div>
                        <div>
                          <div className="sd-card-label">Expires</div>
                          <div className="sd-card-expiry-view">{cardData.expiry || 'MM/YY'}</div>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div style={{ gridColumn: 'span 2' }}>
                        <label>Card Number</label>
                        <input
                          type="text" placeholder="0000 0000 0000 0000"
                          maxLength="19"
                          value={cardData.number}
                          onChange={e => setCardData({ ...cardData, number: e.target.value.replace(/\W/gi, '').replace(/(.{4})/g, '$1 ').trim() })}
                        />
                      </div>
                      <div>
                        <label>Expiry Date</label>
                        <input
                          type="text" placeholder="MM/YY" maxLength="5"
                          value={cardData.expiry}
                          onChange={e => setCardData({ ...cardData, expiry: e.target.value })}
                        />
                      </div>
                      <div>
                        <label>CVC</label>
                        <input type="password" placeholder="***" maxLength="3" />
                      </div>
                    </div>
                  </div>
                )}

                {payMethod === 'mobile_money' && (
                  <div className="sd-tab-fade">
                    <label>Mobile Number</label>
                    <input type="tel" placeholder="+260 97..." defaultValue={student.phone} />
                    <p style={{ fontSize: '11px', color: '#64748b', marginTop: '8px' }}>
                      <i className="fas fa-info-circle"></i> A push notification will be sent to your phone to authorize the payment.
                    </p>
                  </div>
                )}

                <div className="sd-modal-actions">
                  <button type="button" className="sd-btn sd-btn-ghost" onClick={() => setPayStep(1)}>Back</button>
                  <button type="button" className="sd-btn sd-btn-primary" onClick={() => handlePay()}>
                    Pay {ZMW(payAmount)}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Processing */}
            {payStep === 3 && (
              <div className="sd-processing-box">
                <div className="sd-processing-ring"><div></div><div></div><div></div><div></div></div>
                <h4>Processing Payment...</h4>
                <p className="sd-modal-hint">Please wait while we secure your transaction with {payMethod.replace('_', ' ')}.</p>
                <div className="sd-progress-bar-wrap">
                  <div className="sd-progress-bar-fill" style={{ width: `${payProgress}%` }}></div>
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '10px' }}>{payProgress}% securely encrypted</div>
              </div>
            )}

            {/* Step 4: Success */}
            {payStep === 4 && (
              <div className="sd-tab-fade" style={{ textAlign: 'center' }}>
                <div className="sd-success-check">
                  <i className="fas fa-check"></i>
                </div>
                <h3 style={{ color: '#0d9488', fontSize: '22px', marginBottom: '10px' }}>Payment Successful!</h3>
                <p className="sd-modal-hint">Thank you for your payment. Your student account has been updated.</p>

                <div className="sd-receipt-card">
                  <div className="sd-receipt-row"><span>Receipt No:</span><span className="sd-receipt-val">{paySuccessMsg}</span></div>
                  <div className="sd-receipt-row"><span>Amount Paid:</span><span className="sd-receipt-val">{ZMW(payAmount)}</span></div>
                  <div className="sd-receipt-row"><span>Date:</span><span className="sd-receipt-val">{new Date().toLocaleDateString()}</span></div>
                  <div className="sd-receipt-row"><span>Method:</span><span className="sd-receipt-val" style={{ textTransform: 'capitalize' }}>{payMethod.replace('_', ' ')}</span></div>
                  <div className="sd-receipt-row" style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
                    <span>New Balance:</span><span className="sd-receipt-val">{ZMW(balanceDue)}</span>
                  </div>
                </div>

                <div className="sd-modal-actions" style={{ justifyContent: 'center' }}>
                  <button className="sd-btn sd-btn-primary" onClick={closePayModal}>Done</button>
                  <button className="sd-btn sd-btn-ghost" onClick={() => window.print()}><i className="fas fa-print"></i> Print Receipt</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════ REGISTER MODAL ════════════ */}
      {showRegModal && (
        <div className="sd-modal-overlay" onClick={() => setShowRegModal(false)}>
          <div className="sd-modal" onClick={e => e.stopPropagation()}>
            <div className="sd-modal-head">
              <h3><i className="fas fa-book-open"></i> Add Courses</h3>
              <button className="sd-close-btn" onClick={() => setShowRegModal(false)}>&times;</button>
            </div>

            {regSuccessMsg ? (
              <div className={`sd-success-msg ${regSuccessMsg.startsWith('Error') ? 'sd-err-msg' : ''}`}>
                <i className={`fas ${regSuccessMsg.startsWith('Error') ? 'fa-times-circle' : 'fa-check-circle'}`}></i><br />
                {regSuccessMsg.startsWith('Error') ? 'Registration Failed' : 'Registered!'}<br />
                <small>{regSuccessMsg}</small>
              </div>
            ) : (
              <>
                <p className="sd-modal-hint">Select courses to add to your registration:</p>
                <div className="sd-course-list">
                  {availableCourses
                    .filter(ac => !courses.some(c => c.code === ac.code))
                    .map(c => (
                      <div
                        key={c.id}
                        className={`sd-course-option ${regSelected.includes(c.id) ? 'selected' : ''}`}
                        onClick={() => toggleCourse(c.id)}
                      >
                        <div>
                          <div className="sd-co-name">{c.name}</div>
                          <div className="sd-co-meta">{c.code} · {c.units} units · {c.lecturer}</div>
                        </div>
                        <div className="sd-co-check">
                          <i className={`fas ${regSelected.includes(c.id) ? 'fa-check-circle' : 'fa-circle'}`}></i>
                        </div>
                      </div>
                    ))}
                  {availableCourses.filter(ac => !courses.some(c => c.code === ac.code)).length === 0 && (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                      All available courses are already registered.
                    </div>
                  )}
                </div>
                <div className="sd-modal-actions">
                  <button type="button" className="sd-btn sd-btn-ghost" onClick={() => setShowRegModal(false)}>Cancel</button>
                  <button
                    type="button" className="sd-btn sd-btn-primary"
                    onClick={handleRegister}
                    disabled={regSelected.length === 0 || registeringCourse}
                  >
                    {registeringCourse
                      ? <><i className="fas fa-circle-notch fa-spin"></i> Registering…</>
                      : `Register ${regSelected.length > 0 ? `(${regSelected.length})` : ''}`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ════════════ HOSTEL BOOKING MODAL ════════════ */}
      {showHostelModal && (
        <div className="sd-modal-overlay" onClick={() => setShowHostelModal(false)}>
          <div className="sd-modal" onClick={e => e.stopPropagation()}>
            <div className="sd-modal-head">
              <h3><i className="fas fa-hotel"></i> Confirm Booking</h3>
              <button className="sd-close-btn" onClick={() => setShowHostelModal(false)}>&times;</button>
            </div>

            {bookingSuccessMsg ? (
              <div className="sd-success-msg">
                <i className="fas fa-check-circle"></i><br />
                Application Submitted!<br />
                <small>{bookingSuccessMsg}</small>
              </div>
            ) : (
              <div className="sd-modal-form">
                <div className="sd-booking-summary">
                  <div className="sd-bs-item"><span>Selected Hostel:</span><strong>{selectedHostel?.name}</strong></div>
                  <div className="sd-bs-item"><span>Room Type:</span><strong>{selectedHostel?.capacity}</strong></div>
                  <div className="sd-bs-item"><span>Semester Fee:</span><strong className="text-credit">{ZMW(selectedHostel?.price || 0)}</strong></div>
                </div>

                <div className="sd-notice-box">
                  <i className="fas fa-info-circle"></i>
                  <p>By clicking confirm, you agree to the university housing terms and conditions. The fee will be added to your outstanding balance.</p>
                </div>

                <div className="sd-modal-actions">
                  <button type="button" className="sd-btn sd-btn-ghost" onClick={() => setShowHostelModal(false)}>Cancel</button>
                  <button
                    type="button" className="sd-btn sd-btn-primary"
                    onClick={async () => {
                      setBookingHostel(true);
                      // Simulate booking process
                      setTimeout(async () => {
                        try {
                          // Update student record with hostel info
                          await updateDoc(doc(db, 'students', uid), {
                            hostelName: selectedHostel.name,
                            hostelRoom: `Room ${Math.floor(Math.random() * 100) + 101}`,
                            hostelCleared: false,
                            updatedAt: serverTimestamp()
                          });

                          // Add a transaction for the hostel fee
                          const txCol = collection(db, 'students', uid, 'transactions');
                          await addDoc(txCol, {
                            date: new Date().toISOString().split('T')[0],
                            desc: `Hostel Fee – ${selectedHostel.name}`,
                            type: 'debit',
                            amount: selectedHostel.price,
                            createdAt: serverTimestamp(),
                          });

                          await loadData();
                          setBookingSuccessMsg(`Your application for ${selectedHostel.name} has been processed. Access details updated.`);
                          setTimeout(() => {
                            setBookingSuccessMsg('');
                            setShowHostelModal(false);
                            setActiveTab('home');
                          }, 3000);
                        } catch (err) {
                          alert("Error booking hostel: " + err.message);
                        } finally {
                          setBookingHostel(false);
                        }
                      }, 1500);
                    }}
                    disabled={bookingHostel}
                  >
                    {bookingHostel ? <><i className="fas fa-circle-notch fa-spin"></i> Processing…</> : 'Confirm Booking'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════ PROFILE MODAL ════════════ */}
      {showProfileModal && (
        <div className="sd-modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="sd-modal" onClick={e => e.stopPropagation()}>
            <div className="sd-modal-head">
              <h3><i className="fas fa-user-cog"></i> Account Settings</h3>
              <button className="sd-close-btn" onClick={() => setShowProfileModal(false)}>&times;</button>
            </div>

            {profileSuccessMsg ? (
              <div className={`sd-success-msg ${profileSuccessMsg.startsWith('Error') ? 'sd-err-msg' : ''}`}>
                <i className={`fas ${profileSuccessMsg.startsWith('Error') ? 'fa-times-circle' : 'fa-check-circle'}`}></i><br />
                <small>{profileSuccessMsg}</small>
              </div>
            ) : (
              <>
                <div className="sd-profile-modal-top">
                  <div className="sd-avatar-xl">{student.initials}</div>
                  <div>
                    <div className="sd-pm-name">{student.name}</div>
                    <div className="sd-pm-email">{student.email}</div>
                    <div className="sd-pm-id">{student.id}</div>
                  </div>
                </div>
                <form onSubmit={handleSaveProfile} className="sd-modal-form">
                  <label>Full Name</label>
                  <input
                    type="text" value={profileForm.name || ''}
                    onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))}
                    required
                  />
                  <label>Email (read-only)</label>
                  <input type="email" value={profileForm.email || ''} readOnly style={{ background: '#f8fafc', color: '#94a3b8' }} />
                  <label>Phone Number</label>
                  <input
                    type="tel" placeholder="+260 97 000 0000"
                    value={profileForm.phone || ''}
                    onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                  />
                  <label>Program</label>
                  <input
                    type="text"
                    value={profileForm.program || ''}
                    onChange={e => setProfileForm(p => ({ ...p, program: e.target.value }))}
                  />
                  <div className="sd-modal-actions">
                    <button type="button" className="sd-btn sd-btn-ghost" onClick={() => setShowProfileModal(false)}>Cancel</button>
                    <button type="submit" className="sd-btn sd-btn-primary" disabled={savingProfile}>
                      {savingProfile ? <><i className="fas fa-circle-notch fa-spin"></i> Saving…</> : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
