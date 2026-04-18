import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db, secondaryAuth } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  serverTimestamp,
  query,
  orderBy
} from 'firebase/firestore';
import '../admin.css';

/* ─────────────────────────────────────────
   TOAST
───────────────────────────────────────── */
const Toast = ({ toasts }) => (
  <div className="ad-toast-stack">
    {toasts.map(t => (
      <div key={t.id} className={`ad-toast ad-toast--${t.type}`}>
        <i className={`fas ${t.type === 'success' ? 'fa-check-circle' : t.type === 'error' ? 'fa-times-circle' : 'fa-info-circle'}`} />
        <span>{t.message}</span>
      </div>
    ))}
  </div>
);

/* ─────────────────────────────────────────
   CONFIRM DIALOG
───────────────────────────────────────── */
const ConfirmDialog = ({ config, onConfirm, onCancel }) => {
  if (!config) return null;
  return (
    <div className="ad-overlay" onClick={onCancel}>
      <div className="ad-confirm" onClick={e => e.stopPropagation()}>
        <div className="ad-confirm__icon"><i className="fas fa-exclamation-triangle" /></div>
        <h3>{config.title}</h3>
        <p>{config.message}</p>
        <div className="ad-confirm__actions">
          <button className="ad-btn ad-btn--ghost" onClick={onCancel}>Cancel</button>
          <button className="ad-btn ad-btn--danger" onClick={onConfirm}>
            <i className="fas fa-trash" /> Delete
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────
   MODAL
───────────────────────────────────────── */
const Modal = ({ type, editData, lecturers = [], onClose, onSave }) => {
  const [form, setForm] = useState(
    editData || (type === 'student'
      ? { 
          name: '', 
          email: '', 
          phone: '',
          level: 'Year 1 – Semester 1',
          school: 'School of Technology',
          program: 'BSc Computer Science', 
          status: 'Active' 
        }
      : type === 'lecturer'
      ? { name: '', email: '', dept: 'Computer Science', courses: 0 }
      : type === 'course'
      ? { name: '', dept: 'Computer Science', credits: 3, lecturer: '', enrolled: 0 }
      : {})
  );

  const title = editData ? `Edit ${type}` : `Add New ${type}`;

  const handle = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = e => {
    e.preventDefault();
    if (!form.name || !form.email && type !== 'course') return;
    onSave(form);
  };

  return (
    <div className="ad-overlay" onClick={onClose}>
      <div className="ad-modal" onClick={e => e.stopPropagation()}>
        <div className="ad-modal__header">
          <h3>{title.charAt(0).toUpperCase() + title.slice(1)}</h3>
          <button className="ad-modal__close" onClick={onClose}><i className="fas fa-times" /></button>
        </div>
        <form className="ad-modal__body" onSubmit={submit}>
          {/* COMMON FIELDS */}
          <div className="ad-form-row">
            <div className="ad-field">
              <label>{type === 'course' ? 'Course Name' : 'Full Name'}</label>
              <input value={form.name || ''} onChange={e => handle('name', e.target.value)} placeholder={type === 'course' ? "Enter course name" : "Enter full name"} required />
            </div>
            {type !== 'course' && (
              <>
                <div className="ad-field">
                  <label>Email Address</label>
                  <input type="email" value={form.email || ''} onChange={e => handle('email', e.target.value)} placeholder="name@example.com" required />
                </div>
                {type === 'student' && (
                  <div className="ad-field">
                    <label>Phone Number</label>
                    <input value={form.phone || ''} onChange={e => handle('phone', e.target.value)} placeholder="+260..." required />
                  </div>
                )}
              </>
            )}
          </div>

          {type === 'student' && (
            <>
              <div className="ad-form-row">
                <div className="ad-field">
                  <label>School</label>
                  <select value={form.school} onChange={e => handle('school', e.target.value)}>
                    <option>School of Technology</option>
                    <option>School of Business</option>
                    <option>School of Nursing</option>
                    <option>School of Humanities</option>
                  </select>
                </div>
                <div className="ad-field">
                  <label>Academic Level</label>
                  <select value={form.level} onChange={e => handle('level', e.target.value)}>
                    <option>Year 1 – Semester 1</option><option>Year 1 – Semester 2</option>
                    <option>Year 2 – Semester 1</option><option>Year 2 – Semester 2</option>
                    <option>Year 3 – Semester 1</option><option>Year 3 – Semester 2</option>
                    <option>Year 4 – Semester 1</option><option>Year 4 – Semester 2</option>
                  </select>
                </div>
              </div>
              <div className="ad-form-row">
                <div className="ad-field">
                  <label>Program</label>
                  <select value={form.program} onChange={e => handle('program', e.target.value)}>
                    <option>BSc Computer Science</option>
                    <option>BSc Nursing</option>
                    <option>BBA Business Administration</option>
                  </select>
                </div>
                <div className="ad-field">
                  <label>Status</label>
                  <select value={form.status} onChange={e => handle('status', e.target.value)}>
                    <option>Active</option>
                    <option>Suspended</option>
                  </select>
                </div>
              </div>
              {!editData && (
                <div className="ad-alert ad-alert--info" style={{marginTop: '15px'}}>
                   <i className="fas fa-key" /> Default Password: <code>LAUC@Student2026</code>
                </div>
              )}
            </>
          )}

          {type === 'lecturer' && (
            <>
              <div className="ad-form-row">
                <div className="ad-field">
                  <label>Department</label>
                  <select value={form.dept} onChange={e => handle('dept', e.target.value)}>
                    <option>Computer Science</option>
                    <option>Nursing</option>
                    <option>Business</option>
                  </select>
                </div>
              </div>
              {!editData && (
                <div className="ad-alert ad-alert--info" style={{marginTop: '15px'}}>
                   <i className="fas fa-key" /> Default Password: <code>LAUC@Lecturer2026</code>
                </div>
              )}
            </>
          )}

          {type === 'course' && (
            <>
              <div className="ad-form-row">
                <div className="ad-field">
                  <label>Department</label>
                  <select value={form.dept} onChange={e => {
                    handle('dept', e.target.value);
                    handle('lecturer', ''); // Clear lecturer on dept change
                  }}>
                    <option>Computer Science</option>
                    <option>Nursing</option>
                    <option>Business</option>
                  </select>
                </div>
                <div className="ad-field">
                  <label>Credit Hours</label>
                  <input type="number" min="1" max="6" value={form.credits} onChange={e => handle('credits', Number(e.target.value))} />
                </div>
              </div>
              <div className="ad-form-row">
                <div className="ad-field">
                  <label>Assigned Lecturer</label>
                  <select value={form.lecturer || ''} onChange={e => handle('lecturer', e.target.value)} required>
                    <option value="">-- Select Lecturer --</option>
                    {lecturers
                      .filter(l => l.dept === form.dept)
                      .map(l => (
                        <option key={l.docId} value={l.name}>{l.name}</option>
                      ))
                    }
                  </select>
                </div>
              </div>
            </>
          )}

          <div className="ad-modal__footer">
            <button type="button" className="ad-btn ad-btn--ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="ad-btn ad-btn--primary">
              <i className={`fas ${editData ? 'fa-save' : 'fa-plus'}`} />
              {editData ? 'Save Changes' : `Add ${type}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────
   APPLICATION DETAIL MODAL
───────────────────────────────────────── */
const ApplicationDetailModal = ({ app, onClose, onReview }) => {
  if (!app) return null;

  return (
    <div className="ad-overlay" onClick={onClose}>
      <div className="ad-modal ad-modal--lg" onClick={e => e.stopPropagation()}>
        <div className="ad-modal__header">
          <div>
            <h3>Application Details</h3>
            <p className="ad-muted">ID: {app.id}</p>
          </div>
          <button className="ad-modal__close" onClick={onClose}><i className="fas fa-times" /></button>
        </div>
        
        <div className="ad-modal__body">
          <div className="ad-detail-grid">
            {/* Personal */}
            <div className="ad-detail-section">
              <h4><i className="fas fa-user" /> Personal Information</h4>
              <div className="ad-detail-info">
                <p><strong>Name:</strong> {app.firstName} {app.lastName}</p>
                <p><strong>Email:</strong> {app.email}</p>
                <p><strong>Phone:</strong> {app.phone}</p>
                <p><strong>DOB:</strong> {app.dob}</p>
                <p><strong>Gender:</strong> {app.gender}</p>
                <p><strong>Nationality:</strong> {app.nationality}</p>
                <p><strong>Address:</strong> {app.address}</p>
              </div>
            </div>

            {/* Academic */}
            <div className="ad-detail-section">
              <h4><i className="fas fa-graduation-cap" /> Academic Information</h4>
              <div className="ad-detail-info">
                <p><strong>Program:</strong> {app.program}</p>
                <p><strong>Intake:</strong> {app.intake}</p>
                <p><strong>Last School:</strong> {app.school}</p>
                <p><strong>Year Completed:</strong> {app.yearCompleted}</p>
                <p><strong>Grades/Results:</strong> {app.grades}</p>
              </div>
            </div>

            {/* Documents */}
            <div className="ad-detail-section ad-detail-section--full">
              <h4><i className="fas fa-file-pdf" /> Supporting Documents</h4>
              <div className="ad-doc-grid">
                {app.nrcPassportUrl ? (
                  <a href={app.nrcPassportUrl} target="_blank" rel="noreferrer" className="ad-doc-card">
                    <i className="fas fa-id-card" />
                    <span>NRC / Passport</span>
                  </a>
                ) : <span className="ad-muted">No NRC/Passport uploaded</span>}
                
                {app.academicResultsUrl ? (
                  <a href={app.academicResultsUrl} target="_blank" rel="noreferrer" className="ad-doc-card">
                    <i className="fas fa-file-contract" />
                    <span>Academic Results</span>
                  </a>
                ) : <span className="ad-muted">No Results uploaded</span>}
              </div>
            </div>

            {/* Extra */}
            <div className="ad-detail-section ad-detail-section--full">
              <h4><i className="fas fa-info-circle" /> Additional Details</h4>
              <p><strong>Referee:</strong> {app.refereeName}</p>
              <p><strong>How they heard:</strong> {app.howHeard || 'N/A'}</p>
              <div className="ad-detail-box">
                <strong>Personal Statement:</strong>
                <p>{app.personalStatement || 'No statement provided.'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="ad-modal__footer">
          <div className="ad-status-indicator">
            Status: <span className={`ad-badge ad-badge--${app.status.toLowerCase()}`}>{app.status}</span>
          </div>
          <div className="ad-modal__footer-actions">
            <button className="ad-btn ad-btn--ghost" onClick={onClose}>Close</button>
            {app.status === 'Pending' && (
              <>
                <button className="ad-btn ad-btn--reject" onClick={() => { onReview(app.docId, 'Rejected'); onClose(); }}>
                  <i className="fas fa-times" /> Reject
                </button>
                <button className="ad-btn ad-btn--approve" onClick={() => { onReview(app.docId, 'Approved'); onClose(); }}>
                  <i className="fas fa-check" /> Approve
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────── */
const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [modal, setModal]         = useState(null); // { type, editData }
  const [confirm, setConfirm]     = useState(null); // { title, message, action }
  const [toasts, setToasts]       = useState([]);
  const [search, setSearch]       = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewingApp, setViewingApp]   = useState(null);

  const [students, setStudents]       = useState([]);
  const [lecturers, setLecturers]     = useState([]);
  const [courses, setCourses]         = useState([]);
  const [applications, setApplications] = useState([]);
  const [allResults, setAllResults]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [settings, setSettings]       = useState({
    institutionName: 'London American University College',
    systemMotto: 'Education for the Future',
    timezone: 'Zambia (CAT)',
    currency: 'ZMW',
    maintenanceMode: false,
    emailNotifications: true,
    twoFactorAuth: false,
    autoArchiving: true,
    adminDisplayName: 'Super Admin',
    adminEmail: 'admin@lauc.edu'
  });

  const navigate = useNavigate();
  const { signOut } = useAuth();

  /* ── REAL-TIME FETCHING ── */
  useEffect(() => {
    const unsubStudents = onSnapshot(query(collection(db, 'students'), orderBy('createdAt', 'desc')), (snapshot) => {
      setStudents(snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() })));
    });

    const unsubLecturers = onSnapshot(query(collection(db, 'lecturers'), orderBy('createdAt', 'desc')), (snapshot) => {
      setLecturers(snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() })));
    });

    const unsubCourses = onSnapshot(query(collection(db, 'courses'), orderBy('createdAt', 'desc')), (snapshot) => {
      setCourses(snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() })));
    });

    const unsubApps = onSnapshot(query(collection(db, 'applications'), orderBy('date', 'desc')), (snapshot) => {
      setApplications(snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() })));
      setLoading(false);
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'general'), (snapshot) => {
      if (snapshot.exists()) {
        setSettings(snapshot.data());
      }
    });

    const unsubResults = onSnapshot(query(collection(db, 'results'), orderBy('updatedAt', 'desc')), (snapshot) => {
      setAllResults(snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() })));
    });

    return () => {
      unsubStudents();
      unsubLecturers();
      unsubCourses();
      unsubApps();
      unsubSettings();
      unsubResults();
    };
  }, []);

  /* toast helper */
  const toast = (message, type = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  };

  /* logout */
  const logout = async () => {
    await signOut();
    navigate('/login');
  };

  /* SETTINGS */
  const saveSettings = async (newData) => {
    try {
      await setDoc(doc(db, 'settings', 'general'), newData, { merge: true });
      toast('Settings updated successfully.');
    } catch (err) {
      toast('Error saving settings.', 'error');
    }
  };

  /* CSV EXPORT */
  const exportToCSV = (data, filename) => {
    if (!data.length) return;
    const headers = Object.keys(data[0]).filter(k => k !== 'docId' && k !== 'createdAt');
    const csvRows = [
      headers.join(','),
      ...data.map(row => headers.map(h => `"${row[h] || ''}"`).join(','))
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast(`${filename} exported successfully.`);
  };

  /* ── STUDENTS ── */
  const saveStudent = async (data) => {
    try {
      if (data.docId) {
        const { docId, ...updateData } = data;
        await updateDoc(doc(db, 'students', docId), updateData);
        toast(`${data.name} updated successfully.`);
      } else {
        // Automatic Student ID Generation (Format: LAUC/Year/PROG/001)
        const year = new Date().getFullYear();
        const progMap = {
          'BSc Computer Science': 'CSC',
          'BSc Nursing': 'NUR',
          'BBA Business Administration': 'BBA'
        };
        const progCode = progMap[data.program] || 'GEN';
        
        // Use document count or timestamp for unique sequence
        const sequence = String(students.length + 1).padStart(3, '0');
        const studentId = `LAUC/${year}/${progCode}/${sequence}`;

        const defaultPassword = 'LAUC@Student2026';
        let uid = null;
        try {
          const userCredential = await createUserWithEmailAndPassword(secondaryAuth, data.email, defaultPassword);
          uid = userCredential.user.uid;
        } catch (authErr) {
          if (authErr.code === 'auth/email-already-in-use') {
            toast('Error: Email is already in use.', 'error');
          } else {
            toast('Failed to create authentication user.', 'error');
          }
          throw authErr;
        }

        // Add to global users collection for login routing
        await setDoc(doc(db, 'users', uid), {
          email: data.email,
          role: 'student',
          createdAt: serverTimestamp()
        });

        // Add to students collection
        await setDoc(doc(db, 'students', uid), { 
          ...data, 
          id: studentId, 
          password: defaultPassword,
          mustChangePassword: true,
          createdAt: serverTimestamp() 
        });
        toast(`${data.name} has been added with a default password.`);
      }
    } catch (err) {
      console.error(err);
      toast('Error saving student.', 'error');
    }
    setModal(null);
  };

  const deleteStudent = (docId) => {
    setConfirm({
      title: 'Delete Student',
      message: 'Are you sure you want to remove this student? This cannot be undone.',
      action: async () => {
        try {
          await deleteDoc(doc(db, 'students', docId));
          await deleteDoc(doc(db, 'users', docId));
          toast('Student deleted.', 'error');
        } catch (err) {
          toast('Error deleting student.', 'error');
        }
        setConfirm(null);
      }
    });
  };

  /* ── LECTURERS ── */
  const saveLecturer = async (data) => {
    try {
      if (data.docId) {
        const { docId, ...updateData } = data;
        await updateDoc(doc(db, 'lecturers', docId), updateData);
        toast(`${data.name} updated successfully.`);
      } else {
        const id = `LEC-${110 + lecturers.length}`;
        const defaultPassword = 'LAUC@Lecturer2026';
        let uid = null;

        try {
          const userCredential = await createUserWithEmailAndPassword(secondaryAuth, data.email, defaultPassword);
          uid = userCredential.user.uid;
        } catch (authErr) {
          if (authErr.code === 'auth/email-already-in-use') {
            toast('Error: Email is already in use.', 'error');
          } else {
            toast('Failed to create authentication user.', 'error');
          }
          throw authErr;
        }

        // Add to global users collection for login routing
        await setDoc(doc(db, 'users', uid), {
          email: data.email,
          role: 'staff',
          createdAt: serverTimestamp()
        });

        // Add to lecturers collection
        await setDoc(doc(db, 'lecturers', uid), { 
          ...data, 
          id, 
          courses: 0, 
          password: defaultPassword,
          mustChangePassword: true,
          createdAt: serverTimestamp() 
        });
        toast(`${data.name} has been added with a default password.`);
      }
    } catch (err) {
      toast('Error saving lecturer.', 'error');
    }
    setModal(null);
  };

  const deleteLecturer = (docId) => {
    setConfirm({
      title: 'Remove Lecturer',
      message: 'Are you sure you want to remove this lecturer record?',
      action: async () => {
        try {
          await deleteDoc(doc(db, 'lecturers', docId));
          await deleteDoc(doc(db, 'users', docId));
          toast('Lecturer removed.', 'error');
        } catch (err) {
          toast('Error removing lecturer.', 'error');
        }
        setConfirm(null);
      }
    });
  };

  /* ── COURSES ── */
  const saveCourse = async (data) => {
    try {
      if (data.docId) {
        const { docId, ...updateData } = data;
        await updateDoc(doc(db, 'courses', docId), updateData);
        toast('Course updated successfully.');
      } else {
        const id = `CS${300 + courses.length}`;
        await addDoc(collection(db, 'courses'), { 
          ...data, 
          id, 
          enrolled: 0, 
          createdAt: serverTimestamp() 
        });
        toast('Course added successfully.');
      }
    } catch (err) {
      toast('Error saving course.', 'error');
    }
    setModal(null);
  };

  const deleteCourse = (docId) => {
    setConfirm({
      title: 'Delete Course',
      message: 'This will permanently remove the course from the catalog.',
      action: async () => {
        try {
          await deleteDoc(doc(db, 'courses', docId));
          toast('Course deleted.', 'error');
        } catch (err) {
          toast('Error deleting course.', 'error');
        }
        setConfirm(null);
      }
    });
  };

  /* ── APPLICATIONS ── */
  const reviewApplication = async (docId, newStatus) => {
    try {
      await updateDoc(doc(db, 'applications', docId), { status: newStatus });
      toast(`Application ${newStatus.toLowerCase()}.`, newStatus === 'Approved' ? 'success' : 'error');
    } catch (err) {
      toast('Error updating application.', 'error');
    }
  };

  /* ── RESULTS ── */
  const handleResultAction = async (resultId, action) => {
    try {
      const statusMap = {
        'approve': 'approved',
        'reject': 'draft',
        'publish': 'published'
      };
      const newStatus = statusMap[action];
      await updateDoc(doc(db, 'results', resultId), { 
        status: newStatus,
        [action === 'approve' ? 'approvedBy' : action === 'publish' ? 'publishedBy' : 'rejectedBy']: settings.adminDisplayName,
        updatedAt: serverTimestamp()
      });
      
      // Notify student if published
      if (action === 'publish') {
        const res = allResults.find(r => r.docId === resultId);
        if (res) {
          await addDoc(collection(db, 'students', res.studentId, 'notifications'), {
            text: `Results for ${res.courseCode} have been published.`,
            time: 'Just now',
            icon: 'fa-poll',
            color: '#0d9488',
            read: false,
            createdAt: serverTimestamp()
          });
        }
      }

      toast(`Result ${newStatus} successfully.`);
    } catch (err) {
      toast('Error updating result status.', 'error');
    }
  };

  /* search filter helpers */
  const q = search.toLowerCase();
  const filteredStudents     = students.filter(x => x.name.toLowerCase().includes(q) || x.email.toLowerCase().includes(q) || x.program.toLowerCase().includes(q));
  const filteredLecturers    = lecturers.filter(x => x.name.toLowerCase().includes(q) || x.dept.toLowerCase().includes(q));
  const filteredCourses      = courses.filter(x => x.name.toLowerCase().includes(q) || x.dept.toLowerCase().includes(q));
  const filteredApplications = applications.filter(x => x.name.toLowerCase().includes(q) || x.program.toLowerCase().includes(q));

  const pendingApps = applications.filter(a => a.status === 'Pending').length;

  const NAV_ITEMS = [
    { key: 'dashboard',    icon: 'fa-gauge-high',       label: 'Dashboard' },
    { key: 'students',     icon: 'fa-users',             label: 'Students' },
    { key: 'lecturers',    icon: 'fa-chalkboard-user',   label: 'Lecturers' },
    { key: 'courses',      icon: 'fa-book-open',         label: 'Courses' },
    { key: 'results',      icon: 'fa-poll',              label: 'Results' },
    { key: 'applications', icon: 'fa-file-signature',    label: 'Applications', badge: pendingApps },
    { key: 'settings',     icon: 'fa-gear',              label: 'Settings' },
  ];

  return (
    <div className="ad-shell">
      <Toast toasts={toasts} />
      <ConfirmDialog config={confirm} onConfirm={() => confirm?.action()} onCancel={() => setConfirm(null)} />
      {modal && (
        <Modal
          type={modal.type}
          editData={modal.editData}
          lecturers={lecturers}
          onClose={() => setModal(null)}
          onSave={modal.type === 'student' ? saveStudent : modal.type === 'lecturer' ? saveLecturer : saveCourse}
        />
      )}
      {viewingApp && (
        <ApplicationDetailModal 
          app={viewingApp}
          onClose={() => setViewingApp(null)}
          onReview={reviewApplication}
        />
      )}

      {/* ── SIDEBAR ── */}
      <aside className={`ad-sidebar ${sidebarOpen ? 'ad-sidebar--open' : ''}`}>
        <div className="ad-sidebar__brand">
          <div className="ad-sidebar__logo">
            <i className="fas fa-university" />
          </div>
          <div>
            <div className="ad-sidebar__name">LAUC Admin</div>
            <div className="ad-sidebar__sub">Management Portal</div>
          </div>
        </div>

        <nav className="ad-sidebar__nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.key}
              className={`ad-nav-item ${activeTab === item.key ? 'active' : ''}`}
              onClick={() => { setActiveTab(item.key); setSearch(''); setSidebarOpen(false); }}
            >
              <i className={`fas ${item.icon}`} />
              <span>{item.label}</span>
              {item.badge > 0 && <span className="ad-nav-badge">{item.badge}</span>}
            </button>
          ))}
        </nav>

        <div className="ad-sidebar__footer">
          <button className="ad-nav-item ad-nav-item--logout" onClick={logout}>
            <i className="fas fa-arrow-right-from-bracket" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* overlay for mobile */}
      {sidebarOpen && <div className="ad-sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}

      {/* ── MAIN ── */}
      <main className="ad-main">
        {/* Top bar */}
        <header className="ad-topbar">
          <div className="ad-topbar__left">
            <button className="ad-hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <i className="fas fa-bars" />
            </button>
            <div>
              <h1 className="ad-topbar__title">{NAV_ITEMS.find(n => n.key === activeTab)?.label}</h1>
              <p className="ad-topbar__breadcrumb">Admin Portal &rsaquo; {NAV_ITEMS.find(n => n.key === activeTab)?.label}</p>
            </div>
          </div>
          <div className="ad-topbar__right">
            {activeTab !== 'dashboard' && (
              <div className="ad-search">
                <i className="fas fa-search" />
                <input
                  placeholder={`Search ${activeTab}…`}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                {search && <button className="ad-search__clear" onClick={() => setSearch('')}><i className="fas fa-times" /></button>}
              </div>
            )}
            <div className="ad-user-pill">
              <div className="ad-user-info">
                <span className="ad-user-name">{settings.adminDisplayName}</span>
                <span className="ad-user-role">Administrator</span>
              </div>
              <div className="ad-avatar" title="Administrator">
                <i className="fas fa-user-shield" />
                <span className="ad-status-dot"></span>
              </div>

              {/* Profile Dropdown */}
              <div className="ad-profile-dropdown">
                <div className="ad-dropdown-header">
                   <strong>{settings.adminDisplayName}</strong>
                   <span>{settings.adminEmail}</span>
                </div>
                <div className="ad-dropdown-divider" />
                <button className="ad-dropdown-item" onClick={() => setActiveTab('settings')}>
                  <i className="fas fa-cog" /> Settings
                </button>
                <button className="ad-dropdown-item" onClick={() => setActiveTab('applications')}>
                  <i className="fas fa-file-invoice" /> My Tasks
                </button>
                <div className="ad-dropdown-divider" />
                <button className="ad-dropdown-item ad-dropdown-item--logout" onClick={logout}>
                  <i className="fas fa-sign-out-alt" /> Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="ad-content">
          {loading && (
            <div className="ad-loader-overlay">
              <div className="ad-loader"></div>
              <p>Fetching database records...</p>
            </div>
          )}

          {/* ══════════════════════════════════
              DASHBOARD TAB
          ══════════════════════════════════ */}
          {activeTab === 'dashboard' && (
            <div className="ad-page">
              {/* Stats */}
              <div className="ad-stats-grid">
                {[
                  { icon: 'fa-users',          color: '#1e3c72', label: 'Total Students',  value: students.length,     trend: '+12%' },
                  { icon: 'fa-chalkboard-user', color: '#7c3aed', label: 'Total Lecturers', value: lecturers.length,    trend: '+2%'  },
                  { icon: 'fa-book-open',       color: '#059669', label: 'Total Courses',   value: courses.length,      trend: '+5%'  },
                  { icon: 'fa-file-signature',  color: '#d97706', label: 'Pending Apps',    value: pendingApps,         trend: '' },
                ].map((s, i) => (
                  <div key={i} className="ad-stat" style={{ '--accent': s.color }}>
                    <div className="ad-stat__icon"><i className={`fas ${s.icon}`} /></div>
                    <div>
                      <div className="ad-stat__value">{s.value}</div>
                      <div className="ad-stat__label">{s.label}</div>
                    </div>
                    {s.trend && <div className="ad-stat__trend"><i className="fas fa-arrow-trend-up" />{s.trend}</div>}
                  </div>
                ))}
              </div>

              {/* Enhanced Analytics */}
              <div className="ad-analytics-row">
                <div className="ad-card ad-card--glass">
                  <div className="ad-card__head">
                    <h3><i className="fas fa-chart-pie" /> Dept. Distribution</h3>
                  </div>
                  <div className="ad-card__body ad-card-chart-center">
                    <svg width="160" height="160" viewBox="0 0 42 42" className="ad-donut">
                      <circle className="ad-donut-hole" cx="21" cy="21" r="15.915" fill="transparent"></circle>
                      <circle className="ad-donut-ring" cx="21" cy="21" r="15.915" fill="transparent" stroke="#e2e8f0" strokeWidth="3"></circle>
                      <circle className="ad-donut-segment" cx="21" cy="21" r="15.915" fill="transparent" stroke="var(--ad-primary)" strokeWidth="3" strokeDasharray="40 60" strokeDashoffset="25"></circle>
                      <circle className="ad-donut-segment" cx="21" cy="21" r="15.915" fill="transparent" stroke="#7c3aed" strokeWidth="3" strokeDasharray="30 70" strokeDashoffset="85"></circle>
                      <circle className="ad-donut-segment" cx="21" cy="21" r="15.915" fill="transparent" stroke="#10b981" strokeWidth="3" strokeDasharray="30 70" strokeDashoffset="55"></circle>
                      <g className="ad-donut-text">
                        <text x="50%" y="50%" className="ad-donut-number">100%</text>
                        <text x="50%" y="50%" className="ad-donut-label">Allocated</text>
                      </g>
                    </svg>
                    <div className="ad-chart-legend">
                      <div className="ad-legend-item"><span style={{background: 'var(--ad-primary)'}}></span> Tech</div>
                      <div className="ad-legend-item"><span style={{background: '#7c3aed'}}></span> Nursing</div>
                      <div className="ad-legend-item"><span style={{background: '#10b981'}}></span> Business</div>
                    </div>
                  </div>
                </div>

                <div className="ad-card ad-card--glass">
                  <div className="ad-card__head">
                    <h3><i className="fas fa-bolt" /> Quick Actions</h3>
                  </div>
                  <div className="ad-card__body ad-quick-actions">
                    <button className="ad-qa-btn" onClick={() => setModal({ type: 'student' })}>
                      <i className="fas fa-user-plus" /> <span>Add Student</span>
                    </button>
                    <button className="ad-qa-btn" onClick={() => setModal({ type: 'lecturer' })}>
                      <i className="fas fa-user-tie" /> <span>Add Lecturer</span>
                    </button>
                    <button className="ad-qa-btn" onClick={() => setModal({ type: 'course' })}>
                      <i className="fas fa-book-medical" /> <span>Add Course</span>
                    </button>
                    <button className="ad-qa-btn" onClick={() => setActiveTab('applications')}>
                      <i className="fas fa-file-invoice" /> <span>Review Apps</span>
                    </button>
                    <button className="ad-qa-btn" onClick={() => exportToCSV(students, 'student_list')}>
                      <i className="fas fa-download" /> <span>Export Data</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Recent tables */}
              <div className="ad-two-col">
                <div className="ad-card">
                  <div className="ad-card__head">
                    <h3><i className="fas fa-file-signature" /> Recent Applications</h3>
                    <button className="ad-btn ad-btn--ghost ad-btn--xs" onClick={() => setActiveTab('applications')}>
                      View All <i className="fas fa-arrow-right" />
                    </button>
                  </div>
                  <div className="ad-card__body ad-card__body--p0">
                    <table className="ad-table">
                      <thead><tr><th>Applicant</th><th>Program</th><th>Status</th></tr></thead>
                      <tbody>
                        {applications.slice(0, 4).map(a => (
                          <tr key={a.docId}>
                            <td><b>{a.name}</b></td>
                            <td className="ad-muted">{a.program}</td>
                            <td><span className={`ad-badge ad-badge--${a.status.toLowerCase()}`}>{a.status}</span></td>
                          </tr>
                        ))}
                        {applications.length === 0 && <tr><td colSpan="3" style={{padding: '2rem', textAlign: 'center', color: '#888'}}>No pending applications</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="ad-card">
                  <div className="ad-card__head">
                    <h3><i className="fas fa-terminal" /> System Activity</h3>
                  </div>
                  <div className="ad-card__body ad-activity-list">
                    {[
                      { msg: 'System backup completed', time: '12m ago', icon: 'fa-database' },
                      { msg: 'New course CSC202 added', time: '1h ago', icon: 'fa-book' },
                      { msg: 'Admissions updated', time: '3h ago', icon: 'fa-sync' },
                      { msg: 'Server status: Healthy', time: 'Now', icon: 'fa-heartbeat' },
                    ].map((act, i) => (
                      <div key={i} className="ad-activity-item">
                        <div className="ad-activity-icon"><i className={`fas ${act.icon}`} /></div>
                        <div className="ad-activity-info">
                          <div className="ad-activity-msg">{act.msg}</div>
                          <div className="ad-activity-time">{act.time}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════
              STUDENTS TAB
          ══════════════════════════════════ */}
          {activeTab === 'students' && (
            <div className="ad-page">
              <div className="ad-card">
                <div className="ad-card__head">
                  <h3><i className="fas fa-users" /> Student Records <span className="ad-count">{filteredStudents.length}</span></h3>
                  <div className="ad-card__actions">
                    <button className="ad-btn ad-btn--ghost ad-btn--xs" onClick={() => exportToCSV(students, 'students_list')}>
                      <i className="fas fa-download" /> Export
                    </button>
                    <button className="ad-btn ad-btn--primary" onClick={() => setModal({ type: 'student' })}>
                      <i className="fas fa-plus" /> Add Student
                    </button>
                  </div>
                </div>
                <div className="ad-card__body ad-card__body--p0">
                  {filteredStudents.length === 0
                    ? <div className="ad-empty"><i className="fas fa-search" /><p>No students match your search.</p></div>
                    : (
                    <table className="ad-table ad-table--hover">
                      <thead>
                        <tr><th>ID</th><th>Full Name</th><th>Email</th><th>Phone</th><th>Level</th><th>Program</th><th>Status</th><th>Actions</th></tr>
                      </thead>
                      <tbody>
                        {filteredStudents.map(s => (
                          <tr key={s.docId}>
                            <td><code className="ad-code">{s.id}</code></td>
                            <td><b>{s.name}</b></td>
                            <td className="ad-muted">{s.email}</td>
                            <td>{s.phone}</td>
                            <td><span className="ad-pill">{s.level}</span></td>
                            <td>{s.program || s.dept}</td>
                            <td><span className={`ad-badge ad-badge--${s.status === 'Active' ? 'approved' : 'rejected'}`}>{s.status}</span></td>
                            <td>
                              <div className="ad-actions">
                                <button className="ad-icon-btn ad-icon-btn--edit" title="Edit" onClick={() => setModal({ type: 'student', editData: s })}>
                                  <i className="fas fa-pen" />
                                </button>
                                <button className="ad-icon-btn ad-icon-btn--delete" title="Delete" onClick={() => deleteStudent(s.docId)}>
                                  <i className="fas fa-trash" />
                                </button>
                              </div>
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

          {/* ══════════════════════════════════
              LECTURERS TAB
          ══════════════════════════════════ */}
          {activeTab === 'lecturers' && (
            <div className="ad-page">
              <div className="ad-card">
                <div className="ad-card__head">
                  <h3><i className="fas fa-chalkboard-user" /> Lecturer Records <span className="ad-count">{filteredLecturers.length}</span></h3>
                  <div className="ad-card__actions">
                    <button className="ad-btn ad-btn--ghost ad-btn--xs" onClick={() => exportToCSV(lecturers, 'lecturers_list')}>
                      <i className="fas fa-download" /> Export
                    </button>
                    <button className="ad-btn ad-btn--primary" onClick={() => setModal({ type: 'lecturer' })}>
                      <i className="fas fa-plus" /> Add Lecturer
                    </button>
                  </div>
                </div>
                <div className="ad-card__body ad-card__body--p0">
                  {filteredLecturers.length === 0
                    ? <div className="ad-empty"><i className="fas fa-search" /><p>No lecturers match your search.</p></div>
                    : (
                    <table className="ad-table ad-table--hover">
                      <thead>
                        <tr><th>ID</th><th>Name</th><th>Email</th><th>Department</th><th>Courses</th><th>Actions</th></tr>
                      </thead>
                      <tbody>
                        {filteredLecturers.map(l => (
                          <tr key={l.docId}>
                            <td><code className="ad-code">{l.id}</code></td>
                            <td><b>{l.name}</b></td>
                            <td className="ad-muted">{l.email}</td>
                            <td>{l.dept}</td>
                            <td><span className="ad-pill">{l.courses} courses</span></td>
                            <td>
                              <div className="ad-actions">
                                <button className="ad-icon-btn ad-icon-btn--edit" title="Edit" onClick={() => setModal({ type: 'lecturer', editData: l })}>
                                  <i className="fas fa-pen" />
                                </button>
                                <button className="ad-icon-btn ad-icon-btn--delete" title="Delete" onClick={() => deleteLecturer(l.docId)}>
                                  <i className="fas fa-trash" />
                                </button>
                              </div>
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

          {/* ══════════════════════════════════
              COURSES TAB
          ══════════════════════════════════ */}
          {activeTab === 'courses' && (
            <div className="ad-page">
              <div className="ad-card">
                <div className="ad-card__head">
                  <h3><i className="fas fa-book-open" /> Course Catalog <span className="ad-count">{filteredCourses.length}</span></h3>
                  <button className="ad-btn ad-btn--primary" onClick={() => setModal({ type: 'course' })}>
                    <i className="fas fa-plus" /> Add Course
                  </button>
                </div>
                <div className="ad-card__body ad-card__body--p0">
                  {filteredCourses.length === 0
                    ? <div className="ad-empty"><i className="fas fa-search" /><p>No courses match your search.</p></div>
                    : (
                    <table className="ad-table ad-table--hover">
                      <thead>
                        <tr><th>Code</th><th>Course Name</th><th>Department</th><th>Credits</th><th>Lecturer</th><th>Enrolled</th><th>Actions</th></tr>
                      </thead>
                      <tbody>
                        {filteredCourses.map(c => (
                          <tr key={c.docId}>
                            <td><code className="ad-code">{c.id}</code></td>
                            <td><b>{c.name}</b></td>
                            <td>{c.dept}</td>
                            <td><span className="ad-pill">{c.credits} cr</span></td>
                            <td className="ad-muted">{c.lecturer}</td>
                            <td><span className="ad-pill ad-pill--blue">{c.enrolled}</span></td>
                            <td>
                              <div className="ad-actions">
                                <button className="ad-icon-btn ad-icon-btn--edit" title="Edit" onClick={() => setModal({ type: 'course', editData: c })}>
                                  <i className="fas fa-pen" />
                                </button>
                                <button className="ad-icon-btn ad-icon-btn--delete" title="Delete" onClick={() => deleteCourse(c.docId)}>
                                  <i className="fas fa-trash" />
                                </button>
                              </div>
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

          {/* ══════════════════════════════════
              APPLICATIONS TAB
          ══════════════════════════════════ */}
          {activeTab === 'applications' && (
            <div className="ad-page">
              {/* Filter pills */}
              <div className="ad-filter-bar">
                {['All','Pending','Approved','Rejected'].map(f => (
                  <button
                    key={f}
                    className={`ad-filter-pill ${search === (f === 'All' ? '' : f.toLowerCase()) ? 'active' : ''}`}
                    onClick={() => setSearch(f === 'All' ? '' : f.toLowerCase())}
                  >
                    {f}
                    {f !== 'All' && (
                      <span className="ad-filter-pill__count">
                        {applications.filter(a => a.status === f).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="ad-card">
                <div className="ad-card__head">
                  <h3><i className="fas fa-file-signature" /> Admissions Queue <span className="ad-count">{filteredApplications.length}</span></h3>
                </div>
                <div className="ad-card__body ad-card__body--p0">
                  {filteredApplications.length === 0
                    ? <div className="ad-empty"><i className="fas fa-inbox" /><p>No applications found.</p></div>
                    : (
                    <table className="ad-table ad-table--hover">
                      <thead>
                        <tr><th>App ID</th><th>Applicant</th><th>Program</th><th>Date</th><th>Status</th><th>Actions</th></tr>
                      </thead>
                      <tbody>
                        {filteredApplications.map(a => (
                          <tr key={a.docId}>
                            <td><code className="ad-code">{a.id}</code></td>
                            <td><b>{a.name}</b></td>
                            <td className="ad-muted">{a.program}</td>
                            <td className="ad-muted">{a.date}</td>
                            <td><span className={`ad-badge ad-badge--${a.status.toLowerCase()}`}>{a.status}</span></td>
                            <td>
                              <div className="ad-actions">
                                <button className="ad-icon-btn ad-icon-btn--view" title="View Details" onClick={() => setViewingApp(a)}>
                                  <i className="fas fa-eye" />
                                </button>
                                {a.status === 'Pending' ? (
                                  <>
                                    <button className="ad-icon-btn ad-icon-btn--approve" title="Approve" onClick={() => reviewApplication(a.docId, 'Approved')}>
                                      <i className="fas fa-check" />
                                    </button>
                                    <button className="ad-icon-btn ad-icon-btn--reject" title="Reject" onClick={() => reviewApplication(a.docId, 'Rejected')}>
                                      <i className="fas fa-times" />
                                    </button>
                                  </>
                                ) : (
                                  <button className="ad-icon-btn ad-icon-btn--ghost" title="Reset to Pending" onClick={() => reviewApplication(a.docId, 'Pending')}>
                                    <i className="fas fa-rotate-left" />
                                  </button>
                                )}
                              </div>
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

          {/* ══════════════════════════════════
              SETTINGS TAB
          ══════════════════════════════════ */}
          {activeTab === 'settings' && (
            <div className="ad-page">
              <div className="ad-two-col">
                <div className="ad-card ad-card--glass">
                  <div className="ad-card__head">
                    <h3><i className="fas fa-user-gear" /> Account Settings</h3>
                  </div>
                  <div className="ad-card__body">
                    <form className="ad-settings-form" onSubmit={e => { 
                      e.preventDefault(); 
                      const formData = new FormData(e.target);
                      saveSettings({
                        adminDisplayName: formData.get('displayName'),
                        adminEmail: formData.get('email')
                      });
                    }}>
                      <div className="ad-field">
                        <label>Admin Display Name</label>
                        <input name="displayName" defaultValue={settings.adminDisplayName} />
                      </div>
                      <div className="ad-field">
                        <label>Email Address</label>
                        <input name="email" defaultValue={settings.adminEmail} />
                      </div>
                      <div className="ad-field">
                        <label>New Password</label>
                        <input type="password" placeholder="Leave blank to keep current" />
                      </div>
                      <button className="ad-btn ad-btn--primary">Save Profile</button>
                    </form>
                  </div>
                </div>

                <div className="ad-card ad-card--glass">
                  <div className="ad-card__head">
                    <h3><i className="fas fa-sliders" /> System Preferences</h3>
                  </div>
                  <div className="ad-card__body ad-card__body--p0">
                    <div className="ad-settings-list">
                      {[
                        { key: 'maintenanceMode', title: 'Maintenance Mode', desc: 'Disable public access to portal', icon: 'fa-lock' },
                        { key: 'emailNotifications', title: 'Email Notifications', desc: 'Auto-alerts for staff and students', icon: 'fa-bell' },
                        { key: 'twoFactorAuth', title: 'Two-Factor Auth', desc: 'Additional login security row', icon: 'fa-shield-halved' },
                        { key: 'autoArchiving', title: 'Auto-Archiving', desc: 'Monthly data backups to cloud', icon: 'fa-cloud-arrow-up' }
                      ].map((s, i) => (
                        <div key={i} className="ad-setting-item">
                          <div className="ad-setting-icon"><i className={`fas ${s.icon}`} /></div>
                          <div className="ad-setting-info">
                            <div className="ad-setting-title">{s.title}</div>
                            <div className="ad-setting-desc">{s.desc}</div>
                          </div>
                          <input 
                            type="checkbox" 
                            className="ad-toggle" 
                            checked={settings[s.key]} 
                            onChange={e => saveSettings({ [s.key]: e.target.checked })}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="ad-card">
                <div className="ad-card__head">
                  <h3><i className="fas fa-building-columns" /> Institution Branding & Regional</h3>
                </div>
                <div className="ad-card__body">
                   <form id="brandingForm" className="ad-branding-grid" onSubmit={e => {
                     e.preventDefault();
                     const formData = new FormData(e.target);
                     saveSettings({
                        institutionName: formData.get('instName'),
                        systemMotto: formData.get('motto'),
                        timezone: formData.get('timezone'),
                        currency: formData.get('currency')
                     });
                   }}>
                      <div className="ad-field">
                        <label>Institution Name</label>
                        <input name="instName" defaultValue={settings.institutionName} />
                      </div>
                      <div className="ad-field">
                        <label>System Motto</label>
                        <input name="motto" defaultValue={settings.systemMotto} />
                      </div>
                      <div className="ad-field">
                        <label>Primary Timezone</label>
                        <select name="timezone" defaultValue={settings.timezone}>
                          <option>Zambia (CAT)</option>
                          <option>United Kingdom (GMT)</option>
                          <option>USA (EST)</option>
                        </select>
                      </div>
                      <div className="ad-field">
                        <label>Currency Symbol</label>
                        <input name="currency" defaultValue={settings.currency} />
                      </div>
                   </form>
                </div>
                <div className="ad-card-footer-actions">
                   <button className="ad-btn ad-btn--ghost" onClick={() => saveSettings({
                     institutionName: 'London American University College',
                     systemMotto: 'Education for the Future',
                     timezone: 'Zambia (CAT)',
                     currency: 'ZMW'
                   })}>Reset to Defaults</button>
                   <button type="submit" form="brandingForm" className="ad-btn ad-btn--primary">Save Branding Changes</button>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════
              RESULTS TAB
          ══════════════════════════════════ */}
          {activeTab === 'results' && (
            <div className="ad-page">
              <div className="ad-section-header">
                <div>
                  <h2 className="ad-section-title">Result Approval & Publishing</h2>
                  <p className="ad-section-sub">Manage student results submitted by lecturers.</p>
                </div>
              </div>

              <div className="ad-card" style={{ padding: 0 }}>
                <div className="ad-table-wrapper">
                  {allResults.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No results found in the system.</div>
                  ) : (
                    <table className="ad-table">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Course</th>
                          <th>Score</th>
                          <th>Grade</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allResults.map(res => (
                          <tr key={res.docId}>
                            <td>
                              <strong>{res.studentName}</strong>
                              <div className="ad-muted" style={{ fontSize: 11 }}>{res.studentRegNo}</div>
                            </td>
                            <td>
                              <strong>{res.courseCode}</strong>
                              <div className="ad-muted" style={{ fontSize: 11 }}>{res.courseName}</div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{res.total} / 100</div>
                              <div className="ad-muted" style={{ fontSize: 10 }}>CA: {res.caScore} | EX: {res.examScore}</div>
                            </td>
                            <td>
                              <span className={`ad-badge ${res.grade === 'F' ? 'ad-badge--rejected' : 'ad-badge--approved'}`}>
                                {res.grade}
                              </span>
                            </td>
                            <td>
                              <span className={`ad-badge ad-badge--${res.status}`}>
                                {res.status.toUpperCase()}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: 5 }}>
                                {res.status === 'submitted' && (
                                  <>
                                    <button className="ad-icon-btn ad-icon-btn--approve" title="Approve" onClick={() => handleResultAction(res.docId, 'approve')} style={{ color: '#059669', background: '#ecfdf5', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}>
                                      <i className="fas fa-check" />
                                    </button>
                                    <button className="ad-icon-btn ad-icon-btn--reject" title="Reject" onClick={() => handleResultAction(res.docId, 'reject')} style={{ color: '#dc2626', background: '#fef2f2', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}>
                                      <i className="fas fa-times" />
                                    </button>
                                  </>
                                )}
                                {res.status === 'approved' && (
                                  <button className="ad-btn ad-btn--primary" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => handleResultAction(res.docId, 'publish')}>
                                    <i className="fas fa-upload" /> Publish
                                  </button>
                                )}
                                {res.status === 'published' && (
                                  <span className="ad-muted" style={{ fontSize: 11 }}><i className="fas fa-check-double" /> Published</span>
                                )}
                              </div>
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

        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
