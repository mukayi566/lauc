import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import ResultEntry from '../components/ResultEntry';
import {
  collection, query, where, onSnapshot,
  doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  serverTimestamp, orderBy
} from 'firebase/firestore';
import '../dashboards.css';

/* ─────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────── */
const Badge = ({ status }) => {
  const map = {
    'Ongoing':   'badge-green',
    'Completed': 'badge-teal',
    'Canceled':  'badge-red',
    'Active':    'badge-green',
    'Inactive':  'badge-red',
    'Urgent':    'badge-red',
    'Info':      'badge-teal',
    'draft':     'badge-draft',
    'submitted': 'badge-submitted',
    'approved':  'badge-approved',
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
  const [activeTab,              setActiveTab]              = useState('dashboard');
  const [sidebarOpen,            setSidebarOpen]            = useState(false);
  const [showManageModal,        setShowManageModal]        = useState(false);
  const [selectedCourse,         setSelectedCourse]         = useState(null);
  const [showAnnouncementModal,  setShowAnnouncementModal]  = useState(false);
  const [showProfileModal,       setShowProfileModal]       = useState(false);
  const [showPasswordForce,      setShowPasswordForce]      = useState(false);
  const [searchQuery,            setSearchQuery]            = useState('');
  const [showNotifPanel,         setShowNotifPanel]         = useState(false);
  const [managedStatus,          setManagedStatus]          = useState('');
  const [savingCourse,           setSavingCourse]           = useState(false);
  const [postingAnn,             setPostingAnn]             = useState(false);
  const [successMsg,             setSuccessMsg]             = useState('');
  const [dbError,                setDbError]                = useState('');

  /* ── Form state ── */
  const [newAnn,    setNewAnn]    = useState({ title: '', content: '', status: 'Info' });
  const [passForm,  setPassForm]  = useState({ new: '', confirm: '' });

  /* ── DB data state ── */
  const [loading,       setLoading]       = useState(true);
  const [lecturerData,  setLecturerData]  = useState(null);
  const [courses,       setCourses]       = useState([]);
  const [students,      setStudents]      = useState([]);
  const [announcements, setAnnouncements] = useState([]);

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
      (snap) => {
        const loaded = snap.docs.map(d => {
          const data = d.data();
          return { 
            docId: d.id, 
            ...data, 
            code: data.code || data.id // Ensure code is accessible
          };
        });
        setCourses(loaded);
        setLoading(false);
      },
      (err) => {
        console.error('Courses listener error:', err);
        if (err.code === 'permission-denied') {
          navigate('/login', { state: { error: "Access Denied: You do not have staff permissions to view this dashboard." } });
          return;
        }
        // Fallback: check by lecturer name if UID matches failed or if no UID stored
        if (lecturerData?.name) {
          const qName = query(coursesCol, where('lecturer', '==', lecturerData.name));
          getDocs(qName).then(res => {
            setCourses(res.docs.map(d => ({ docId: d.id, ...d.data(), code: d.data().code || d.data().id })));
            setLoading(false);
          }).catch(e => {
            console.error('Fallback courses error:', e);
            setDbError('Could not load assigned courses.');
            setLoading(false);
          });
        } else {
          setDbError('Data sync issue: Could not load assigned courses.');
          setLoading(false);
        }
      }
    );
    return unsubCourses;
  }, [uid, lecturerData?.name]);

  /* ═══════════════════════════════════════════════════════════════
     LOAD STUDENTS (all students whose courses array includes
     any of this lecturer's course codes)
  ═══════════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!uid || courses.length === 0) return;

    const courseCodes = courses.map(c => c.code);

    // Fetch all students, then filter client-side (Firestore array-contains-any
    // supports up to 30 values, which is sufficient here)
    const fetchStudents = async () => {
      try {
        const studentsSnap = await getDocs(collection(db, 'students'));
        const allStudents = studentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // For each student, check their sub-collection courses
        const matched = [];
        for (const student of allStudents) {
          const studentCoursesSnap = await getDocs(collection(db, 'students', student.id, 'courses'));
          const studentCodes = studentCoursesSnap.docs.map(d => d.data().code);
          const matchingCodes = studentCodes.filter(c => courseCodes.includes(c));
          if (matchingCodes.length > 0) {
            matched.push({
              ...student,
              enrolledIn: matchingCodes,
              // Display first matching course
              course: matchingCodes[0],
            });
          }
        }
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
        alert('For security reasons, please logout and log back in before changing your password.');
      } else {
        alert('Error updating password: ' + err.message);
      }
    }
  };

  /* Post new announcement to Firestore */
  const handleNewAnnouncement = async (e) => {
    e.preventDefault();
    if (!uid) return;
    setPostingAnn(true);
    try {
      await addDoc(collection(db, 'lecturers', uid, 'announcements'), {
        ...newAnn,
        date: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp(),
        postedBy: lecturerData?.name || currentUser?.email,
      });
      setShowAnnouncementModal(false);
      setNewAnn({ title: '', content: '', status: 'Info' });
      showSuccess('Announcement posted successfully!');
    } catch (err) {
      console.error('Post announcement error:', err);
      alert('Error posting announcement. Please try again.');
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

  /* ── Derived display values ── */
  const lecturer = {
    name:  lecturerData?.name     || currentUser?.displayName || 'Loading...',
    role:  lecturerData?.role     || lecturerData?.department || 'Lecturer',
    email: lecturerData?.email    || currentUser?.email       || '—',
    id:    lecturerData?.staffId  || lecturerData?.docId      || '—',
  };

  const displayInitials = lecturer.name !== 'Loading...'
    ? lecturer.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '..';

  const totalStudents  = students.length;
  const totalCourses   = courses.length;
  const activeCourses  = courses.filter(c => c.status === 'Ongoing').length;
  const weeklyHours    = lecturerData?.weeklyHours  || courses.filter(c => c.status === 'Ongoing').length * 4;
  const avgRating      = lecturerData?.avgRating    || '—';

  /* Resolve the best display ID for a student */
  const getStudentId = (s) =>
    s.studentId || s.student_id || (s.id ? `UID-${s.id.slice(0, 8).toUpperCase()}` : '—');

  const filteredStudents = students.filter(s => {
    const q = searchQuery.toLowerCase();
    return (
      (s.name        || '').toLowerCase().includes(q) ||
      (s.studentId   || '').toLowerCase().includes(q) ||
      (s.student_id  || '').toLowerCase().includes(q) ||
      (s.email       || '').toLowerCase().includes(q) ||
      (s.id          || '').toLowerCase().includes(q)
    );
  });

  const navItems = [
    { id: 'dashboard',     icon: 'fa-tachometer-alt', label: 'Dashboard'     },
    { id: 'courses',       icon: 'fa-book',           label: 'My Courses'    },
    { id: 'results',       icon: 'fa-poll',           label: 'Results'       },
    { id: 'students',      icon: 'fa-users',          label: 'Students'      },
    { id: 'announcements', icon: 'fa-bullhorn',       label: 'Announcements' },
    { id: 'settings',      icon: 'fa-cog',            label: 'Settings'      },
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
               onClick={(e) => { e.preventDefault(); setActiveTab(item.id); setSidebarOpen(false); }}>
              <i className={`fas ${item.icon}`}></i>
              <span>{item.label}</span>
              {item.id === 'announcements' && announcements.length > 0 && (
                <span className="sd-notif-dot" style={{ position: 'static', marginLeft: 'auto' }}>{announcements.length}</span>
              )}
              {activeTab === item.id && <div className="sd-nav-indicator"></div>}
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
                          <div key={s.id} className="sd-notif-row">
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
                      { icon: 'fa-book', val: courses.length,     lbl: 'Total Courses',    color: '#7c3aed', bg: 'rgba(124,58,237,0.1)' },
                      { icon: 'fa-play-circle', val: activeCourses, lbl: 'Ongoing',         color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
                      { icon: 'fa-check-circle', val: courses.filter(c => c.status === 'Completed').length, lbl: 'Completed', color: '#2563eb', bg: 'rgba(37,99,235,0.1)' },
                      { icon: 'fa-users', val: totalStudents,      lbl: 'Total Students',   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
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
                                <td>{students.filter(s => s.enrolledIn?.includes(course.code)).length}</td>
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
                              <tr key={student.id}>
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
                        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                          <i className="fas fa-bullhorn" style={{ fontSize: 32, marginBottom: 12, display: 'block', opacity: 0.3 }}></i>
                          No announcements posted yet.
                        </div>
                      ) : announcements.map(ann => (
                        <div key={ann.id} className="sd-notif-row">
                          <div className="sd-notif-icon" style={{ color: ann.status === 'Urgent' ? '#dc2626' : '#7c3aed' }}>
                            <i className={`fas ${ann.status === 'Urgent' ? 'fa-exclamation-circle' : 'fa-info-circle'}`}></i>
                          </div>
                          <div className="sd-notif-body">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div className="sd-notif-text" style={{ fontWeight: 700, fontSize: 15 }}>{ann.title}</div>
                              <Badge status={ann.status} />
                            </div>
                            <div className="sd-notif-text" style={{ marginTop: 5 }}>{ann.content}</div>
                            <div className="sd-notif-time" style={{ marginTop: 4 }}>
                              <i className="far fa-calendar" style={{ marginRight: 4 }}></i>{ann.date}
                              {ann.postedBy && <span style={{ marginLeft: 10 }}>· Posted by {ann.postedBy}</span>}
                            </div>
                          </div>
                          <button className="sd-icon-btn-sm" style={{ alignSelf: 'center', color: '#dc2626' }}
                            onClick={() => handleDeleteAnnouncement(ann.id)}>
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      ))}
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
                        <input type="password" required value={passForm.new} onChange={e => setPassForm({...passForm, new: e.target.value})} placeholder="Enter new password" />
                        <label>Confirm Password</label>
                        <input type="password" required value={passForm.confirm} onChange={e => setPassForm({...passForm, confirm: e.target.value})} placeholder="Repeat password" />
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
                      </div>
                      <div className="sd-card">
                        <div className="sd-table-wrapper">
                          <table className="sd-table">
                            <thead>
                              <tr>
                                <th>Code</th>
                                <th>Course Name</th>
                                <th>Semester</th>
                                <th>Status</th>
                                <th>Action</th>
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
                <input type="text" readOnly value={`${students.filter(s => s.enrolledIn?.includes(selectedCourse.code)).length} student(s)`} style={{ background: '#f8fafc' }} />
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
          <div className="sd-modal">
            <div className="sd-modal-head">
              <h3><i className="fas fa-bullhorn"></i> New Announcement</h3>
              <button className="sd-close-btn" onClick={() => setShowAnnouncementModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleNewAnnouncement}>
              <div className="sd-modal-form">
                <label>Title</label>
                <input
                  type="text"
                  placeholder="Announcement Title"
                  required
                  value={newAnn.title}
                  onChange={(e) => setNewAnn({...newAnn, title: e.target.value})}
                />
                <label>Message</label>
                <textarea
                  style={{ padding: 12, borderRadius: 10, border: '2px solid #e2e8f0', minHeight: 100, outline: 'none', resize: 'vertical' }}
                  placeholder="Write your announcement here..."
                  required
                  value={newAnn.content}
                  onChange={(e) => setNewAnn({...newAnn, content: e.target.value})}
                />
                <label>Priority</label>
                <select value={newAnn.status} onChange={(e) => setNewAnn({...newAnn, status: e.target.value})}>
                  <option value="Info">Normal (Info)</option>
                  <option value="Urgent">Important (Urgent)</option>
                </select>
              </div>
              <div className="sd-modal-actions">
                <button type="button" className="sd-btn sd-btn-ghost" onClick={() => setShowAnnouncementModal(false)}>Cancel</button>
                <button type="submit" className="sd-btn sd-btn-primary" disabled={postingAnn}>
                  {postingAnn ? <><i className="fas fa-circle-notch fa-spin"></i> Posting...</> : 'Post Announcement'}
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
                <input type="password" required value={passForm.new} onChange={e => setPassForm({...passForm, new: e.target.value})} placeholder="Enter a secure password" />
                <label>Confirm Password</label>
                <input type="password" required value={passForm.confirm} onChange={e => setPassForm({...passForm, confirm: e.target.value})} placeholder="Repeat password" />
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
                ['Courses',  courses.length],
                ['Students', totalStudents],
                ['Active',   activeCourses],
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
    </div>
  );
};

export default StaffDashboard;
