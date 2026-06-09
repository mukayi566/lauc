import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import ResultEntry from '../components/ResultEntry';
import ExamManager from '../components/lecturer/ExamManager';
import { calculateGrade, getGradePoints } from '../utils/resultUtils';
import {
  collection, query, where, onSnapshot,
  doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  serverTimestamp, orderBy, collectionGroup
} from 'firebase/firestore';
import '../dashboards.css';

/* ─────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────── */
const Badge = ({ status }) => {
  const map = {
    'Ongoing': 'badge-green',
    'Completed': 'badge-teal',
    'Canceled': 'badge-red',
    'Active': 'badge-green',
    'Inactive': 'badge-red',
    'Urgent': 'badge-red',
    'Info': 'badge-teal',
    'draft': 'badge-draft',
    'submitted': 'badge-submitted',
    'approved': 'badge-approved',
    'published': 'badge-published',
  };
  return <span className={`sd-badge ${map[status] || 'badge-teal'}`}>{status}</span>;
};

const Spinner = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px', color: '#7c3aed', fontSize: 28 }}>
    <i className="fas fa-circle-notch fa-spin"></i>
  </div>
);

/* ═══════════════════════════════════════════════════════════════ */


/* ═══════════════════════════════════════════════════════════════ */
const StaffDashboard = () => {
  /* ── UI state ── */
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPasswordForce, setShowPasswordForce] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [managedStatus, setManagedStatus] = useState('');
  const [savingCourse, setSavingCourse] = useState(false);
  const [postingAnn, setPostingAnn] = useState(false);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [submittingAll, setSubmittingAll] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [dbError, setDbError] = useState('');
  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', icon: 'fa-question-circle', onConfirm: null });

  /* ── Form state ── */
  const [newAnn, setNewAnn] = useState({ title: '', content: '', status: 'Info', targetCourse: 'All My Students' });
  const [passForm, setPassForm] = useState({ new: '', confirm: '' });

  /* ── DB data state ── */
  const [loading, setLoading] = useState(true);
  const [lecturerData, setLecturerData] = useState(null);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [resultLogs, setResultLogs] = useState([]);
  const [personalPayroll, setPersonalPayroll] = useState([]);
  const [personalLeaves, setPersonalLeaves] = useState([]);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ type: 'Annual Leave', start: '', end: '', reason: '' });

  const navigate = useNavigate();
  const { signOut, currentUser, changePassword } = useAuth();
  const uid = currentUser?.uid;



  /* ═══════════════════════════════════════════════════════════════
     LOAD LECTURER PROFILE
  ═══════════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!uid) return;

    // Real-time listener on the lecturer doc
    const unsubLecturer = onSnapshot(
      doc(db, 'lecturers', uid),
      (snap) => {
        if (snap.exists()) {
          const data = { docId: snap.id, ...snap.data() };
          setLecturerData(data);
          if (data.mustChangePassword) setShowPasswordForce(true);
        } else {
          // Fallback: query by email
          const q = query(collection(db, 'lecturers'), where('email', '==', currentUser.email));
          onSnapshot(q, (qSnap) => {
            if (!qSnap.empty) {
              const data = { docId: qSnap.docs[0].id, ...qSnap.docs[0].data() };
              setLecturerData(data);
              if (data.mustChangePassword) setShowPasswordForce(true);
            }
          });
        }
      },
      (err) => console.error('Lecturer listener error:', err)
    );

    return () => unsubLecturer();
  }, [uid, currentUser]);

  /* ═══════════════════════════════════════════════════════════════
     LOAD COURSES (sub-collection under lecturers/{uid}/courses)
  ═══════════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!uid) return;

    // Query the top-level courses collection for this lecturer
    const coursesCol = collection(db, 'courses');
    const q = query(coursesCol, where('lecturerId', '==', uid));

    const unsubCourses = onSnapshot(
      q,
      async (snap) => {
        let loaded = snap.docs.map(d => {
          const data = d.data();
          return {
            docId: d.id,
            ...data,
            code: data.code || data.id // Ensure code is accessible
          };
        });

        // Fallback: check by lecturer name if UID query returns no results and lecturer name is known
        if (loaded.length === 0 && lecturerData?.name) {
          try {
            const qName = query(coursesCol, where('lecturer', '==', lecturerData.name));
            const res = await getDocs(qName);
            loaded = res.docs.map(d => ({
              docId: d.id,
              ...d.data(),
              code: d.data().code || d.data().id
            }));
          } catch (e) {
            console.error('Fallback courses error:', e);
          }
        }

        setCourses(loaded);
        setLoading(false);
      },
      (err) => {
        console.error('Courses listener error:', err);
        if (err.code === 'permission-denied') {
          navigate('/login', { state: { error: "Access Denied: You do not have staff permissions to view this dashboard." } });
          return;
        }
        setDbError('Could not load assigned courses.');
        setLoading(false);
      }
    );
    return unsubCourses;
  }, [uid, lecturerData?.name]);

  /* ═══════════════════════════════════════════════════════════════
     LOAD STUDENTS (all students whose courses array includes
     any of this lecturer's course codes)
  ═══════════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!uid || courses.length === 0) {
      setStudents([]);
      return;
    }

    const courseKeys = courses.flatMap(c => {
      const code = c.code || c.id || '';
      const docId = c.docId || '';
      return [code, docId].filter(Boolean);
    });
    const courseKeySet = new Set(courseKeys.map(v => String(v).trim().toUpperCase()));

    const fetchStudents = async () => {
      try {
        // 1. Try querying by enrolledIn array (efficient)
        const codes = Array.from(courseKeySet);
        // Firestore supports up to 30 values in array-contains-any
        const batches = [];
        for (let i = 0; i < codes.length; i += 30) {
          batches.push(codes.slice(i, i + 30));
        }

        let enrolledStudents = [];
        for (const batch of batches) {
          const q = query(collection(db, 'students'), where('enrolledIn', 'array-contains-any', batch));
          const snap = await getDocs(q);
          enrolledStudents = [...enrolledStudents, ...snap.docs.map(d => ({ docId: d.id, ...d.data() }))];
        }

        // Remove duplicates
        const studentMap = new Map();
        enrolledStudents.forEach(s => studentMap.set(s.docId, s));

        // 2. Fallback: For students who don't have enrolledIn set (legacy or self-registered before fix)
        // We still fetch all students but we only check those not already found
        const allStudentsSnap = await getDocs(collection(db, 'students'));
        const allStudents = allStudentsSnap.docs.map(d => ({ docId: d.id, ...d.data() }));

        const matched = Array.from(studentMap.values()).map(s => ({
          ...s,
          enrolledIn: (s.enrolledIn || []).filter(code => courseKeySet.has(String(code).toUpperCase())),
          course: (s.enrolledIn || []).find(code => courseKeySet.has(String(code).toUpperCase())) || codes[0]
        }));

        const matchedIds = new Set(matched.map(s => s.docId));

        // 3. Ultra-fallback: Use collectionGroup if supported (can find all students by lecturerId in one go)
        // We do this to ensure we don't miss anyone even if enrolledIn or hierarchies are messy
        try {
          const groupQuery = query(collectionGroup(db, 'courses'), where('lecturerId', '==', uid));
          const groupSnap = await getDocs(groupQuery);

          for (const docSnap of groupSnap.docs) {
            const studentRef = docSnap.ref.parent.parent;
            if (studentRef && studentRef.id && !matchedIds.has(studentRef.id)) {
              const sSnap = await getDoc(studentRef);
              if (sSnap.exists()) {
                const sData = sSnap.data();
                matched.push({
                  docId: sSnap.id,
                  ...sData,
                  enrolledIn: (sData.enrolledIn || []).concat([docSnap.data().code || docSnap.data().id]).filter(Boolean),
                  course: docSnap.data().code || docSnap.data().id
                });
                matchedIds.add(sSnap.id);
              }
            }
          }
        } catch (cgErr) {
          console.warn('CollectionGroup query failed (likely needs index):', cgErr);
        }

        console.log(`Loaded ${matched.length} students for lecturer ${uid}`);
        setStudents(matched);
      } catch (err) {
        console.error('Error loading students:', err);
      }
    };

    fetchStudents();
  }, [uid, courses]);

  /* ═══════════════════════════════════════════════════════════════
     LOAD ANNOUNCEMENTS (sub-collection under lecturers/{uid}/announcements)
  ═══════════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!uid) return;

    const annCol = collection(db, 'lecturers', uid, 'announcements');

    const unsubAnn = onSnapshot(
      query(annCol, orderBy('createdAt', 'desc')),
      (snap) => {
        setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      },
      (err) => console.error('Announcements listener error:', err)
    );
    return unsubAnn;
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    const logsCol = collection(db, 'staff_logs');
    const q = query(
      logsCol,
      where('staffId', '==', uid),
      where('actionType', '==', 'result_upload'),
      orderBy('timestamp', 'desc')
    );

    const unsubLogs = onSnapshot(q, (snap) => {
      setResultLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })).slice(0, 5));
    });

    return () => unsubLogs();
  }, [uid]);

  /* Load Personal HR Data (Payslips & Leaves) */
  useEffect(() => {
    if (!uid || !lecturerData?.name) return;

    const unsubPay = onSnapshot(
      query(collection(db, 'payroll'), where('employeeId', '==', uid)),
      snap => setPersonalPayroll(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    const unsubLeave = onSnapshot(
      query(collection(db, 'leave_requests'), where('employeeId', '==', uid)),
      snap => setPersonalLeaves(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    return () => { unsubPay(); unsubLeave(); };
  }, [uid, lecturerData?.name]);

  /* ═══════════════════════════════════════════════════════════════
     ACTIONS
  ═══════════════════════════════════════════════════════════════ */
  const logout = async () => {
    await signOut();
    navigate('/login');
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const showError = (msg) => {
    setDbError(msg);
    setTimeout(() => setDbError(''), 5000);
  };

  const triggerConfirm = (title, message, icon, onConfirm) => {
    setConfirmModal({ show: true, title, message, icon, onConfirm });
  };

  /* Update password (stored in Firestore) */
  const updatePassword = async (e) => {
    e.preventDefault();
    if (passForm.new !== passForm.confirm) return alert("Passwords don't match");
    if (!lecturerData?.docId) return;
    try {
      // 1. Update Actual Firebase Auth Password
      await changePassword(passForm.new);

      // 2. Update Firestore record for reference/seeding
      await updateDoc(doc(db, 'lecturers', lecturerData.docId), {
        password: passForm.new,
        mustChangePassword: false,
        updatedAt: serverTimestamp(),
      });

      setShowPasswordForce(false);
      setPassForm({ new: '', confirm: '' });
      showSuccess('Password updated successfully!');
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/requires-recent-login') {
        triggerConfirm('Re-authentication Required', 'For security reasons, please logout and log back in before changing your password.', 'fa-lock', null);
      } else {
        showError('Error updating password: ' + err.message);
      }
    }
  };

  /* Post new announcement to Firestore */
  const handleNewAnnouncement = async (e) => {
    e.preventDefault();
    if (!uid) return;
    setPostingAnn(true);
    try {
      // 1. Save to lecturer's own records
      await addDoc(collection(db, 'lecturers', uid, 'announcements'), {
        ...newAnn,
        date: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp(),
        postedBy: lecturerData?.name || currentUser?.email,
      });

      // 2. Resolve target students
      const targetStudents = newAnn.targetCourse === 'All My Students'
        ? students
        : students.filter(s => s.enrolledIn?.includes(newAnn.targetCourse));

      const today = new Date().toISOString().split('T')[0];

      // 3. Push to each student's notifications sub-collection
      const notifyPromises = targetStudents.map(student => {
        return addDoc(collection(db, 'students', student.docId, 'notifications'), {
          title: newAnn.title,
          text: newAnn.content,
          type: newAnn.status === 'Urgent' ? 'alert' : 'info',
          date: today,
          read: false,
          sender: lecturerData?.name || 'Lecturer',
          courseCode: newAnn.targetCourse === 'All My Students' ? 'General' : newAnn.targetCourse,
          createdAt: serverTimestamp(),
        });
      });

      await Promise.all(notifyPromises);

      setShowAnnouncementModal(false);
      setNewAnn({ title: '', content: '', status: 'Info', targetCourse: 'All My Students' });
      showSuccess(`Announcement posted and sent to ${targetStudents.length} students!`);
    } catch (err) {
      console.error('Post announcement error:', err);
      showError('Error posting announcement. Please try again.');
    } finally {
      setPostingAnn(false);
    }
  };

  /* Delete announcement from Firestore */
  const handleDeleteAnnouncement = async (annId) => {
    if (!uid) return;
    try {
      await deleteDoc(doc(db, 'lecturers', uid, 'announcements', annId));
      showSuccess('Announcement deleted.');
    } catch (err) {
      console.error('Delete announcement error:', err);
    }
  };

  const handleSaveCourse = async () => {
    if (!selectedCourse?.docId) return;
    setSavingCourse(true);
    try {
      // Corrected: Update the root 'courses' collection using docId
      await updateDoc(doc(db, 'courses', selectedCourse.docId), {
        status: managedStatus || selectedCourse.status,
        updatedAt: serverTimestamp(),
      });
      setShowManageModal(false);
      showSuccess(`Course ${selectedCourse.code || selectedCourse.id} updated successfully!`);
    } catch (err) {
      console.error('Save course error:', err);
      showError('Error saving course changes. Please try again.');
    } finally {
      setSavingCourse(false);
    }
  };

  const logResultAction = async (actionDetails) => {
    try {
      await addDoc(collection(db, 'staff_logs'), {
        staffId: uid,
        staffName: lecturer.name,
        actionType: 'result_upload',
        timestamp: serverTimestamp(),
        ...actionDetails
      });
    } catch (err) {
      console.error("Error logging action:", err);
    }
  };

  const handleBulkResultUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setBulkUploading(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const lines = text.split('\n');

        // Expected CSV: CourseCode, StudentID, CA, Exam
        let successCount = 0;
        let errorCount = 0;

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const parts = line.split(',').map(p => p.trim());
          if (parts.length < 4) {
            errorCount++;
            continue;
          }

          const [courseCode, studentRegNo, ca, exam] = parts;

          // 1. Find the course in lecturer's assigned courses
          const course = courses.find(c => (c.code || '').toUpperCase() === courseCode.toUpperCase());
          if (!course) {
            console.warn(`Course ${courseCode} not assigned to this lecturer.`);
            errorCount++;
            continue;
          }

          // 2. Find the student
          const student = students.find(s => (s.studentId || '').toUpperCase() === studentRegNo.toUpperCase());
          if (!student) {
            console.warn(`Student ${studentRegNo} not found.`);
            errorCount++;
            continue;
          }

          const caVal = parseFloat(ca) || 0;
          const exVal = parseFloat(exam) || 0;
          const total = caVal + exVal;
          const grade = calculateGrade(total);

          const resultData = {
            studentId: student.docId,
            studentName: student.name,
            studentRegNo: student.studentId || student.id,
            courseId: course.docId,
            courseCode: course.code,
            courseName: course.name,
            caScore: caVal,
            examScore: exVal,
            total: total,
            grade: grade,
            gpa: getGradePoints(grade),
            status: 'draft',
            submittedBy: uid,
            updatedAt: serverTimestamp(),
            semester: course.semester || 'Current'
          };

          // 3. Check for existing result to update or add
          const resQuery = query(
            collection(db, 'results'),
            where('studentId', '==', student.docId),
            where('courseCode', '==', course.code)
          );
          const resSnap = await getDocs(resQuery);

          if (!resSnap.empty) {
            await updateDoc(doc(db, 'results', resSnap.docs[0].id), resultData);
          } else {
            await addDoc(collection(db, 'results'), resultData);
          }
          successCount++;
        }

        showSuccess(`Bulk upload complete! ${successCount} results imported as draft, ${errorCount} errors.`);

        await logResultAction({
          description: `Bulk result upload performed`,
          courseCodes: Array.from(new Set(lines.slice(1).map(l => l.split(',')[0].trim()).filter(Boolean))),
          successCount,
          errorCount,
          totalProcessed: successCount + errorCount
        });

      } catch (err) {
        console.error("Bulk upload error:", err);
        showError("Failed to process bulk upload file.");
      } finally {
        setBulkUploading(false);
        // Clear input
        e.target.value = '';
      }
    };

    reader.readAsText(file);
  };

  const handleSubmitAllResults = async () => {
    triggerConfirm(
      "Submit All Results",
      "Are you sure you want to submit all draft results for your assigned courses for admin approval? This action cannot be easily undone.",
      "fa-paper-plane",
      async () => {
        setSubmittingAll(true);
        try {
          const courseCodes = courses.map(c => c.code).filter(Boolean);
          if (courseCodes.length === 0) return;

          const q = query(
            collection(db, 'results'),
            where('courseCode', 'in', courseCodes),
            where('status', '==', 'draft')
          );
          const snap = await getDocs(q);

          if (snap.empty) {
            showSuccess("No draft results found to submit.");
            return;
          }

          const updatePromises = snap.docs.map(d =>
            updateDoc(doc(db, 'results', d.id), {
              status: 'submitted',
              submittedAt: serverTimestamp()
            })
          );

          await Promise.all(updatePromises);

          showSuccess(`Successfully submitted ${snap.size} results to admin for approval!`);

          await logResultAction({
            description: `Mass result submission to admin performed`,
            courseCodes,
            totalSubmitted: snap.size
          });

        } catch (err) {
          console.error("Mass submission error:", err);
          showError("Failed to submit results. Please try again.");
        } finally {
          setSubmittingAll(false);
          setConfirmModal(prev => ({ ...prev, show: false }));
        }
      }
    );
  };

  const handleClearResultLogs = async () => {
    triggerConfirm(
      "Clear History",
      "Are you sure you want to clear your result upload history? This will permanently remove all logs.",
      "fa-trash-alt",
      async () => {
        try {
          const q = query(
            collection(db, 'staff_logs'),
            where('staffId', '==', uid),
            where('actionType', '==', 'result_upload')
          );
          const snap = await getDocs(q);
          const deletePromises = snap.docs.map(d => deleteDoc(doc(db, 'staff_logs', d.id)));
          await Promise.all(deletePromises);
          showSuccess("Result upload history cleared.");
        } catch (err) {
          console.error("Error clearing logs:", err);
          showError("Failed to clear history.");
        } finally {
          setConfirmModal(prev => ({ ...prev, show: false }));
        }
      }
    );
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'leave_requests'), {
        ...leaveForm,
        employeeId: uid,
        employeeName: lecturerData?.name || currentUser?.email,
        status: 'Pending',
        createdAt: serverTimestamp()
      });
      setShowLeaveModal(false);
      showSuccess('Leave request submitted successfully.');
    } catch (err) {
      console.error(err);
      showError('Failed to submit leave request.');
    }
  };

  /* ── Derived display values ── */
  const lecturer = {
    name: lecturerData?.name || currentUser?.displayName || 'Loading...',
    role: lecturerData?.role || lecturerData?.department || 'Lecturer',
    email: lecturerData?.email || currentUser?.email || '—',
    id: lecturerData?.id || lecturerData?.staffId || lecturerData?.docId || '—',
  };

  const displayInitials = lecturer.name !== 'Loading...'
    ? lecturer.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '..';

  const totalStudents = students.length;
  const totalCourses = courses.length;
  const activeCourses = courses.filter(c => c.status === 'Ongoing').length;
  const weeklyHours = lecturerData?.weeklyHours || courses.filter(c => c.status === 'Ongoing').length * 4;
  const avgRating = lecturerData?.avgRating || '—';

  /* Resolve the best display ID for a student */
  const getStudentId = (s) =>
    s.studentId || s.student_id || (s.id ? `UID-${s.id.slice(0, 8).toUpperCase()}` : '—');

  const filteredStudents = students.filter(s => {
    const q = searchQuery.toLowerCase();
    return (
      (s.name || '').toLowerCase().includes(q) ||
      (s.studentId || '').toLowerCase().includes(q) ||
      (s.id || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q) ||
      (s.docId || '').toLowerCase().includes(q)
    );
  });

  const navItems = [
    { id: 'dashboard', icon: 'fa-tachometer-alt', label: 'Dashboard' },
    { id: 'courses', icon: 'fa-book', label: 'My Courses' },
    { id: 'exams', icon: 'fa-file-signature', label: 'Exams' },
    { id: 'results', icon: 'fa-poll', label: 'Results' },
    { id: 'students', icon: 'fa-users', label: 'Students' },
    { id: 'announcements', icon: 'fa-bullhorn', label: 'Announcements' },
    { id: 'elearning', icon: 'fa-graduation-cap', label: 'E-Learning platform' },
    { id: 'settings', icon: 'fa-cog', label: 'Settings' },
  ];

  /* ═══════════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════════ */
  return (
    <div className="sd-shell staff-theme">
      {/* OVERLAY */}
      {sidebarOpen && <div className="sd-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* SIDEBAR */}
      <div className={`sd-sidebar ${sidebarOpen ? 'sd-sidebar--open' : ''}`}>
        <div className="sd-sidebar-logo">
          <div className="sd-logo-icon"><i className="fas fa-chalkboard-teacher"></i></div>
          <div>
            <div className="sd-logo-title">Fairview Portal</div>
            <div className="sd-logo-sub">Staff Panel</div>
          </div>
        </div>

        <div className="sd-profile-pill">
          <div className="sd-avatar" style={{ background: 'var(--accent-color)', color: '#1e293b' }}>{displayInitials}</div>
          <div className="sd-profile-text">
            <div className="sd-profile-name">{lecturer.name}</div>
            <div className="sd-profile-id">{lecturer.role}</div>
          </div>
        </div>

        <nav className="sd-nav">
          <div className="sd-nav-group">Management</div>
          {navItems.map(item => (
            <a key={item.id} href="#"
              className={`sd-nav-link ${activeTab === item.id ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                if (item.id === 'elearning') {
                  navigate('/elearning');
                } else {
                  setActiveTab(item.id);
                }
                setSidebarOpen(false);
              }}>
              <i className={`fas ${item.icon}`}></i>
              <span>{item.label}</span>
              {item.id === 'announcements' && announcements.length > 0 && (
                <span className="sd-notif-dot" style={{ position: 'static', marginLeft: 'auto' }}>{announcements.length}</span>
              )}
              {activeTab === item.id && <div className="sd-nav-indicator"></div>}
            </a>
          ))}

          <div className="sd-nav-group">Self-Service</div>
          {[
            { id: 'payslips', icon: 'fa-file-invoice-dollar', label: 'My Payslips' },
            { id: 'leaves', icon: 'fa-calendar-check', label: 'My Leave' },
            { id: 'documents', icon: 'fa-folder-open', label: 'HR Documents' },
          ].map(item => (
            <a key={item.id} href="#"
              className={`sd-nav-link ${activeTab === item.id ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                setActiveTab(item.id);
                setSidebarOpen(false);
              }}>
              <i className={`fas ${item.icon}`}></i>
              <span>{item.label}</span>
            </a>
          ))}
        </nav>

        <div className="sd-sidebar-footer">
          <a href="#" className="sd-nav-link" onClick={(e) => { e.preventDefault(); setShowProfileModal(true); }}>
            <i className="fas fa-user-circle"></i> Profile
          </a>
          <a href="#" className="sd-nav-link sd-logout" onClick={(e) => { e.preventDefault(); logout(); }}>
            <i className="fas fa-sign-out-alt"></i> Logout
          </a>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="sd-body">
        <header className="sd-topbar">
          <button className="sd-hamburger" onClick={() => setSidebarOpen(true)}>
            <i className="fas fa-bars"></i>
          </button>
          <div className="sd-topbar-title">
            {navItems.find(i => i.id === activeTab)?.label}
          </div>
          <div className="sd-topbar-right">
            <div style={{ position: 'relative' }}>
              <button className="sd-icon-btn" onClick={() => setShowNotifPanel(!showNotifPanel)}>
                <i className="fas fa-bell"></i>
                {announcements.length > 0 && <span className="sd-notif-dot">{announcements.length}</span>}
              </button>

              {showNotifPanel && (
                <div className="sd-notif-panel" style={{ right: 0, top: '50px' }}>
                  <div className="sd-notif-header">
                    <span>Recent Announcements</span>
                    <button className="sd-link-btn" onClick={() => { setActiveTab('announcements'); setShowNotifPanel(false); }}>View All</button>
                  </div>
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {announcements.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                        No recent announcements.
                      </div>
                    ) : announcements.slice(0, 5).map(ann => (
                      <div key={ann.id} className="sd-notif-item" style={{ cursor: 'pointer' }} onClick={() => { setActiveTab('announcements'); setShowNotifPanel(false); }}>
                        <i className={`fas ${ann.status === 'Urgent' ? 'fa-exclamation-circle' : 'fa-info-circle'}`}
                          style={{ color: ann.status === 'Urgent' ? '#ef4444' : '#7c3aed' }}></i>
                        <div>
                          <div className="sd-notif-text" style={{ fontWeight: 600 }}>{ann.title}</div>
                          <div className="sd-notif-time">{ann.date}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="sd-topbar-avatar" onClick={() => setShowProfileModal(true)}>{displayInitials}</div>
          </div>
        </header>

        {/* Success / error banners */}
        {successMsg && (
          <div className="sd-toast" style={{ background: 'linear-gradient(135deg,#059669,#10b981)' }}>
            <i className="fas fa-check-circle"></i> {successMsg}
          </div>
        )}
        {dbError && (
          <div className="sd-toast sd-toast-err">
            <i className="fas fa-exclamation-triangle"></i> {dbError}
          </div>
        )}

        <main className="sd-main">
          {loading ? <Spinner /> : (
            <>
              {/* ══════════ DASHBOARD TAB ══════════ */}
              {activeTab === 'dashboard' && (
                <div className="sd-tab-fade">
                  <div className="sd-welcome-banner">
                    <div>
                      <h1 className="sd-welcome-h1">
                        Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
                        {lecturer.name.split(' ')[0]}!
                      </h1>
                      <p className="sd-welcome-p">
                        {totalCourses > 0
                          ? `You are assigned to ${totalCourses} course${totalCourses > 1 ? 's' : ''}: ${courses.map(c => c.code || c.id).join(', ')}.`
                          : 'Welcome to the Fairview Staff Portal. No courses are currently assigned to you.'}
                      </p>
                    </div>
                    <div className="sd-welcome-actions">
                      <button className="sd-btn sd-btn-white" onClick={() => setShowAnnouncementModal(true)}>
                        <i className="fas fa-plus"></i> New Announcement
                      </button>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="sd-stats-row">
                    <div className="sd-stat-card">
                      <div className="sd-stat-icon"><i className="fas fa-users"></i></div>
                      <div className="sd-stat-val">{totalStudents}</div>
                      <div className="sd-stat-lbl">My Students</div>
                    </div>
                    <div className="sd-stat-card">
                      <div className="sd-stat-icon"><i className="fas fa-book-open"></i></div>
                      <div className="sd-stat-val">{totalCourses}</div>
                      <div className="sd-stat-lbl">Assigned Courses</div>
                    </div>
                    <div className="sd-stat-card">
                      <div className="sd-stat-icon"><i className="fas fa-clock"></i></div>
                      <div className="sd-stat-val">{weeklyHours}</div>
                      <div className="sd-stat-lbl">Weekly Hours</div>
                    </div>
                    <div className="sd-stat-card">
                      <div className="sd-stat-icon"><i className="fas fa-bullhorn"></i></div>
                      <div className="sd-stat-val">{announcements.length}</div>
                      <div className="sd-stat-lbl">Announcements</div>
                    </div>
                  </div>

                  <div className="sd-two-col">
                    {/* My Courses summary */}
                    <div className="sd-card">
                      <div className="sd-card-header">My Courses
                        <button className="sd-link-btn" onClick={() => setActiveTab('courses')}>View All</button>
                      </div>
                      <div className="sd-card-body" style={{ padding: 0 }}>
                        {courses.slice(0, 3).map(c => (
                          <div key={c.id} className="sd-notif-row">
                            <div className="sd-schedule-dot" style={{ background: c.status === 'Ongoing' ? '#7c3aed' : '#10b981' }}>
                              <i className="fas fa-book"></i>
                            </div>
                            <div className="sd-notif-body">
                              <div className="sd-notif-text" style={{ fontWeight: 600 }}>{c.code} – {c.name}</div>
                              <div className="sd-notif-time">{c.semester} · <Badge status={c.status} /></div>
                            </div>
                          </div>
                        ))}
                        {courses.length === 0 && (
                          <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8' }}>No courses assigned yet.</div>
                        )}
                      </div>
                    </div>

                    {/* Recent Students */}
                    <div className="sd-card">
                      <div className="sd-card-header">Recent Students
                        <button className="sd-link-btn" onClick={() => setActiveTab('students')}>View All</button>
                      </div>
                      <div className="sd-card-body" style={{ padding: 0 }}>
                        {students.slice(0, 4).map(s => (
                          <div key={s.docId || s.id} className="sd-notif-row">
                            <div className="sd-avatar-xl" style={{ width: 35, height: 35, fontSize: 12 }}>
                              {(s.name || 'S').charAt(0).toUpperCase()}
                            </div>
                            <div className="sd-notif-body">
                              <div className="sd-notif-text" style={{ fontWeight: 600 }}>{s.name || 'Student'}</div>
                              <div className="sd-notif-time">{s.course} · <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{getStudentId(s)}</span></div>
                            </div>
                          </div>
                        ))}
                        {students.length === 0 && (
                          <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8' }}>
                            No students enrolled in your courses yet.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Recent Announcements preview */}
                  {announcements.length > 0 && (
                    <div className="sd-card" style={{ marginTop: 24 }}>
                      <div className="sd-card-header">Recent Announcements
                        <button className="sd-link-btn" onClick={() => setActiveTab('announcements')}>View All</button>
                      </div>
                      <div className="sd-card-body" style={{ padding: 0 }}>
                        {announcements.slice(0, 2).map(ann => (
                          <div key={ann.id} className="sd-notif-row">
                            <div className="sd-notif-icon" style={{ color: ann.status === 'Urgent' ? '#dc2626' : '#7c3aed' }}>
                              <i className={`fas ${ann.status === 'Urgent' ? 'fa-exclamation-circle' : 'fa-info-circle'}`}></i>
                            </div>
                            <div className="sd-notif-body">
                              <div className="sd-notif-text" style={{ fontWeight: 700 }}>{ann.title}</div>
                              <div className="sd-notif-time">{ann.date}</div>
                            </div>
                            <Badge status={ann.status} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ══════════ COURSES TAB ══════════ */}
              {activeTab === 'courses' && (
                <div className="sd-tab-fade">
                  <div className="sd-page-header">
                    <div>
                      <h2 className="sd-page-title">Course Management</h2>
                      <p className="sd-page-sub">
                        {activeCourses} active · {courses.filter(c => c.status === 'Completed').length} completed
                      </p>
                    </div>
                  </div>

                  {/* Summary stats */}
                  <div className="sd-stats-row" style={{ marginBottom: 24 }}>
                    {[
                      { icon: 'fa-book', val: courses.length, lbl: 'Total Courses', color: '#7c3aed', bg: 'rgba(124,58,237,0.1)' },
                      { icon: 'fa-play-circle', val: activeCourses, lbl: 'Ongoing', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
                      { icon: 'fa-check-circle', val: courses.filter(c => c.status === 'Completed').length, lbl: 'Completed', color: '#2563eb', bg: 'rgba(37,99,235,0.1)' },
                      { icon: 'fa-users', val: totalStudents, lbl: 'Total Students', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
                    ].map((s) => (
                      <div key={s.lbl} className="sd-stat-card">
                        <div className="sd-stat-icon" style={{ background: s.bg, color: s.color }}><i className={`fas ${s.icon}`}></i></div>
                        <div className="sd-stat-val">{s.val}</div>
                        <div className="sd-stat-lbl">{s.lbl}</div>
                      </div>
                    ))}
                  </div>

                  <div className="sd-card">
                    <div className="sd-table-wrapper">
                      {courses.length === 0 ? (
                        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No courses assigned yet.</div>
                      ) : (
                        <table className="sd-table">
                          <thead>
                            <tr>
                              <th>Code</th>
                              <th>Course Name</th>
                              <th>Students</th>
                              <th>Semester</th>
                              <th>Status</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {courses.map(course => (
                              <tr key={course.id}>
                                <td><span className="sd-code">{course.code}</span></td>
                                <td className="sd-td-bold">{course.name}</td>
                                <td>{students.filter(s => (s.enrolledIn || []).some(c => String(c).toUpperCase() === String(course.code || course.id).toUpperCase())).length}</td>
                                <td>{course.semester}</td>
                                <td><Badge status={course.status} /></td>
                                <td>
                                  <button className="sd-dl-btn" onClick={() => {
                                    setSelectedCourse(course);
                                    setManagedStatus(course.status);
                                    setShowManageModal(true);
                                  }}>
                                    <i className="fas fa-edit"></i> Manage
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ══════════ STUDENTS TAB ══════════ */}
              {activeTab === 'exams' && (
                <ExamManager
                  courses={courses}
                  lecturerId={uid}
                  showSuccess={showSuccess}
                  showError={showError}
                />
              )}

              {activeTab === 'students' && (
                <div className="sd-tab-fade">
                  <div className="sd-page-header">
                    <div>
                      <h2 className="sd-page-title">Student Directory</h2>
                      <p className="sd-page-sub">
                        {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''} enrolled in your courses.
                      </p>
                    </div>
                    <input
                      type="text"
                      placeholder="Search name, ID or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ height: 40, width: 260, padding: '0 15px', borderRadius: 8, border: '2px solid #e2e8f0', outline: 'none', fontSize: 14 }}
                    />
                  </div>

                  <div className="sd-card">
                    <div className="sd-table-wrapper">
                      {filteredStudents.length === 0 ? (
                        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                          {students.length === 0
                            ? 'No students enrolled in your courses yet.'
                            : 'No students match your search.'}
                        </div>
                      ) : (
                        <table className="sd-table">
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>Student ID</th>
                              <th>Email</th>
                              <th>Course(s)</th>
                              <th>Status</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredStudents.map(student => (
                              <tr key={student.docId || student.id}>
                                <td className="sd-td-bold">
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#7c3aed22', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>
                                      {(student.name || 'S').charAt(0).toUpperCase()}
                                    </div>
                                    {student.name || 'Unknown'}
                                  </div>
                                </td>
                                <td>
                                  <span style={{ fontFamily: 'monospace', fontSize: 13, color: student.studentId ? 'inherit' : '#94a3b8' }}>
                                    {getStudentId(student)}
                                  </span>
                                </td>
                                <td>{student.email || '—'}</td>
                                <td>
                                  {(student.enrolledIn || []).map(c => (
                                    <span key={c} className="sd-code" style={{ marginRight: 4, fontSize: 11 }}>{c}</span>
                                  ))}
                                </td>
                                <td><Badge status={student.status || 'Active'} /></td>
                                <td>
                                  <button className="sd-icon-btn-sm" title="Email student"
                                    onClick={() => window.open(`mailto:${student.email}`)}>
                                    <i className="fas fa-envelope"></i>
                                  </button>
                                  <button className="sd-icon-btn-sm" title="View profile">
                                    <i className="fas fa-eye"></i>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ══════════ ANNOUNCEMENTS TAB ══════════ */}
              {activeTab === 'announcements' && (
                <div className="sd-tab-fade">
                  <div className="sd-page-header">
                    <div>
                      <h2 className="sd-page-title">Course Announcements</h2>
                      <p className="sd-page-sub">Post updates and notices for your students.</p>
                    </div>
                    <button className="sd-btn sd-btn-primary" onClick={() => setShowAnnouncementModal(true)}>
                      <i className="fas fa-plus"></i> New Announcement
                    </button>
                  </div>

                  <div className="sd-card">
                    <div className="sd-card-body" style={{ padding: 0 }}>
                      {announcements.length === 0 ? (
                        <div style={{ padding: 60, textAlign: 'center', background: '#f8fafc', borderRadius: 16, border: '2px dashed #e2e8f0' }}>
                          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#94a3b8', fontSize: 24 }}>
                            <i className="fas fa-bullhorn"></i>
                          </div>
                          <h4 style={{ color: '#475569', marginBottom: 8 }}>No announcements yet</h4>
                          <p style={{ color: '#94a3b8', fontSize: 13, maxWidth: 300, margin: '0 auto' }}>Post updates and notices for your students. They will see them instantly on their portal.</p>
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gap: 16 }}>
                          {announcements.map(ann => (
                            <div key={ann.id} className="sd-announcement-card">
                              <div className={`sd-announcement-icon ${ann.status === 'Urgent' ? 'urgent' : 'info'}`}>
                                <i className={`fas ${ann.status === 'Urgent' ? 'fa-exclamation-circle' : 'fa-info-circle'}`}></i>
                              </div>
                              <div className="sd-announcement-content">
                                <div className="sd-announcement-header">
                                  <h4 className="sd-announcement-title">{ann.title}</h4>
                                  <Badge status={ann.status} />
                                </div>
                                <div className="sd-announcement-message">{ann.content}</div>
                                <div className="sd-announcement-footer">
                                  <div className="sd-announcement-meta">
                                    <span><i className="far fa-calendar"></i> {ann.date}</span>
                                    {ann.targetCourse && (
                                      <span><i className="fas fa-users"></i> {ann.targetCourse}</span>
                                    )}
                                    {ann.postedBy && (
                                      <span><i className="far fa-user"></i> {ann.postedBy}</span>
                                    )}
                                  </div>
                                  <div className="sd-announcement-actions">
                                    <button className="sd-icon-btn" style={{ color: '#dc2626' }}
                                      onClick={() => triggerConfirm(
                                        "Delete Announcement",
                                        "Are you sure you want to delete this announcement? This will remove it from all students' feeds.",
                                        "fa-trash",
                                        () => handleDeleteAnnouncement(ann.id)
                                      )}>
                                      <i className="fas fa-trash-alt"></i>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ══════════ SETTINGS TAB ══════════ */}
              {activeTab === 'settings' && (
                <div className="sd-tab-fade">
                  <div className="sd-page-header">
                    <h2 className="sd-page-title">Profile Settings</h2>
                  </div>
                  <div className="sd-card" style={{ maxWidth: 600 }}>
                    <div className="sd-card-body">
                      <div className="sd-profile-large">
                        <div className="sd-avatar-lg" style={{ width: 80, height: 80, fontSize: 28 }}>{displayInitials}</div>
                        <div>
                          <h2 className="sd-profile-fullname">{lecturer.name}</h2>
                          <p className="sd-profile-email">{lecturer.email}</p>
                          <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>Staff ID: {lecturer.id}</p>
                        </div>
                      </div>
                      <form className="sd-modal-form" onSubmit={updatePassword} style={{ marginTop: 24 }}>
                        <label>Full Name</label>
                        <input type="text" value={lecturer.name} readOnly style={{ background: '#f8fafc' }} />
                        <label>Email Address</label>
                        <input type="email" value={lecturer.email} readOnly style={{ background: '#f8fafc' }} />
                        <label>Department / Role</label>
                        <input type="text" value={lecturer.role} readOnly style={{ background: '#f8fafc' }} />
                        <label>New Password</label>
                        <input type="password" required value={passForm.new} onChange={e => setPassForm({ ...passForm, new: e.target.value })} placeholder="Enter new password" />
                        <label>Confirm Password</label>
                        <input type="password" required value={passForm.confirm} onChange={e => setPassForm({ ...passForm, confirm: e.target.value })} placeholder="Repeat password" />
                        <div style={{ marginTop: 24 }}>
                          <button type="submit" className="sd-btn sd-btn-primary">
                            <i className="fas fa-shield-alt"></i> Update Password
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {/* ══════════ RESULTS TAB ══════════ */}
              {activeTab === 'results' && (
                <div className="sd-tab-fade">
                  {!selectedCourse ? (
                    <>
                      <div className="sd-page-header">
                        <div>
                          <h2 className="sd-page-title">Result Management</h2>
                          <p className="sd-page-sub">Select a course to input or manage student scores.</p>
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                          <label className={`sd-btn ${bulkUploading ? 'sd-btn-ghost' : 'sd-btn-white'}`} style={{ cursor: bulkUploading ? 'not-allowed' : 'pointer' }}>
                            <i className={bulkUploading ? 'fas fa-circle-notch fa-spin' : 'fas fa-file-csv'}></i>{' '}
                            {bulkUploading ? 'Processing...' : 'Bulk Upload Direct Courses'}
                            <input type="file" accept=".csv" onChange={handleBulkResultUpload} disabled={bulkUploading} style={{ display: 'none' }} />
                          </label>
                          <button className="sd-btn sd-btn-primary" onClick={handleSubmitAllResults} disabled={submittingAll || courses.length === 0}>
                            <i className={submittingAll ? 'fas fa-circle-notch fa-spin' : 'fas fa-paper-plane'}></i>{' '}
                            {submittingAll ? 'Submitting...' : 'Submit All to Admin'}
                          </button>
                        </div>
                      </div>

                      <div className="sd-card">
                        <div className="sd-table-wrapper">
                          <table className="sd-table">
                            <thead>
                              <tr>
                                <th>Code</th><th>Course Name</th><th>Semester</th><th>Status</th><th>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {courses.map(course => (
                                <tr key={course.id}>
                                  <td><span className="sd-code">{course.code}</span></td>
                                  <td className="sd-td-bold">{course.name}</td>
                                  <td>{course.semester}</td>
                                  <td><Badge status={course.status} /></td>
                                  <td>
                                    <button className="sd-btn sd-btn-primary" style={{ padding: '6px 12px', fontSize: 13 }}
                                      onClick={() => setSelectedCourse(course)}>
                                      <i className="fas fa-edit"></i> Manage Results
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {resultLogs.length > 0 && (
                        <div className="sd-card" style={{ marginTop: 24 }}>
                          <div className="sd-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <i className="fas fa-history" style={{ color: '#7c3aed' }}></i>
                              Recent Upload Activity
                            </div>
                            <button className="sd-link-btn" style={{ color: '#dc2626', fontSize: 12 }} onClick={handleClearResultLogs}>
                              <i className="fas fa-trash-alt" style={{ marginRight: 4 }}></i> Clear History
                            </button>
                          </div>
                          <div className="sd-card-body" style={{ padding: 0 }}>
                            {resultLogs.map(log => (
                              <div key={log.id} className="sd-notif-row" style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <div className="sd-notif-icon" style={{ background: '#f5f3ff', color: '#7c3aed', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <i className="fas fa-cloud-upload-alt"></i>
                                </div>
                                <div className="sd-notif-body">
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div className="sd-notif-text" style={{ fontWeight: 700, fontSize: 14 }}>{log.description}</div>
                                    <div className="sd-notif-time" style={{ fontSize: 12 }}>{log.timestamp?.toDate().toLocaleString()}</div>
                                  </div>
                                  <div style={{ fontSize: 13, color: '#64748b', marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                    <span style={{ color: '#059669', fontWeight: 600 }}><i className="fas fa-check-circle" style={{ marginRight: 4 }}></i>{log.successCount} Successful</span>
                                    <span style={{ color: '#dc2626', fontWeight: 600 }}><i className="fas fa-times-circle" style={{ marginRight: 4 }}></i>{log.errorCount} Errors</span>
                                    <span style={{ background: '#f1f5f9', padding: '1px 8px', borderRadius: 6, fontSize: 11 }}>Courses: {log.courseCodes?.join(', ')}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <ResultEntry
                      lecturerId={uid}
                      course={selectedCourse}
                      onBack={() => setSelectedCourse(null)}
                      showSuccess={showSuccess}
                    />
                  )}
                </div>
              )}

              {/* ══════════ PAYSLIPS TAB ══════════ */}
              {activeTab === 'payslips' && (
                <div className="sd-tab-fade">
                  <div className="sd-page-header">
                    <div>
                      <h2 className="sd-page-title">My Payslips</h2>
                      <p className="sd-page-sub">View and download your monthly salary statements.</p>
                    </div>
                  </div>
                  <div className="sd-card">
                    <div className="sd-table-wrapper">
                      <table className="sd-table">
                        <thead>
                          <tr><th>Month</th><th>Gross Pay</th><th>Net Pay</th><th>Status</th><th>Action</th></tr>
                        </thead>
                        <tbody>
                          {personalPayroll.length === 0 ? (
                            <tr><td colSpan={5} className="sd-empty">No payslips found.</td></tr>
                          ) : personalPayroll.map(p => (
                            <tr key={p.id}>
                              <td>{p.month}</td>
                              <td>ZMW {p.grossPay?.toLocaleString() || p.amount?.toLocaleString()}</td>
                              <td style={{ fontWeight: 700, color: '#059669' }}>ZMW {p.netPay?.toLocaleString() || p.amount?.toLocaleString()}</td>
                              <td><Badge status={p.status} /></td>
                              <td><button className="sd-dl-btn"><i className="fas fa-download"></i> PDF</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ══════════ LEAVE TAB ══════════ */}
              {activeTab === 'leaves' && (
                <div className="sd-tab-fade">
                  <div className="sd-page-header">
                    <div>
                      <h2 className="sd-page-title">Leave Management</h2>
                      <p className="sd-page-sub">Track your leave requests and balances.</p>
                    </div>
                    <button className="sd-btn sd-btn-primary" onClick={() => setShowLeaveModal(true)}>
                      <i className="fas fa-plus"></i> New Leave Request
                    </button>
                  </div>
                  <div className="sd-card">
                    <div className="sd-table-wrapper">
                      <table className="sd-table">
                        <thead>
                          <tr><th>Type</th><th>Start Date</th><th>End Date</th><th>Status</th></tr>
                        </thead>
                        <tbody>
                          {personalLeaves.length === 0 ? (
                            <tr><td colSpan={4} className="sd-empty">No leave requests found.</td></tr>
                          ) : personalLeaves.map(l => (
                            <tr key={l.id}>
                              <td>{l.type}</td>
                              <td>{l.start}</td>
                              <td>{l.end}</td>
                              <td><Badge status={l.status} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ══════════ DOCUMENTS TAB ══════════ */}
              {activeTab === 'documents' && (
                <div className="sd-tab-fade">
                  <div className="sd-page-header">
                    <div>
                      <h2 className="sd-page-title">Personal HR Documents</h2>
                      <p className="sd-page-sub">Access your contracts, appointment letters, and certifications.</p>
                    </div>
                  </div>
                  <div className="sd-card">
                    <div className="sd-card-body" style={{ padding: 20 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 20 }}>
                        {[
                          { name: 'Employment Contract.pdf', size: '1.2 MB' },
                          { name: 'Staff Code of Conduct.pdf', size: '850 KB' },
                          { name: 'Appointment Letter.pdf', size: '450 KB' }
                        ].map((d, i) => (
                          <div key={i} className="sd-card" style={{ padding: 15, background: '#f8fafc', display: 'flex', alignItems: 'center', gap: 12 }}>
                            <i className="fas fa-file-pdf" style={{ color: '#dc2626', fontSize: 24 }}></i>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 700 }}>{d.name}</div>
                              <div style={{ fontSize: 11, color: '#64748b' }}>{d.size}</div>
                            </div>
                            <button className="sd-icon-btn-sm"><i className="fas fa-download"></i></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {showLeaveModal && (
                <div className="sd-modal-overlay">
                  <div className="sd-modal">
                    <div className="sd-modal-head">
                      <h3>Request Leave</h3>
                      <button className="sd-close-btn" onClick={() => setShowLeaveModal(false)}>&times;</button>
                    </div>
                    <div className="sd-modal-body">
                      <form onSubmit={handleApplyLeave} className="sd-modal-form">
                        <label>Leave Type</label>
                        <select value={leaveForm.type} onChange={e => setLeaveForm({ ...leaveForm, type: e.target.value })}>
                          <option>Annual Leave</option>
                          <option>Sick Leave</option>
                          <option>Maternity/Paternity Leave</option>
                          <option>Compassionate Leave</option>
                        </select>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                          <div><label>Start Date</label><input type="date" required onChange={e => setLeaveForm({ ...leaveForm, start: e.target.value })} /></div>
                          <div><label>End Date</label><input type="date" required onChange={e => setLeaveForm({ ...leaveForm, end: e.target.value })} /></div>
                        </div>
                        <label>Reason</label>
                        <textarea value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} placeholder="Optional reason..." />
                        <button type="submit" className="sd-btn sd-btn-primary" style={{ width: '100%', marginTop: 20 }}>Submit Request</button>
                      </form>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* ══════════ MANAGE COURSE MODAL ══════════ */}
      {showManageModal && selectedCourse && (
        <div className="sd-modal-overlay">
          <div className="sd-modal">
            <div className="sd-modal-head">
              <h3><i className="fas fa-edit"></i> Manage {selectedCourse.code}</h3>
              <button className="sd-close-btn" onClick={() => setShowManageModal(false)}>&times;</button>
            </div>
            <div className="sd-modal-body">
              <p style={{ marginBottom: 20 }}>
                Updating <strong>{selectedCourse.name}</strong>
              </p>
              <div className="sd-modal-form">
                <label>Course Status</label>
                <select value={managedStatus} onChange={e => setManagedStatus(e.target.value)}>
                  <option value="Ongoing">Ongoing</option>
                  <option value="Completed">Completed</option>
                  <option value="Canceled">Canceled</option>
                </select>
                <label>Students Enrolled</label>
                <input type="text" readOnly value={`${students.filter(s => (s.enrolledIn || []).some(c => String(c).toUpperCase() === String(selectedCourse.code || selectedCourse.id).toUpperCase())).length} student(s)`} style={{ background: '#f8fafc' }} />
                <label>Semester</label>
                <input type="text" readOnly value={selectedCourse.semester} style={{ background: '#f8fafc' }} />
              </div>
            </div>
            <div className="sd-modal-actions">
              <button className="sd-btn sd-btn-ghost" onClick={() => setShowManageModal(false)}>Cancel</button>
              <button className="sd-btn sd-btn-primary" onClick={handleSaveCourse} disabled={savingCourse}>
                {savingCourse ? <><i className="fas fa-circle-notch fa-spin"></i> Saving...</> : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ NEW ANNOUNCEMENT MODAL ══════════ */}
      {showAnnouncementModal && (
        <div className="sd-modal-overlay">
          <div className="sd-modal" style={{ maxWidth: 550 }}>
            <div className="sd-modal-head">
              <h3><i className="fas fa-plus-circle" style={{ color: '#7c3aed' }}></i> Create Announcement</h3>
              <button className="sd-close-btn" onClick={() => setShowAnnouncementModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleNewAnnouncement} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div className="sd-modal-body" style={{ padding: '24px 30px', flex: 1 }}>
                <div className="sd-modal-form">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label><i className="fas fa-tag"></i> Priority</label>
                      <select value={newAnn.status} onChange={(e) => setNewAnn({ ...newAnn, status: e.target.value })}>
                        <option value="Info">Normal (Info)</option>
                        <option value="Urgent">Important (Urgent)</option>
                      </select>
                    </div>
                    <div>
                      <label><i className="fas fa-users"></i> Audience</label>
                      <select value={newAnn.targetCourse} onChange={(e) => setNewAnn({ ...newAnn, targetCourse: e.target.value })}>
                        <option value="All My Students">All My Students ({students.length})</option>
                        {courses.map(c => (
                          <option key={c.docId || c.id} value={c.code || c.id}>{c.code || c.id} – {c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <label><i className="fas fa-heading"></i> Announcement Title</label>
                  <input
                    type="text"
                    placeholder="Enter a descriptive title..."
                    required
                    value={newAnn.title}
                    onChange={(e) => setNewAnn({ ...newAnn, title: e.target.value })}
                  />

                  <label><i className="fas fa-align-left"></i> Message Content</label>
                  <textarea
                    style={{ padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', minHeight: 140, outline: 'none', resize: 'vertical', fontSize: 14, fontFamily: 'inherit', background: '#fafbfd' }}
                    placeholder="Type your message here. Be as detailed as possible..."
                    required
                    value={newAnn.content}
                    onChange={(e) => setNewAnn({ ...newAnn, content: e.target.value })}
                  />
                  <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                    <i className="fas fa-info-circle"></i> This announcement will be immediately visible to all selected students.
                  </p>
                </div>
              </div>
              <div className="sd-modal-actions" style={{ padding: '20px 30px 30px', margin: 0, borderTop: '1px solid #f1f5f9' }}>
                <button type="button" className="sd-btn sd-btn-ghost" onClick={() => setShowAnnouncementModal(false)}>Cancel</button>
                <button type="submit" className="sd-btn sd-btn-primary" disabled={postingAnn}>
                  {postingAnn ? <><i className="fas fa-circle-notch fa-spin"></i> Posting...</> : <><i className="fas fa-paper-plane"></i> Post Announcement</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════ FORCE PASSWORD CHANGE MODAL ══════════ */}
      {showPasswordForce && (
        <div className="sd-modal-overlay" style={{ zIndex: 9999 }}>
          <div className="sd-modal" style={{ maxWidth: 450 }}>
            <div className="sd-modal-head">
              <h3><i className="fas fa-shield-alt"></i> Security Update Required</h3>
            </div>
            <div className="sd-modal-body">
              <p style={{ marginBottom: 20 }}>
                Welcome to the Fairview Staff Portal, <strong>{lecturer.name}</strong>. For security reasons, you must change your default password before proceeding.
              </p>
              <form className="sd-modal-form" id="forcePassForm" onSubmit={updatePassword}>
                <label>New Password</label>
                <input type="password" required value={passForm.new} onChange={e => setPassForm({ ...passForm, new: e.target.value })} placeholder="Enter a secure password" />
                <label>Confirm Password</label>
                <input type="password" required value={passForm.confirm} onChange={e => setPassForm({ ...passForm, confirm: e.target.value })} placeholder="Repeat password" />
              </form>
            </div>
            <div className="sd-modal-actions">
              <button type="submit" form="forcePassForm" className="sd-btn sd-btn-primary" style={{ width: '100%' }}>
                Update &amp; Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ PROFILE MODAL ══════════ */}
      {showProfileModal && (
        <div className="sd-modal-overlay">
          <div className="sd-modal">
            <div className="sd-modal-head">
              <h3><i className="fas fa-user-circle"></i> Staff Profile</h3>
              <button className="sd-close-btn" onClick={() => setShowProfileModal(false)}>&times;</button>
            </div>
            <div className="sd-profile-modal-top">
              <div className="sd-avatar-xl">{displayInitials}</div>
              <div>
                <div className="sd-pm-name">{lecturer.name}</div>
                <div className="sd-pm-email">{lecturer.email}</div>
                <div className="sd-pm-id">Staff ID: {lecturer.id}</div>
                <div className="sd-pm-id" style={{ marginTop: 4 }}>Department: {lecturer.role}</div>
              </div>
            </div>
            <div style={{ padding: '0 24px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                ['Courses', courses.length],
                ['Students', totalStudents],
                ['Active', activeCourses],
                ['Announcements', announcements.length],
              ].map(([k, v]) => (
                <div key={k} style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#7c3aed' }}>{v}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{k}</div>
                </div>
              ))}
            </div>
            <div className="sd-modal-actions">
              <button className="sd-btn sd-btn-primary" style={{ width: '100%' }} onClick={() => setShowProfileModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ GLOBAL CONFIRMATION MODAL ══════════ */}
      {confirmModal.show && (
        <div className="sd-modal-overlay" style={{ zIndex: 10000 }}>
          <div className="sd-modal" style={{ maxWidth: 400, textAlign: 'center' }}>
            <div className="sd-modal-body" style={{ padding: '40px 24px' }}>
              <div style={{ width: 70, height: 70, borderRadius: '50%', background: '#f5f3ff', color: '#7c3aed', fontSize: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <i className={`fas ${confirmModal.icon}`}></i>
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>{confirmModal.title}</h3>
              <p style={{ color: '#64748b', lineHeight: 1.6, fontSize: 15 }}>{confirmModal.message}</p>
            </div>
            <div className="sd-modal-actions" style={{ borderTop: '1px solid #f1f5f9', padding: '16px 24px' }}>
              <button className="sd-btn sd-btn-ghost" style={{ flex: 1 }} onClick={() => setConfirmModal({ ...confirmModal, show: false })}>
                {confirmModal.onConfirm ? 'Cancel' : 'Ok'}
              </button>
              {confirmModal.onConfirm && (
                <button className="sd-btn sd-btn-primary" style={{ flex: 1 }} onClick={confirmModal.onConfirm}>
                  Confirm Action
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffDashboard;
