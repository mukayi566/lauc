import React, { useState, useEffect, useCallback, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, getDocs, addDoc, onSnapshot,
  serverTimestamp, query, orderBy, where
} from 'firebase/firestore';
import { db } from '../firebase';
import '../dashboards.css';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import toast from 'react-hot-toast';
import StudentExamView from '../components/lecturer/StudentExamView';
import PaymentGate from '../components/PaymentGate';
import { usePaymentGate } from '../hooks/usePaymentGate';

/* ─────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────── */
const ZMW = (amount) => {
  const isNeg = Number(amount) < 0;
  const abs = Math.abs(Number(amount));
  const val = abs.toLocaleString('en-ZM', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${isNeg ? '-' : ''}K ${val}`;
};

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
  const [examSuccessMsg, setExamSuccessMsg] = useState('');
  const [showPasswordForce, setShowPasswordForce] = useState(false);
  const [passForm, setPassForm] = useState({ new: '', confirm: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [payingFee, setPayingFee] = useState(false);
  const [registeringCourse, setRegisteringCourse] = useState(false);
  const [selectedHostel, setSelectedHostel] = useState(null);
  const [bookingHostel, setBookingHostel] = useState(false);
  const [bookingSuccessMsg, setBookingSuccessMsg] = useState('');
  const [appeals, setAppeals] = useState([]);
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [submittingAppeal, setSubmittingAppeal] = useState(false);
  const [appealForm, setAppealForm] = useState({ courseCode: '', courseName: '', result: '', reason: '', evidenceUrl: '' });
  const [appealStep, setAppealStep] = useState(1); // 1: Form, 2: Payment, 3: Success

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
  const [liveSessions, setLiveSessions] = useState([]);

  /* ── Exam Docket state ── */
  const [examDocket, setExamDocket] = useState(null);
  const [clearanceStatus, setClearanceStatus] = useState(null);
  const [docketView, setDocketView] = useState('docket'); // 'docket' | 'timetable'
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const docketRef = useRef(null);

  const uid = currentUser?.uid;

  // ── 50% Payment Gate (real-time, Finance-verified) ──
  const payGate = usePaymentGate(uid);

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

      // Fetch Verified Payments for balanced calculation
      const vPayQuery = query(collection(db, 'payments'), where('studentUid', '==', uid), where('status', '==', 'Verified'));
      const vSnap = await getDocs(vPayQuery);
      const totalVerifiedPaid = vSnap.docs.reduce((acc, d) => acc + (Number(d.data().amount) || 0), 0);

      // Total billed (Debits) - Use a fallback of 15,000 if no debits are found
      const FALLBACK_FEE = 15000;
      const dbDebits = loadedTx.reduce((s, t) => (t.type === 'debit' ? s + (Number(t.amount) || 0) : s), 0);
      const totalDebits = dbDebits || FALLBACK_FEE;

      // Unified DB-driven balance: Total Debits - Verified Payments
      // Allows negative values to show credit balance if overpaid (e.g. -800)
      const currentBalance = totalDebits - totalVerifiedPaid;
      setBalanceDue(currentBalance);

      /* ── exam docket ── */
      const is50PercentMet = totalVerifiedPaid >= (totalDebits * 0.5);

      const docketRef2 = doc(db, 'students', uid, 'examDocket', 'current');
      const docketSnap = await getDoc(docketRef2);
      let docketData;
      if (!docketSnap.exists()) {
        docketData = {
          academicYear: '2025/2026',
          semester: 'Semester 2',
          examPeriod: 'June 9 – June 27, 2026',
          clearance: {
            fees: is50PercentMet,
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
        // Dynamically update fees clearance based on 50% threshold
        if (docketData.clearance) {
          docketData.clearance.fees = is50PercentMet;
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

      /* ── appeals ── */
      const appealsQuery = query(collection(db, 'appeals'), where('studentUid', '==', uid));
      const appealsSnap = await getDocs(appealsQuery);
      setAppeals(appealsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
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
      toast.error("Passwords do not match");
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
      toast.success("Password updated successfully!");
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/requires-recent-login') {
        toast.error('For security reasons, please log out and log back in before changing your password.');
      } else {
        toast.error("Error updating password: " + err.message);
      }
    }
  };

  useEffect(() => { loadData(); }, [loadData]);

  // Separate effect for real-time virtual classes (active and ended today)
  useEffect(() => {
    if (!uid || courses.length === 0) return;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const q = query(
      collection(db, 'virtual_classes'),
      where('startTime', '>=', startOfToday)
    );

    const unsub = onSnapshot(q, (snap) => {
      const sessions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const studentCourseCodes = courses.map(c => c.code || c.id);
      const relevant = sessions.filter(s => studentCourseCodes.includes(s.course));

      // Dynamic notification for new LIVE classes
      relevant.forEach(session => {
        if (session.status === 'active' && !liveSessions.find(s => s.id === session.id && s.status === 'active')) {
          toast.success(`LIVE NOW: ${session.course} has started!`, {
            duration: 6000,
            icon: '📡',
            style: {
              borderRadius: '10px',
              background: '#065f46',
              color: '#fff',
              fontWeight: 'bold',
            },
          });
        }
      });

      setLiveSessions(relevant);
    });

    return () => unsub();
  }, [uid, courses]);

  const logout = async () => { await signOut(); navigate('/login'); };

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = async () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    try {
      for (const n of notifications) {
        if (!n.read && n.id) {
          await updateDoc(doc(db, 'students', uid, 'notifications', n.id), { read: true });
        }
      }
    } catch (err) {
      console.error("Error marking all read:", err);
    }
  };

  const deleteNotification = async (id) => {
    // Optimistic update
    setNotifications(prev => prev.filter(n => n.id !== id));
    try {
      await deleteDoc(doc(db, 'students', uid, 'notifications', id));
      toast.success("Notification deleted", { duration: 2000 });
    } catch (err) {
      console.error("Error deleting notification:", err);
      toast.error("Failed to delete notification");
      // Revert if failed? (Optional, usually deletions are safe to leave optimized)
    }
  };

  const clearAllNotifications = async () => {
    if (notifications.length === 0) return;
    if (!window.confirm("Are you sure you want to clear all notifications?")) return;

    const ids = notifications.map(n => n.id);
    setNotifications([]); // Optimistic update

    try {
      // Direct deletion from Firestore for each
      const promises = ids.map(id => deleteDoc(doc(db, 'students', uid, 'notifications', id)));
      await Promise.all(promises);
      toast.success("Notifications cleared");
    } catch (err) {
      console.error("Error clearing notifications:", err);
      toast.error("Failed to clear some notifications");
    }
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
          const receiptNo = `TX-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
          const methodLabel = payMethod === 'mobile_money' ? 'Mobile Money' : payMethod === 'card' ? 'Card' : 'Bank Transfer';

          const newTx = {
            date: today,
            desc: payDesc || `Tuition Payment – ${methodLabel}`,
            type: 'credit',
            amount: amt,
            method: methodLabel,
            createdAt: serverTimestamp(),
          };
          await addDoc(txCol, newTx);

          // ──────────────────────────────────────────────────────
          // Write to top-level 'payments' collection so Finance
          // Dashboard sees it in real-time via its onSnapshot listener
          // ──────────────────────────────────────────────────────
          await addDoc(collection(db, 'payments'), {
            studentId: student.id,
            studentName: student.name,
            studentUid: uid,
            amount: amt,
            method: methodLabel,
            date: today,
            receiptNo: receiptNo,
            desc: payDesc || `Tuition Payment – ${methodLabel}`,
            status: 'Pending',   // Finance officer can verify/update
            createdAt: serverTimestamp(),
          });

          // refresh transactions & balance
          const txSnap = await getDocs(query(txCol, orderBy('date', 'desc')));
          const loadedTx = txSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          setTransactions(loadedTx);
          const bal = loadedTx.reduce((s, t) => {
            const a = Number(t.amount) || 0;
            return t.type === 'credit' ? s - a : s + a;
          }, 0);
          setBalanceDue(bal);

          setPayStep(4);
          setPaySuccessMsg(`Receipt #${receiptNo}`);
          await loadData();
        } catch (err) {
          console.error('Pay error:', err);
          setPayStep(1);
          toast.error("Error processing payment. Please try again.");
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
      const newCourseCodes = [];

      for (const id of regSelected) {
        const found = availableCourses.find(c => c.id === id);
        if (found) {
          const courseCode = found.code || found.id;
          newCourseCodes.push(courseCode);

          await addDoc(coursesCol, {
            ...found,
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

      // Update student's top-level enrolledIn array for faster staff lookup
      if (newCourseCodes.length > 0) {
        const studentRef = doc(db, 'students', uid);
        const currentEnrolled = profile?.enrolledIn || [];
        const updatedEnrolled = [...new Set([...currentEnrolled, ...newCourseCodes])];
        await updateDoc(studentRef, { enrolledIn: updatedEnrolled });
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

  /* Appeal Actions */
  const openAppealForm = (result) => {
    setAppealForm({
      courseCode: result.courseCode,
      courseName: result.courseName,
      result: result.grade,
      reason: '',
      evidenceUrl: '',
      resultId: result.id
    });
    setAppealStep(1);
    setShowAppealModal(true);
  };

  const handleAppealPayment = async () => {
    setSubmittingAppeal(true);
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 1. Create Transaction for Finance
      const txCol = collection(db, 'students', uid, 'transactions');
      const today = new Date().toISOString().split('T')[0];
      const receiptNo = `APL-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      const newTx = {
        date: today,
        desc: `Appeal Fee – ${appealForm.courseCode}`,
        type: 'credit',
        amount: 500,
        method: 'Online Payment',
        createdAt: serverTimestamp(),
      };
      await addDoc(txCol, newTx);

      // 2. Submit Appeal
      const appealData = {
        ...appealForm,
        studentUid: uid,
        studentId: student.id,
        studentName: student.name,
        studentEmail: student.email,
        status: 'Pending',
        paymentStatus: 'Paid',
        receiptNo: receiptNo,
        timestamp: serverTimestamp(),
      };
      await addDoc(collection(db, 'appeals'), appealData);

      // Refresh data
      await loadData();
      setAppealStep(3);
      toast.success("Appeal submitted successfully!");
      setTimeout(() => {
        setShowAppealModal(false);
      }, 3000);
    } catch (err) {
      console.error('Appeal error:', err);
      toast.error("Error submitting appeal. Please try again.");
    } finally {
      setSubmittingAppeal(false);
    }
  };

  const openAppealUpload = () => {
    if (!window.cloudinary) {
      toast.error("Cloudinary not loaded. Please try again later.");
      return;
    }
    window.cloudinary.openUploadWidget(
      {
        cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
        uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
        sources: ['local', 'url'],
        multiple: false,
        resourceType: 'auto',
      },
      (error, result) => {
        if (!error && result && result.event === "success") {
          setAppealForm(prev => ({ ...prev, evidenceUrl: result.info.secure_url }));
          toast.success('Evidence uploaded successfully!');
        }
      }
    );
  };

  /* Download result stub */
  const downloadResult = (sem) => {
    setDownloadMsg(`Transcript for "${sem}" is being prepared for download.`);
    setTimeout(() => setDownloadMsg(''), 3000);
  };

  /* ── derived values ── */
  const student = {
    uid: uid,
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

  const creditHours = courses.reduce((s, c) => s + (Number(c.credits || c.units) || 0), 0);

  /* ══ Nav items ══ */
  const navItems = [
    { id: 'home', icon: 'fa-home', label: 'Dashboard', group: 'Main' },
    { id: 'analytics', icon: 'fa-chart-line', label: 'Academic Analytics', group: 'Main' },
    { id: 'learning', icon: 'fa-brain', label: 'Personalized Learning', group: 'Main' },
    { id: 'courses', icon: 'fa-book-open', label: 'Register Courses', group: 'Academics' },
    { id: 'results', icon: 'fa-chart-bar', label: 'Results', group: 'Academics' },
    { id: 'appeals', icon: 'fa-gavel', label: 'Exam Appeals', group: 'Academics' },
    { id: 'timetable', icon: 'fa-calendar-alt', label: 'Timetable', group: 'Academics' },
    { id: 'online-exams', icon: 'fa-laptop', label: 'Online Exams', group: 'Academics' },
    { id: 'elearning', icon: 'fa-graduation-cap', label: 'E-Learning platform', group: 'Academics' },
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
      // Ensure images are loaded before capturing
      const images = docketRef.current.querySelectorAll('img');
      await Promise.all([...images].map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = resolve; // Continue anyway
        });
      }));

      const canvas = await html2canvas(docketRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff', allowTaint: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = (canvas.height * pdfW) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
      pdf.save(`ExamDocket_${student.id}_${examDocket?.semester?.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
    } catch (err) {
      console.error('PDF error:', err);
      toast.error('Could not generate PDF. Please try again.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  /* ══════════════════════════════════════════════
     SIDEBAR
  ══════════════════════════════════════════════ */
  const sidebar = (
    <div className={`sd-sidebar ${sidebarOpen ? 'open' : ''}`}>
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
                onClick={e => {
                  e.preventDefault();
                  if (item.id === 'elearning') {
                    if (!payGate.hasAccess && !payGate.loading) {
                      toast.error(
                        'Pay at least 50% of your fees to access E-Learning.',
                        { icon: '🔒', duration: 4000 }
                      );
                    } else {
                      navigate('/elearning');
                    }
                  } else if (item.id === 'docket') {
                    if (!payGate.hasAccess && !payGate.loading) {
                      toast.error(
                        'Pay at least 50% of your fees to access the Exam Docket.',
                        { duration: 4000 }
                      );
                    } else {
                      setActiveTab(item.id);
                    }
                  } else {
                    setActiveTab(item.id);
                  }
                  setSidebarOpen(false);
                }}>
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
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button className="sd-link-btn" onClick={markAllRead}>Mark read</button>
                      <button className="sd-link-btn" style={{ color: '#ef4444' }} onClick={clearAllNotifications}>Clear all</button>
                    </div>
                  </div>
                  <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                        No notifications.
                      </div>
                    ) : notifications.map(n => (
                      <div key={n.id} className={`sd-notif-item ${!n.read ? 'unread' : ''}`}>
                        <i className={`fas ${n.icon}`} style={{ color: n.color, marginTop: 2 }}></i>
                        <div style={{ flex: 1 }}>
                          <div className="sd-notif-text">{n.text}</div>
                          <div className="sd-notif-time">{n.time}</div>
                        </div>
                        <button
                          className="sd-notif-delete-btn"
                          onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                          title="Delete"
                        >
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      </div>
                    ))}
                  </div>
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
        {examSuccessMsg && (
          <div className="sd-toast" style={{ background: 'linear-gradient(135deg,#059669,#10b981)' }}>
            <i className="fas fa-check-circle"></i> {examSuccessMsg}
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
                      <div className="sd-welcome-actions">
                        <button className="sd-btn sd-btn-white" onClick={() => setActiveTab('courses')}>
                          <i className="fas fa-book-open"></i> Register Courses
                        </button>
                        <button className="sd-btn sd-btn-glass" onClick={() => setActiveTab('results')}>
                          <i className="fas fa-chart-bar"></i> View Results
                        </button>
                      </div>
                    </div>
                  </div>

                  {liveSessions.filter(s => s.status === 'active').length > 0 && (
                    <div className="sd-live-alert sd-tab-fade" style={{
                      marginBottom: '30px',
                      background: 'rgba(16, 185, 129, 0.05)',
                      border: '1px solid rgba(16, 185, 129, 0.2)',
                      borderLeft: '5px solid #10b981',
                      borderRadius: '20px',
                      padding: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '20px',
                      flexWrap: 'wrap',
                      animation: 'slideInDown 0.5s ease-out'
                    }}>
                      <div className="sd-live-pulse-wrapper">
                        <div className="sd-live-pulse"></div>
                        <i className="fas fa-video"></i>
                      </div>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#065f46' }}>
                          {liveSessions.filter(s => s.status === 'active').length} Class(es) LIVE Right Now!
                        </h3>
                        <p style={{ margin: '4px 0 0', color: '#047857', fontSize: '1.05rem', fontWeight: '500' }}>
                          Join your lecturers in real-time for interactive learning.
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        {liveSessions.filter(s => s.status === 'active').map(session => (
                          <button
                            key={session.id}
                            className="sd-btn"
                            style={{
                              background: 'linear-gradient(135deg, #10b981, #059669)',
                              color: 'white',
                              border: 'none',
                              padding: '12px 24px',
                              borderRadius: '12px',
                              fontSize: '0.95rem',
                              fontWeight: '700',
                              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                              transition: 'transform 0.2s',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}
                            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                            onClick={() => navigate('/elearning', { state: { autoJoin: session } })}
                          >
                            <i className="fas fa-sign-in-alt"></i> Join {session.course}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

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
                            ['Credit Hours', creditHours],
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
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div className="sd-schedule-course">{cls.code} – {cls.name}</div>
                                {(() => {
                                  const courseSessions = liveSessions.filter(ls => ls.course === (cls.code || cls.id));
                                  const active = courseSessions.find(ls => ls.status === 'active');
                                  const ended = courseSessions.find(ls => ls.status === 'ended');

                                  if (active) return (
                                    <span style={{ color: '#10b981', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <i className="fas fa-circle" style={{ fontSize: '6px', animation: 'pulse 1.5s infinite' }}></i> LIVE
                                    </span>
                                  );
                                  if (ended) return (
                                    <span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 600 }}>ENDED</span>
                                  );
                                  return null;
                                })()}
                              </div>
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
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button className="sd-link-btn" onClick={markAllRead}>Mark all read</button>
                        <button className="sd-link-btn" style={{ color: '#ef4444' }} onClick={clearAllNotifications}>Clear all</button>
                      </div>
                    </div>
                    <div className="sd-card-body" style={{ padding: 0 }}>
                      {notifications.length === 0
                        ? <div style={{ padding: '40px 20px', color: '#94a3b8', textAlign: 'center' }}>
                          <i className="fas fa-bell-slash" style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.5 }}></i>
                          <div>No notifications.</div>
                        </div>
                        : notifications.map(n => (
                          <div key={n.id} className={`sd-notif-row ${!n.read ? 'unread' : ''}`}>
                            <div style={{ color: n.color, fontSize: 18 }}><i className={`fas ${n.icon}`}></i></div>
                            <div className="sd-notif-body">
                              <div className="sd-notif-text">{n.text}</div>
                              <div className="sd-notif-time">{n.time}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              {!n.read && <span className="sd-unread-dot"></span>}
                              <button
                                className="sd-notif-delete-btn"
                                onClick={() => deleteNotification(n.id)}
                                title="Delete"
                              >
                                <i className="fas fa-trash-alt"></i>
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ═══════════ ACADEMIC ANALYTICS ═══════════ */}
              {activeTab === 'analytics' && (() => {
                // Derive analytics from real data
                const totalResults = results.length;
                const avgGrade = totalResults > 0
                  ? Math.round(results.reduce((s, r) => s + ((parseFloat(r.score) || parseFloat(r.gpa) * 25 || 0)), 0) / totalResults)
                  : 0;
                const avgGpaNorm = totalResults > 0
                  ? Math.round((results.reduce((s, r) => s + (parseFloat(r.gpa) || 0), 0) / totalResults) * 25)
                  : 0;
                const displayAvg = avgGrade > 0 ? avgGrade : avgGpaNorm;
                const passCount = results.filter(r => parseFloat(r.gpa) >= 2.0).length;
                const totalCourses = courses.length;
                const completedCount = courses.filter(c => c.grade && c.grade !== '—').length;
                const assignmentsCompleted = completedCount || Math.min(Math.round(totalCourses * 0.9), totalCourses);
                const assignmentsTotal = totalCourses || 20;
                const attendanceTrend = passCount >= totalResults * 0.7 ? '↑ Improving' : passCount >= totalResults * 0.5 ? '→ Stable' : '↓ Needs Attention';
                const trendColor = passCount >= totalResults * 0.7 ? '#10b981' : passCount >= totalResults * 0.5 ? '#f59e0b' : '#ef4444';
                const classRankPct = cgpa >= 3.5 ? 10 : cgpa >= 3.0 ? 20 : cgpa >= 2.5 ? 40 : cgpa >= 2.0 ? 60 : 80;

                const semesterBreakdown = results.length > 0
                  ? results.reduce((acc, r) => {
                    const sem = r.semester || 'Current';
                    if (!acc[sem]) acc[sem] = { total: 0, count: 0, pass: 0 };
                    acc[sem].total += parseFloat(r.gpa) || 0;
                    acc[sem].count++;
                    if (parseFloat(r.gpa) >= 2.0) acc[sem].pass++;
                    return acc;
                  }, {})
                  : { 'Semester 1': { total: 3.2, count: 1, pass: 1 }, 'Semester 2': { total: 3.5, count: 1, pass: 1 } };

                const semList = Object.entries(semesterBreakdown).map(([sem, d]) => ({
                  sem,
                  avg: (d.total / d.count).toFixed(2),
                  pass: d.pass,
                  count: d.count,
                }));

                return (
                  <div className="sd-tab-fade">
                    <div className="sd-page-header">
                      <div>
                        <h2 className="sd-page-title">Academic Analytics</h2>
                        <p className="sd-page-sub">Real-time insights into your academic performance</p>
                      </div>
                    </div>

                    {/* Key Metric Cards */}
                    <div className="sd-analytics-grid">
                      {[
                        { icon: 'fa-tasks', value: `${assignmentsCompleted}/${assignmentsTotal}`, label: 'Assignments Completed', color: '#0d9488', bg: 'rgba(13,148,136,0.1)', sub: `${Math.round((assignmentsCompleted / Math.max(assignmentsTotal, 1)) * 100)}% completion rate` },
                        { icon: 'fa-star', value: `${displayAvg}%`, label: 'Average Grade', color: '#7c3aed', bg: 'rgba(124,58,237,0.1)', sub: `CGPA: ${cgpa}` },
                        { icon: 'fa-chart-area', value: attendanceTrend, label: 'Attendance Trend', color: trendColor, bg: trendColor + '1a', sub: `${passCount}/${totalResults} courses passing` },
                        { icon: 'fa-trophy', value: `Top ${classRankPct}%`, label: 'Class Ranking', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', sub: `Based on CGPA ${cgpa}` },
                      ].map(m => (
                        <div key={m.label} className="sd-analytics-card">
                          <div className="sd-analytics-icon" style={{ background: m.bg, color: m.color }}>
                            <i className={`fas ${m.icon}`}></i>
                          </div>
                          <div className="sd-analytics-val" style={{ color: m.color }}>{m.value}</div>
                          <div className="sd-analytics-lbl">{m.label}</div>
                          <div className="sd-analytics-sub">{m.sub}</div>
                        </div>
                      ))}
                    </div>

                    <div className="sd-two-col" style={{ marginTop: 24 }}>
                      {/* Semester Breakdown */}
                      <div className="sd-card">
                        <div className="sd-card-header">
                          <span><i className="fas fa-calendar-check" style={{ color: '#0d9488', marginRight: 8 }}></i>Semester Analytics</span>
                        </div>
                        <div className="sd-card-body">
                          {semList.length === 0 ? (
                            <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No semester data yet. Results will appear once published.</div>
                          ) : semList.map((s, i) => (
                            <div key={s.sem} style={{ marginBottom: 20 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>{s.sem}</span>
                                <span style={{ fontSize: 13, color: '#64748b' }}>GPA: <strong style={{ color: '#0d9488' }}>{s.avg}</strong></span>
                              </div>
                              <div className="sd-analytics-bar-wrap">
                                <div className="sd-analytics-bar-fill" style={{
                                  width: `${Math.min((parseFloat(s.avg) / 4) * 100, 100)}%`,
                                  background: ['linear-gradient(90deg,#0d9488,#14b8a6)', 'linear-gradient(90deg,#7c3aed,#a78bfa)', 'linear-gradient(90deg,#2563eb,#60a5fa)', 'linear-gradient(90deg,#f59e0b,#fbbf24)'][i % 4],
                                  animationDelay: `${i * 0.1}s`
                                }}></div>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: '#94a3b8' }}>
                                <span>{s.pass}/{s.count} passing</span>
                                <span>{Math.round((parseFloat(s.avg) / 4) * 100)}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Credit Progress & Overview */}
                      <div className="sd-card">
                        <div className="sd-card-header">
                          <span><i className="fas fa-chart-pie" style={{ color: '#7c3aed', marginRight: 8 }}></i>Progress Overview</span>
                        </div>
                        <div className="sd-card-body">
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                            {[
                              { label: 'Course Completion', val: Math.round((assignmentsCompleted / Math.max(assignmentsTotal, 1)) * 100), color: '#0d9488' },
                              { label: 'Grade Performance', val: Math.min(displayAvg, 100), color: '#7c3aed' },
                              { label: 'Credit Progress', val: Math.min(Math.round((creditHours / 120) * 100), 100), color: '#2563eb' },
                              { label: 'Pass Rate', val: totalResults > 0 ? Math.round((passCount / totalResults) * 100) : 100, color: '#f59e0b' },
                            ].map(p => (
                              <div key={p.label}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                  <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>{p.label}</span>
                                  <span style={{ fontSize: 13, fontWeight: 700, color: p.color }}>{p.val}%</span>
                                </div>
                                <div className="sd-analytics-bar-wrap">
                                  <div className="sd-analytics-bar-fill" style={{ width: `${p.val}%`, background: p.color }}></div>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div style={{ marginTop: 24, padding: '16px', background: '#f0fdf4', borderRadius: 12, border: '1px solid #bbf7d0' }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#065f46', marginBottom: 8 }}>
                              <i className="fas fa-lightbulb" style={{ marginRight: 6 }}></i>Insight
                            </div>
                            <div style={{ fontSize: 13, color: '#047857', lineHeight: 1.6 }}>
                              {cgpa >= 3.5 ? 'Outstanding performance! You are on track for First Class honours.' :
                                cgpa >= 3.0 ? 'Great work! Keep it up to achieve First Class honours.' :
                                  cgpa >= 2.5 ? 'Solid progress. Aim to improve your weakest subjects.' :
                                    cgpa >= 2.0 ? 'You are passing — focus on consistency to push your GPA higher.' :
                                      'Seek academic support to strengthen your performance this semester.'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ═══════════ PERSONALIZED LEARNING ═══════════ */}
              {activeTab === 'learning' && (() => {
                // Build subject performance from real results
                const subjectPerf = results.map(r => ({
                  name: r.courseName || r.courseCode || r.course || 'Unknown',
                  code: r.courseCode || '',
                  gpa: parseFloat(r.gpa) || 0,
                  score: parseFloat(r.score) || parseFloat(r.gpa) * 25 || 0,
                  pct: Math.min(Math.round((parseFloat(r.gpa) || 0) / 4 * 100), 100),
                })).sort((a, b) => b.pct - a.pct);

                // Fallback demo data if no results
                const perf = subjectPerf.length > 0 ? subjectPerf : courses.slice(0, 5).map((c, i) => ({
                  name: c.name || c.code,
                  code: c.code,
                  gpa: [3.6, 2.6, 3.0, 2.2, 3.8][i % 5],
                  score: [90, 65, 75, 55, 95][i % 5],
                  pct: [90, 65, 75, 55, 95][i % 5],
                }));

                const strong = perf.filter(s => s.pct >= 75);
                const weak = perf.filter(s => s.pct < 60);
                const moderate = perf.filter(s => s.pct >= 60 && s.pct < 75);

                const barColor = pct => pct >= 80 ? 'linear-gradient(90deg,#10b981,#34d399)' : pct >= 65 ? 'linear-gradient(90deg,#0d9488,#14b8a6)' : pct >= 50 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : 'linear-gradient(90deg,#ef4444,#f87171)';

                const daysSinceStudy = 2; // placeholder
                const studyGoalHrs = 4;
                const studiedHrs = 2.5;

                const recommendations = [
                  ...weak.map(s => ({ type: 'warning', text: `Practice ${s.name || s.code} 30 mins daily — currently at ${s.pct}%`, icon: 'fa-exclamation-triangle', color: '#f59e0b' })),
                  ...moderate.map(s => ({ type: 'info', text: `Review ${s.name || s.code} concepts to push past 75%`, icon: 'fa-info-circle', color: '#2563eb' })),
                  ...strong.slice(0, 1).map(s => ({ type: 'success', text: `Excellent work in ${s.name || s.code}! Use this strength to help others.`, icon: 'fa-check-circle', color: '#10b981' })),
                  { type: 'tip', text: 'Study in 25-minute focused blocks (Pomodoro technique) for best retention.', icon: 'fa-clock', color: '#7c3aed' },
                  { type: 'tip', text: 'Review lecture notes within 24 hours to boost memory by up to 60%.', icon: 'fa-brain', color: '#0d9488' },
                ].slice(0, 4);

                return (
                  <div className="sd-tab-fade">
                    <div className="sd-page-header">
                      <div>
                        <h2 className="sd-page-title">Personalized Learning</h2>
                        <p className="sd-page-sub">Your tailored study insights and recommendations</p>
                      </div>
                    </div>

                    {/* Study Status Cards */}
                    <div className="sd-analytics-grid">
                      {[
                        { icon: 'fa-fire', value: strong.length, label: 'Strong Subjects', color: '#10b981', bg: 'rgba(16,185,129,0.1)', sub: strong.map(s => s.code || s.name.split(' ')[0]).join(', ') || 'Keep going!' },
                        { icon: 'fa-exclamation-circle', value: weak.length, label: 'Areas to Improve', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', sub: weak.map(s => s.code || s.name.split(' ')[0]).join(', ') || 'All good!' },
                        { icon: 'fa-clock', value: `${studiedHrs}h`, label: 'Studied Today', color: '#7c3aed', bg: 'rgba(124,58,237,0.1)', sub: `Goal: ${studyGoalHrs}h per day` },
                        { icon: 'fa-calendar-day', value: `${daysSinceStudy}d`, label: 'Study Streak', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', sub: 'Keep the momentum!' },
                      ].map(m => (
                        <div key={m.label} className="sd-analytics-card">
                          <div className="sd-analytics-icon" style={{ background: m.bg, color: m.color }}>
                            <i className={`fas ${m.icon}`}></i>
                          </div>
                          <div className="sd-analytics-val" style={{ color: m.color }}>{m.value}</div>
                          <div className="sd-analytics-lbl">{m.label}</div>
                          <div className="sd-analytics-sub">{m.sub}</div>
                        </div>
                      ))}
                    </div>

                    <div className="sd-two-col" style={{ marginTop: 24 }}>
                      {/* Subject Performance bars */}
                      <div className="sd-card">
                        <div className="sd-card-header">
                          <span><i className="fas fa-sliders-h" style={{ color: '#7c3aed', marginRight: 8 }}></i>Your Performance</span>
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>Based on results</span>
                        </div>
                        <div className="sd-card-body">
                          {perf.length === 0 ? (
                            <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No results available yet. Your performance data will appear here.</div>
                          ) : perf.map((s, i) => (
                            <div key={s.name + i} style={{ marginBottom: 20 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <div>
                                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{s.name.length > 28 ? s.name.slice(0, 28) + '…' : s.name}</span>
                                  {s.code && <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 6 }}>({s.code})</span>}
                                </div>
                                <span style={{ fontSize: 13, fontWeight: 800, color: s.pct >= 75 ? '#10b981' : s.pct >= 60 ? '#f59e0b' : '#ef4444' }}>{s.pct}%</span>
                              </div>
                              <div className="sd-analytics-bar-wrap">
                                <div className="sd-analytics-bar-fill" style={{ width: `${s.pct}%`, background: barColor(s.pct), animationDelay: `${i * 0.08}s` }}></div>
                              </div>
                              <div style={{ marginTop: 4, fontSize: 11, color: s.pct >= 75 ? '#10b981' : s.pct >= 60 ? '#f59e0b' : '#ef4444', fontWeight: 600 }}>
                                {s.pct >= 80 ? '🌟 Excellent' : s.pct >= 70 ? '✅ Good' : s.pct >= 60 ? '⚠️ Needs work' : '🔴 Critical'}
                              </div>
                            </div>
                          ))}

                          <div style={{ marginTop: 16, padding: '12px 14px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-around' }}>
                            <div style={{ textAlign: 'center' }}><div style={{ fontSize: 22, fontWeight: 800, color: '#10b981' }}>{strong.length}</div><div style={{ fontSize: 11, color: '#64748b' }}>Strong</div></div>
                            <div style={{ width: 1, background: '#e2e8f0' }}></div>
                            <div style={{ textAlign: 'center' }}><div style={{ fontSize: 22, fontWeight: 800, color: '#f59e0b' }}>{moderate.length}</div><div style={{ fontSize: 11, color: '#64748b' }}>Average</div></div>
                            <div style={{ width: 1, background: '#e2e8f0' }}></div>
                            <div style={{ textAlign: 'center' }}><div style={{ fontSize: 22, fontWeight: 800, color: '#ef4444' }}>{weak.length}</div><div style={{ fontSize: 11, color: '#64748b' }}>Weak</div></div>
                          </div>
                        </div>
                      </div>

                      {/* Recommendations */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div className="sd-card">
                          <div className="sd-card-header">
                            <span><i className="fas fa-lightbulb" style={{ color: '#f59e0b', marginRight: 8 }}></i>Recommendations</span>
                          </div>
                          <div className="sd-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {recommendations.map((r, i) => (
                              <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 14px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', alignItems: 'flex-start' }}>
                                <i className={`fas ${r.icon}`} style={{ color: r.color, marginTop: 2, fontSize: 15, flexShrink: 0 }}></i>
                                <span style={{ fontSize: 13, color: '#334155', lineHeight: 1.6 }}>{r.text}</span>
                              </div>
                            ))}
                            {recommendations.length === 0 && (
                              <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>Complete some courses to get personalized recommendations!</div>
                            )}
                          </div>
                        </div>

                        {/* Study Plan */}
                        <div className="sd-card">
                          <div className="sd-card-header">
                            <span><i className="fas fa-calendar-week" style={{ color: '#7c3aed', marginRight: 8 }}></i>Exam Prep Plan</span>
                          </div>
                          <div className="sd-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {[
                              { day: 'Mon / Thu', subject: strong[0]?.name || courses[0]?.name || 'Course 1', type: 'Review', color: '#10b981' },
                              { day: 'Tue / Fri', subject: weak[0]?.name || courses[1]?.name || 'Course 2', type: 'Deep Study', color: '#ef4444' },
                              { day: 'Wed', subject: moderate[0]?.name || courses[2]?.name || 'Course 3', type: 'Practice Problems', color: '#f59e0b' },
                              { day: 'Sat', subject: 'All Subjects', type: 'Past Papers', color: '#7c3aed' },
                              { day: 'Sun', subject: '—', type: 'Rest & Reflect', color: '#94a3b8' },
                            ].map((p, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 60, fontSize: 11, fontWeight: 700, color: '#64748b', flexShrink: 0 }}>{p.day}</div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{p.subject?.length > 24 ? p.subject.slice(0, 24) + '…' : p.subject}</div>
                                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{p.type}</div>
                                </div>
                                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: p.color + '20', color: p.color }}>{p.type.split(' ')[0]}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

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
                              <tr><th>Code</th><th>Course Name</th><th>Lecturer</th><th>Credits</th><th>Grade</th><th>Status</th></tr>
                            </thead>
                            <tbody>
                              {courses.map(c => (
                                <tr key={c.id}>
                                  <td><span className="sd-code">{c.code}</span></td>
                                  <td className="sd-td-bold">{c.name}</td>
                                  <td>{c.lecturer}</td>
                                  <td>{c.credits || c.units || '—'}</td>
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
                !payGate.loading && !payGate.hasAccess ? (
                  <div className="sd-tab-fade">
                    <div className="sd-page-header">
                      <div>
                        <h2 className="sd-page-title">Academic Results</h2>
                        <p className="sd-page-sub">Restricted — insufficient fee payment</p>
                      </div>
                    </div>
                    <PaymentGate
                      percentPaid={payGate.percentPaid}
                      amountPaid={payGate.amountPaid}
                      amountRequired={payGate.amountRequired}
                      featureName="Exam Results"
                      onGoToPayments={() => setActiveTab('finance')}
                    />
                  </div>
                ) :
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
                                  <th>Actions</th>
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
                                    <td>
                                      {['Supplementary', 'Deferred', 'F', 'Failed (F)'].includes(r.grade) && (
                                        <button
                                          className="sd-btn sd-btn-ghost sd-btn-xs"
                                          onClick={() => openAppealForm(r)}
                                          disabled={appeals.find(a => a.courseCode === r.courseCode && a.status !== 'Resolved')}
                                        >
                                          <i className="fas fa-gavel"></i>
                                          {appeals.find(a => a.courseCode === r.courseCode && a.status !== 'Resolved') ? ' Appeal Active' : ' Appeal Result'}
                                        </button>
                                      )}
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

              {/* ══════════ APPEALS TAB ══════════ */}
              {activeTab === 'appeals' && (
                <div className="sd-tab-fade">
                  <div className="sd-page-header">
                    <div>
                      <h2 className="sd-page-title">Exam Appeals</h2>
                      <p className="sd-page-sub">Track the status of your result disputes.</p>
                    </div>
                  </div>

                  {appeals.length === 0 ? (
                    <div className="sd-card" style={{ textAlign: 'center', padding: '60px 20px' }}>
                      <div className="sd-stat-icon" style={{ background: '#f8fafc', color: '#94a3b8', width: 64, height: 64, fontSize: 28, margin: '0 auto 20px' }}>
                        <i className="fas fa-gavel"></i>
                      </div>
                      <h3 style={{ color: '#475569', marginBottom: 10 }}>No appeals found</h3>
                      <p style={{ color: '#94a3b8', fontSize: 13, maxWidth: 350, margin: '0 auto' }}>
                        If you believe there is a mistake in your published results, you can submit an appeal by clicking the <strong>"Appeal Result"</strong> button in your <button className="sd-link-btn" onClick={() => setActiveTab('results')}>Results</button> tab.
                      </p>
                    </div>
                  ) : (
                    <div className="sd-card">
                      <div className="sd-card-header">
                        <span>Submitted Appeals</span>
                        <span className="sd-badge badge-teal">{appeals.length} Total</span>
                      </div>
                      <div className="sd-table-wrapper">
                        <table className="sd-table">
                          <thead>
                            <tr>
                              <th>Course</th>
                              <th>Result</th>
                              <th>Reason</th>
                              <th>Status</th>
                              <th>Outcome</th>
                              <th>Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {appeals.map(apl => (
                              <tr key={apl.id}>
                                <td className="sd-td-bold">
                                  <div>{apl.courseCode}</div>
                                  <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>{apl.courseName}</div>
                                </td>
                                <td><span className="sd-grade">{apl.result}</span></td>
                                <td style={{ maxWidth: 200, fontSize: 12 }}>{apl.reason}</td>
                                <td>
                                  <span className={`sd-badge ${apl.status === 'Pending' ? 'badge-gold' :
                                    apl.status === 'Under Review' ? 'badge-teal' : 'badge-green'
                                    }`}>
                                    {apl.status}
                                  </span>
                                </td>
                                <td className="sd-td-bold">{apl.outcome || '—'}</td>
                                <td style={{ fontSize: 11 }}>{apl.timestamp?.toDate ? apl.timestamp.toDate().toLocaleDateString() : '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
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
              {activeTab === 'online-exams' && (
                !payGate.loading && !payGate.hasAccess ? (
                  <div className="sd-tab-fade">
                    <div className="sd-page-header">
                      <div>
                        <h2 className="sd-page-title">Online Exams</h2>
                        <p className="sd-page-sub">Restricted — clear 50% fees to access</p>
                      </div>
                    </div>
                    <PaymentGate
                      percentPaid={payGate.percentPaid}
                      amountPaid={payGate.amountPaid}
                      amountRequired={payGate.amountRequired}
                      featureName="Online Exams"
                      onGoToPayments={() => setActiveTab('finance')}
                    />
                  </div>
                ) : (
                  <StudentExamView
                    student={student}
                    courses={courses}
                    courseCatalog={availableCourses}
                    showError={(msg) => setDbError(msg)}
                    showSuccess={(msg) => {
                      setExamSuccessMsg(msg);
                      setTimeout(() => setExamSuccessMsg(''), 5000);
                    }}
                  />
                )
              )}

              {activeTab === 'docket' && (
                !payGate.loading && !payGate.hasAccess ? (
                  <div className="sd-tab-fade">
                    <div className="sd-page-header">
                      <div>
                        <h2 className="sd-page-title">Exam Docket</h2>
                        <p className="sd-page-sub">Restricted — clear 50% fees to access</p>
                      </div>
                    </div>
                    <PaymentGate
                      percentPaid={payGate.percentPaid}
                      amountPaid={payGate.amountPaid}
                      amountRequired={payGate.amountRequired}
                      featureName="Exam Docket"
                      onGoToPayments={() => setActiveTab('finance')}
                    />
                  </div>
                ) : (
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

                            {/* Student Info & Photo Section */}
                            <div style={{ display: 'flex', borderBottom: '1px solid #e8edf4' }}>
                              <div className="sd-docket-info-grid" style={{ flex: 1, borderBottom: 'none' }}>
                                {[
                                  ['Full Name', student.name],
                                  ['Student ID', student.id],
                                  ['Passport / NRC No.', profile?.nrcNumber || profile?.nrc || profile?.passportNumber || profile?.nrcPassportNumber || '—'],
                                  ['Programme', student.program || profile?.program || '—'],
                                  ['School', student.school || profile?.school || '—'],
                                  ['Academic Year', examDocket?.academicYear],
                                  ['Semester', examDocket?.semester],
                                  ['Total Credit Hours', creditHours],
                                ].map(([k, v]) => (
                                  <div key={k} className="sd-docket-info-item">
                                    <span className="sd-docket-info-key">{k}</span>
                                    <span className="sd-docket-info-val">{v || '—'}</span>
                                  </div>
                                ))}
                              </div>

                              <div className="sd-docket-photo-column" style={{
                                padding: '24px',
                                borderLeft: '1px solid #e8edf4',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: '#fbfcfd'
                              }}>
                                <span className="sd-docket-info-key" style={{ marginBottom: '12px' }}>Registrar Capture</span>
                                <div className="sd-docket-passport-box">
                                  {profile?.registrarPhotoUrl ? (
                                    <img src={profile.registrarPhotoUrl} alt="Registrar Capture" className="sd-docket-passport-img" />
                                  ) : (
                                    <div className="sd-docket-passport-placeholder">
                                      <i className="fas fa-user"></i>
                                      <span>Photo</span>
                                    </div>
                                  )}
                                </div>
                              </div>
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
                                      <th>Signature invigilator</th>
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
                                        <td><span className="sd-docket-signature" style={{ borderBottom: '1px solid #000', minWidth: '100px', display: 'inline-block' }}>&nbsp;</span></td>
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
                                        <span><i className="fas fa-pen-nib"></i> Sign: ________________</span>
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
                )
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
      {
        showPayModal && (
          <div className="sd-modal-overlay" onClick={closePayModal}>
            <div className="sd-modal" onClick={e => e.stopPropagation()}>
              <div className="sd-modal-head">
                <h3><i className="fas fa-credit-card"></i> Pay Fees</h3>
                <button className="sd-close-btn" onClick={closePayModal}>&times;</button>
              </div>

              <div className="sd-modal-body">
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
          </div>
        )
      }

      {/* ════════════ REGISTER MODAL ════════════ */}
      {
        showRegModal && (
          <div className="sd-modal-overlay" onClick={() => setShowRegModal(false)}>
            <div className="sd-modal" onClick={e => e.stopPropagation()}>
              <div className="sd-modal-head">
                <h3><i className="fas fa-book-open"></i> Add Courses</h3>
                <button className="sd-close-btn" onClick={() => setShowRegModal(false)}>&times;</button>
              </div>

              <div className="sd-modal-body">
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
                              <div className="sd-co-meta">{c.code} · {c.credits || c.units} units · {c.lecturer}</div>
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
                    <div className="sd-modal-actions" style={{ marginTop: 'auto', paddingTop: '15px' }}>
                      <button type="button" className="sd-btn sd-btn-ghost" style={{ flex: 1 }} onClick={() => setShowRegModal(false)}>Cancel</button>
                      <button
                        type="button" className="sd-btn sd-btn-primary"
                        style={{ flex: 2, justifyContent: 'center', fontSize: '15px' }}
                        onClick={handleRegister}
                        disabled={regSelected.length === 0 || registeringCourse}
                      >
                        {registeringCourse
                          ? <><i className="fas fa-circle-notch fa-spin"></i> Registering…</>
                          : (
                            <>
                              <i className="fas fa-check-double"></i>
                              Register {regSelected.length > 0 ? `Selected (${regSelected.length})` : 'Courses'}
                            </>
                          )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )
      }

      {/* ════════════ HOSTEL BOOKING MODAL ════════════ */}
      {
        showHostelModal && (
          <div className="sd-modal-overlay" onClick={() => setShowHostelModal(false)}>
            <div className="sd-modal" onClick={e => e.stopPropagation()}>
              <div className="sd-modal-head">
                <h3><i className="fas fa-hotel"></i> Confirm Booking</h3>
                <button className="sd-close-btn" onClick={() => setShowHostelModal(false)}>&times;</button>
              </div>

              <div className="sd-modal-body">
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
                              toast.error("Error booking hostel: " + err.message);
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
          </div>
        )
      }

      {/* ════════════ APPEAL MODAL ════════════ */}
      {
        showAppealModal && (
          <div className="sd-modal-overlay" onClick={() => setShowAppealModal(false)}>
            <div className="sd-modal" onClick={e => e.stopPropagation()}>
              <div className="sd-modal-head">
                <h3><i className="fas fa-gavel"></i> Exam Appeal Form</h3>
                <button className="sd-close-btn" onClick={() => setShowAppealModal(false)}>&times;</button>
              </div>

              <div className="sd-modal-body">
                {appealStep === 1 && (
                  <div className="sd-tab-fade">
                    <div className="sd-notice-box" style={{ background: 'rgba(59, 130, 246, 0.05)', borderColor: '#3b82f6', color: '#1e40af', marginBottom: 20 }}>
                      <i className="fas fa-info-circle"></i>
                      <p>Appealing <strong>{appealForm.courseCode}</strong> ({appealForm.courseName}). Original Result: <strong>{appealForm.result}</strong></p>
                    </div>

                    <div className="sd-modal-form">
                      <label>Reason for Appeal</label>
                      <textarea
                        className="sd-input"
                        rows="4"
                        placeholder="Explain why you are disputing this result..."
                        value={appealForm.reason}
                        onChange={e => setAppealForm({ ...appealForm, reason: e.target.value })}
                        style={{ width: '100%', borderRadius: 8, border: '1px solid #e2e8f0', padding: 10, fontSize: 13, resize: 'none' }}
                        required
                      ></textarea>

                      <label style={{ marginTop: 15, display: 'block' }}>Supporting Evidence (Optional)</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 5 }}>
                        <button type="button" className="sd-btn sd-btn-ghost sd-btn-xs" onClick={openAppealUpload}>
                          <i className="fas fa-upload"></i> {appealForm.evidenceUrl ? 'Change Evidence' : 'Upload File'}
                        </button>
                        {appealForm.evidenceUrl && <span style={{ fontSize: 11, color: '#0d9488' }}><i className="fas fa-check-circle"></i> Evidence linked</span>}
                      </div>

                      <div className="sd-appeal-fee-box" style={{ marginTop: 25, padding: 15, background: '#f8fafc', borderRadius: 12, border: '1px dashed #e2e8f0', textAlign: 'center' }}>
                        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 5 }}>Mandatory Appeal Fee</div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: '#1e293b' }}>K 500.00</div>
                      </div>

                      <div className="sd-modal-actions" style={{ marginTop: 20 }}>
                        <button type="button" className="sd-btn sd-btn-ghost" onClick={() => setShowAppealModal(false)}>Cancel</button>
                        <button
                          type="button"
                          className="sd-btn sd-btn-primary"
                          disabled={!appealForm.reason}
                          onClick={() => setAppealStep(2)}
                        >
                          Proceed to Payment
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {appealStep === 2 && (
                  <div className="sd-tab-fade">
                    <div style={{ textAlign: 'center', marginBottom: 20 }}>
                      <div className="sd-stat-icon" style={{ margin: '0 auto 15px', background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
                        <i className="fas fa-credit-card"></i>
                      </div>
                      <h4 style={{ margin: 0, fontSize: 18 }}>Confirm Payment</h4>
                      <p style={{ color: '#64748b', fontSize: 13 }}>Appeal Fee for {appealForm.courseCode}</p>
                    </div>

                    <div className="sd-receipt-card" style={{ background: '#fbfcfd', marginBottom: 20 }}>
                      <div className="sd-receipt-row"><span>Item:</span><span className="sd-receipt-val">Exam Appeal</span></div>
                      <div className="sd-receipt-row"><span>Course:</span><span className="sd-receipt-val">{appealForm.courseCode}</span></div>
                      <div className="sd-receipt-row"><span>Total Due:</span><span className="sd-receipt-val" style={{ color: '#dc2626' }}>K 500.00</span></div>
                    </div>

                    <div className="sd-modal-actions">
                      <button type="button" className="sd-btn sd-btn-ghost" onClick={() => setAppealStep(1)}>Back</button>
                      <button
                        type="button"
                        className="sd-btn sd-btn-primary"
                        style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none' }}
                        disabled={submittingAppeal}
                        onClick={handleAppealPayment}
                      >
                        {submittingAppeal ? <><i className="fas fa-circle-notch fa-spin"></i> Processing…</> : `Pay K 500 & Submit`}
                      </button>
                    </div>
                  </div>
                )}

                {appealStep === 3 && (
                  <div className="sd-tab-fade" style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div className="sd-success-check" style={{ margin: '0 auto 20px' }}>
                      <i className="fas fa-check"></i>
                    </div>
                    <h3>Appeal Submitted!</h3>
                    <p style={{ color: '#64748b', marginBottom: 25 }}>Your appeal has been received and is now in the Registrar's queue for review. You can track the status in the Results tab.</p>
                    <button className="sd-btn sd-btn-primary" onClick={() => setShowAppealModal(false)}>Close</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      }

      {/* ════════════ PROFILE MODAL ════════════ */}
      {
        showProfileModal && (
          <div className="sd-modal-overlay" onClick={() => setShowProfileModal(false)}>
            <div className="sd-modal" onClick={e => e.stopPropagation()}>
              <div className="sd-modal-head">
                <h3><i className="fas fa-user-cog"></i> Account Settings</h3>
                <button className="sd-close-btn" onClick={() => setShowProfileModal(false)}>&times;</button>
              </div>

              <div className="sd-modal-body">
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
          </div>
        )
      }

      {/* ════════════ FORCE PASSWORD CHANGE MODAL ════════════ */}
      {
        showPasswordForce && (
          <div className="sd-modal-overlay">
            <div className="sd-modal" onClick={e => e.stopPropagation()}>
              <div className="sd-modal-head" style={{ borderBottom: 'none' }}>
                <h3><i className="fas fa-shield-alt" style={{ color: '#dc2626' }}></i> Security Update Required</h3>
              </div>
              <div className="sd-modal-body">
                <div style={{ background: '#fff1f2', border: '1px solid #fecaca', padding: '16px', borderRadius: '8px', marginBottom: '20px', color: '#991b1b', fontSize: '13px', lineHeight: '1.5' }}>
                  <i className="fas fa-info-circle"></i> For your security, you must change your password from the default one provided during registration before you can access your dashboard.
                </div>
                <form onSubmit={handleUpdatePassword} className="sd-modal-form">
                  <label>New Password</label>
                  <input
                    type="password"
                    placeholder="Enter new secure password"
                    value={passForm.new}
                    onChange={e => setPassForm({ ...passForm, new: e.target.value })}
                    required
                    autoFocus
                  />
                  <label>Confirm New Password</label>
                  <input
                    type="password"
                    placeholder="Confirm your new password"
                    value={passForm.confirm}
                    onChange={e => setPassForm({ ...passForm, confirm: e.target.value })}
                    required
                  />
                  <div className="sd-modal-actions" style={{ marginTop: '24px' }}>
                    <button type="submit" className="sd-btn sd-btn-primary" style={{ width: '100%', justifyContent: 'center', height: '45px', fontSize: '15px' }}>
                      Update Password & Continue
                    </button>
                  </div>
                </form>
                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                  <button
                    onClick={logout}
                    className="sd-link-btn"
                    style={{ color: '#64748b', fontSize: '13px' }}
                  >
                    <i className="fas fa-sign-out-alt"></i> Cancel and Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default StudentDashboard;
