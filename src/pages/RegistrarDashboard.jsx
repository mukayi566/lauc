import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import {
    collection, query, where, onSnapshot,
    doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
    serverTimestamp, orderBy, setDoc
} from 'firebase/firestore';
import '../dashboards.css';

/* ─────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────── */
const Badge = ({ status }) => {
    const map = {
        'Active': 'badge-green',
        'Inactive': 'badge-red',
        'Pending': 'badge-teal',
        'Enrolled': 'badge-green',
        'Eligible': 'badge-teal',
        'Ineligible': 'badge-red',
    };
    return <span className={`sd-badge ${map[status] || 'badge-teal'}`}>{status}</span>;
};

const Spinner = () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px', color: '#1e40af', fontSize: 28 }}>
        <i className="fas fa-circle-notch fa-spin"></i>
    </div>
);

const RegistrarDashboard = () => {
    /* ── UI state ── */
    const [activeTab, setActiveTab] = useState('dashboard');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [successMsg, setSuccessMsg] = useState('');
    const [dbError, setDbError] = useState('');

    /* ── Data state ── */
    const [students, setStudents] = useState([]);
    const [courses, setCourses] = useState([]);
    const [registrations, setRegistrations] = useState([]); // Recent registrations

    /* ── Form state (Registration) ── */
    const [regForm, setRegForm] = useState({
        name: '',
        email: '',
        studentId: '',
        department: '',
        program: '',
        phone: '',
        address: '',
        gender: 'Male',
        dob: '',
        nrcPassportUrl: '',
        registrarPhotoUrl: '',
    });
    const [registering, setRegistering] = useState(false);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const videoRef = React.useRef(null);
    const canvasRef = React.useRef(null);

    /* ── Form state (Enrollment) ── */
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [selectedCourses, setSelectedCourses] = useState([]);
    const [enrolling, setEnrolling] = useState(false);

    const navigate = useNavigate();
    const { signOut, currentUser } = useAuth();
    const uid = currentUser?.uid;

    /* ═══════════════════════════════════════════════════════════════
       EFFECTS
    ═══════════════════════════════════════════════════════════════ */

    useEffect(() => {
        // Listen for all students
        const unsubStudents = onSnapshot(collection(db, 'students'), (snap) => {
            setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        }, (err) => {
            console.error('Students listener error:', err);
            setDbError('Failed to load students.');
        });

        // Listen for all courses
        const unsubCourses = onSnapshot(collection(db, 'courses'), (snap) => {
            setCourses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => {
            unsubStudents();
            unsubCourses();
        };
    }, []);

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

    const handleError = (msg) => {
        setDbError(msg);
        setTimeout(() => setDbError(''), 5000);
    };

    const handleRegisterStudent = async (e) => {
        e.preventDefault();
        if (registering) return;
        setRegistering(true);

        try {
            // Check if studentId already exists
            const q = query(collection(db, 'students'), where('studentId', '==', regForm.studentId));
            const existing = await getDocs(q);
            if (!existing.empty) {
                throw new Error('Student ID already exists.');
            }

            const studentData = {
                ...regForm,
                status: 'Active',
                createdAt: serverTimestamp(),
                role: 'student',
            };

            // Add to students collection
            await addDoc(collection(db, 'students'), studentData);

            showSuccess('Student registered successfully!');
            setRegForm({
                name: '', email: '', studentId: '', department: '',
                program: '', phone: '', address: '', gender: 'Male', dob: '',
                nrcPassportUrl: '', registrarPhotoUrl: ''
            });
            setActiveTab('students');
        } catch (err) {
            handleError(err.message || 'Registration failed.');
        } finally {
            setRegistering(false);
        }
    };

    const handleEnrollStudent = async (e) => {
        e.preventDefault();
        if (!selectedStudent || selectedCourses.length === 0) return;
        setEnrolling(true);

        try {
            const studentId = selectedStudent.id;
            const batch = selectedCourses.map(courseCode => {
                const course = courses.find(c => (c.code || c.id) === courseCode);
                return addDoc(collection(db, 'students', studentId, 'courses'), {
                    ...course,
                    enrolledAt: serverTimestamp(),
                    status: 'Ongoing'
                });
            });

            await Promise.all(batch);

            // Also update the student's top-level enrolledIn array for easy filtering
            const currentEnrolled = selectedStudent.enrolledIn || [];
            const updatedEnrolled = [...new Set([...currentEnrolled, ...selectedCourses])];
            await updateDoc(doc(db, 'students', studentId), {
                enrolledIn: updatedEnrolled
            });

            showSuccess(`Student enrolled in ${selectedCourses.length} courses!`);
            setSelectedStudent(null);
            setSelectedCourses([]);
            setActiveTab('dashboard');
        } catch (err) {
            handleError('Enrollment failed.');
        } finally {
            setEnrolling(false);
        }
    };

    const toggleCourseSelection = (code) => {
        setSelectedCourses(prev =>
            prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
        );
    };

    /* ── Camera Helpers ── */
    const startCamera = async () => {
        setIsCameraOpen(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Camera error:", err);
            handleError("Could not access camera.");
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        }
        setIsCameraOpen(false);
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/png');
            setRegForm(prev => ({ ...prev, registrarPhotoUrl: dataUrl }));
            stopCamera();
        }
    };

    const openUploadWidget = () => {
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
                    setRegForm(prev => ({ ...prev, nrcPassportUrl: result.info.secure_url }));
                    showSuccess('Document uploaded successfully!');
                }
            }
        );
    };

    /* ── Derived display values ── */
    const registrar = {
        name: currentUser?.displayName || 'Registrar Officer',
        role: 'Office of the Registrar',
        email: currentUser?.email || 'registrar@fairview.edu',
    };

    const filteredStudents = students.filter(s => {
        const q = searchQuery.toLowerCase();
        return (
            (s.name || '').toLowerCase().includes(q) ||
            (s.studentId || '').toLowerCase().includes(q) ||
            (s.email || '').toLowerCase().includes(q)
        );
    });

    const getStudentId = (s) => s.studentId || s.student_id || '—';

    const navItems = [
        { id: 'dashboard', icon: 'fa-tachometer-alt', label: 'Overview' },
        { id: 'registration', icon: 'fa-user-plus', label: 'Registration' },
        { id: 'enrollment', icon: 'fa-calendar-check', label: 'Enrollment' },
        { id: 'dockets', icon: 'fa-id-card-clip', label: 'Exam Dockets' },
        { id: 'students', icon: 'fa-users', label: 'Student Directory' },
        { id: 'settings', icon: 'fa-cog', label: 'Settings' },
    ];

    /* ═══════════════════════════════════════════════════════════════
       RENDER
    ═══════════════════════════════════════════════════════════════ */
    return (
        <div className="sd-shell registrar-theme" style={{ '--primary-gradient': 'linear-gradient(165deg, #1e3a8a 0%, #1e40af 60%, #1d4ed8 100%)', '--primary-color': '#1e40af', '--accent-color': '#f59e0b' }}>
            {/* OVERLAY */}
            {sidebarOpen && <div className="sd-overlay" onClick={() => setSidebarOpen(false)} />}

            {/* SIDEBAR */}
            <div className={`sd-sidebar ${sidebarOpen ? 'sd-sidebar--open' : ''}`}>
                <div className="sd-sidebar-logo">
                    <div className="sd-logo-icon"><i className="fas fa-university"></i></div>
                    <div>
                        <div className="sd-logo-title">Fairview Portal</div>
                        <div className="sd-logo-sub">Registrar Office</div>
                    </div>
                </div>

                <div className="sd-profile-pill">
                    <div className="sd-avatar">{registrar.name.charAt(0)}</div>
                    <div className="sd-profile-text">
                        <div className="sd-profile-name">{registrar.name}</div>
                        <div className="sd-profile-id">{registrar.role}</div>
                    </div>
                </div>

                <nav className="sd-nav">
                    <div className="sd-nav-group">Academic Admin</div>
                    {navItems.map(item => (
                        <a key={item.id} href="#"
                            className={`sd-nav-link ${activeTab === item.id ? 'active' : ''}`}
                            onClick={(e) => { e.preventDefault(); setActiveTab(item.id); setSidebarOpen(false); }}>
                            <i className={`fas ${item.icon}`}></i>
                            <span>{item.label}</span>
                            {activeTab === item.id && <div className="sd-nav-indicator"></div>}
                        </a>
                    ))}
                </nav>

                <div className="sd-sidebar-footer">
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
                        <div className="sd-topbar-avatar">{registrar.name.charAt(0)}</div>
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
                        <div className="sd-tab-fade">

                            {/* ══════════ DASHBOARD TAB ══════════ */}
                            {activeTab === 'dashboard' && (
                                <>
                                    <div className="sd-welcome-banner">
                                        <div>
                                            <h1 className="sd-welcome-h1">Welcome, Officer {registrar.name.split(' ')[0]}</h1>
                                            <p className="sd-welcome-p">Institution Overview & Quick Actions</p>
                                        </div>
                                        <div className="sd-welcome-actions">
                                            <button className="sd-btn sd-btn-white" onClick={() => setActiveTab('registration')}>
                                                <i className="fas fa-user-plus"></i> New Student
                                            </button>
                                        </div>
                                    </div>

                                    <div className="sd-stats-row">
                                        <div className="sd-stat-card">
                                            <div className="sd-stat-icon"><i className="fas fa-users"></i></div>
                                            <div className="sd-stat-val">{students.length}</div>
                                            <div className="sd-stat-lbl">Total Students</div>
                                        </div>
                                        <div className="sd-stat-card">
                                            <div className="sd-stat-icon"><i className="fas fa-book-open"></i></div>
                                            <div className="sd-stat-val">{courses.length}</div>
                                            <div className="sd-stat-lbl">Active Courses</div>
                                        </div>
                                        <div className="sd-stat-card">
                                            <div className="sd-stat-icon" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}><i className="fas fa-clock"></i></div>
                                            <div className="sd-stat-val">12</div>
                                            <div className="sd-stat-lbl">Pending Dockets</div>
                                        </div>
                                        <div className="sd-stat-card">
                                            <div className="sd-stat-icon" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}><i className="fas fa-file-invoice-dollar"></i></div>
                                            <div className="sd-stat-val">94%</div>
                                            <div className="sd-stat-lbl">Completion Rate</div>
                                        </div>
                                    </div>

                                    <div className="sd-two-col">
                                        <div className="sd-card">
                                            <div className="sd-card-header">Recent Students <button className="sd-link-btn" onClick={() => setActiveTab('students')}>View All</button></div>
                                            <div className="sd-card-body" style={{ padding: 0 }}>
                                                {students.slice(0, 5).map(s => (
                                                    <div key={s.id} className="sd-notif-row">
                                                        <div className="sd-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>{s.name?.charAt(0)}</div>
                                                        <div className="sd-notif-body">
                                                            <div className="sd-notif-text" style={{ fontWeight: 600 }}>{s.name}</div>
                                                            <div className="sd-notif-time">{s.program} • {getStudentId(s)}</div>
                                                        </div>
                                                        <Badge status="Active" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="sd-card">
                                            <div className="sd-card-header">Active Courses <button className="sd-link-btn">Management</button></div>
                                            <div className="sd-card-body" style={{ padding: 0 }}>
                                                {courses.slice(0, 5).map(c => (
                                                    <div key={c.id} className="sd-notif-row">
                                                        <div className="sd-schedule-dot" style={{ background: '#1e40af', width: 32, height: 32 }}><i className="fas fa-book" style={{ fontSize: 12 }}></i></div>
                                                        <div className="sd-notif-body">
                                                            <div className="sd-notif-text" style={{ fontWeight: 600 }}>{c.code}</div>
                                                            <div className="sd-notif-time">{c.name}</div>
                                                        </div>
                                                        <div className="sd-code" style={{ fontSize: 10 }}>{c.semester}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* ══════════ REGISTRATION TAB ══════════ */}
                            {activeTab === 'registration' && (
                                <div className="sd-card" style={{ maxWidth: 800, margin: '0 auto' }}>
                                    <div className="sd-card-header">New Student Registration</div>
                                    <div className="sd-card-body">
                                        <form onSubmit={handleRegisterStudent} className="sd-profile-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                            <div className="sd-kv">
                                                <label className="sd-kv-key">Full Name</label>
                                                <input className="sd-input" type="text" value={regForm.name} onChange={e => setRegForm({ ...regForm, name: e.target.value })} required placeholder="e.g. John Doe" style={{ border: 'none', background: 'transparent', outline: 'none', fontWeight: 600, padding: '4px 0' }} />
                                            </div>
                                            <div className="sd-kv">
                                                <label className="sd-kv-key">Email Address</label>
                                                <input className="sd-input" type="email" value={regForm.email} onChange={e => setRegForm({ ...regForm, email: e.target.value })} required placeholder="j.doe@example.com" style={{ border: 'none', background: 'transparent', outline: 'none', fontWeight: 600, padding: '4px 0' }} />
                                            </div>
                                            <div className="sd-kv">
                                                <label className="sd-kv-key">Student ID</label>
                                                <input className="sd-input" type="text" value={regForm.studentId} onChange={e => setRegForm({ ...regForm, studentId: e.target.value })} required placeholder="FAV-2026-001" style={{ border: 'none', background: 'transparent', outline: 'none', fontWeight: 600, padding: '4px 0' }} />
                                            </div>
                                            <div className="sd-kv">
                                                <label className="sd-kv-key">Phone Number</label>
                                                <input className="sd-input" type="text" value={regForm.phone} onChange={e => setRegForm({ ...regForm, phone: e.target.value })} placeholder="+1 234 567 890" style={{ border: 'none', background: 'transparent', outline: 'none', fontWeight: 600, padding: '4px 0' }} />
                                            </div>
                                            <div className="sd-kv">
                                                <label className="sd-kv-key">Department / School</label>
                                                <select className="sd-input" value={regForm.department} onChange={e => setRegForm({ ...regForm, department: e.target.value })} required style={{ border: 'none', background: 'transparent', outline: 'none', fontWeight: 600, padding: '4px 0', width: '100%' }}>
                                                    <option value="">Select Department</option>
                                                    <option value="Computing">School of Computing</option>
                                                    <option value="Business">School of Business</option>
                                                    <option value="Education">School of Education</option>
                                                    <option value="Engineering">School of Engineering</option>
                                                </select>
                                            </div>
                                            <div className="sd-kv">
                                                <label className="sd-kv-key">Academic Program</label>
                                                <input className="sd-input" type="text" value={regForm.program} onChange={e => setRegForm({ ...regForm, program: e.target.value })} required placeholder="e.g. BSc Computer Science" style={{ border: 'none', background: 'transparent', outline: 'none', fontWeight: 600, padding: '4px 0' }} />
                                            </div>
                                            <div className="sd-kv">
                                                <label className="sd-kv-key">Gender</label>
                                                <select className="sd-input" value={regForm.gender} onChange={e => setRegForm({ ...regForm, gender: e.target.value })} style={{ border: 'none', background: 'transparent', outline: 'none', fontWeight: 600, padding: '4px 0', width: '100%' }}>
                                                    <option value="Male">Male</option>
                                                    <option value="Female">Female</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                            </div>
                                            <div className="sd-kv">
                                                <label className="sd-kv-key">Date of Birth</label>
                                                <input className="sd-input" type="date" value={regForm.dob} onChange={e => setRegForm({ ...regForm, dob: e.target.value })} style={{ border: 'none', background: 'transparent', outline: 'none', fontWeight: 600, padding: '4px 0' }} />
                                            </div>
                                            <div className="sd-kv" style={{ gridColumn: 'span 2' }}>
                                                <label className="sd-kv-key">Residential Address</label>
                                                <input className="sd-input" type="text" value={regForm.address} onChange={e => setRegForm({ ...regForm, address: e.target.value })} placeholder="e.g. 123 University Way" style={{ border: 'none', background: 'transparent', outline: 'none', fontWeight: 600, padding: '4px 0' }} />
                                            </div>

                                            {/* ── Photo & Document ── */}
                                            <div className="sd-kv" style={{ gridColumn: 'span 1' }}>
                                                <label className="sd-kv-key">NRC / Passport</label>
                                                <div style={{ marginTop: 8, display: 'flex', gap: 10, alignItems: 'center' }}>
                                                    <button type="button" className="sd-btn sd-btn-ghost sd-btn-xs" onClick={openUploadWidget}>
                                                        <i className="fas fa-upload"></i> {regForm.nrcPassportUrl ? 'Change Doc' : 'Upload Doc'}
                                                    </button>
                                                    {regForm.nrcPassportUrl && <i className="fas fa-check-circle" style={{ color: '#10b981' }}></i>}
                                                </div>
                                            </div>

                                            <div className="sd-kv" style={{ gridColumn: 'span 1' }}>
                                                <label className="sd-kv-key">Live Photo capture</label>
                                                <div style={{ marginTop: 8, display: 'flex', gap: 10, alignItems: 'center' }}>
                                                    <button type="button" className="sd-btn sd-btn-secondary sd-btn-xs" onClick={startCamera}>
                                                        <i className="fas fa-camera"></i> {regForm.registrarPhotoUrl ? 'Retake Photo' : 'Capture Photo'}
                                                    </button>
                                                    {regForm.registrarPhotoUrl && (
                                                        <div style={{ position: 'relative' }}>
                                                            <img src={regForm.registrarPhotoUrl} alt="captured" style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover', border: '2px solid #e2e8f0' }} />
                                                            <i className="fas fa-check-circle" style={{ position: 'absolute', bottom: -2, right: -2, color: '#10b981', fontSize: 10, background: 'white', borderRadius: '50%' }}></i>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div style={{ gridColumn: 'span 2', marginTop: 20 }}>
                                                <button type="submit" className="sd-btn sd-btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={registering}>
                                                    {registering ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-user-plus"></i>}
                                                    {registering ? 'Registering...' : 'Complete Registration'}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            )}

                            {/* Camera Modal */}
                            {isCameraOpen && (
                                <div className="sd-modal-overlay" style={{ zIndex: 3000 }}>
                                    <div className="sd-modal" style={{ maxWidth: 500 }}>
                                        <div className="sd-modal-head">
                                            <h3><i className="fas fa-camera"></i> Take Student Photo</h3>
                                            <button className="sd-close-btn" onClick={stopCamera}>&times;</button>
                                        </div>
                                        <div className="sd-modal-body" style={{ textAlign: 'center' }}>
                                            <video ref={videoRef} autoPlay playsInline style={{ width: '100%', borderRadius: 12, background: '#000', maxHeight: 350 }} />
                                            <canvas ref={canvasRef} style={{ display: 'none' }} />
                                            <div className="sd-modal-actions" style={{ justifyContent: 'center', marginTop: 20 }}>
                                                <button className="sd-btn sd-btn-ghost" onClick={stopCamera}>Cancel</button>
                                                <button className="sd-btn sd-btn-primary" onClick={capturePhoto}>
                                                    <i className="fas fa-circle"></i> Capture
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ══════════ ENROLLMENT TAB ══════════ */}
                            {activeTab === 'enrollment' && (
                                <div className="sd-card">
                                    <div className="sd-card-header">Course Enrollment</div>
                                    <div className="sd-card-body">
                                        {!selectedStudent ? (
                                            <div>
                                                <p style={{ marginBottom: 15, color: '#64748b' }}>Search and select a student to begin enrollment.</p>
                                                <input
                                                    type="text"
                                                    placeholder="Search student by name or ID..."
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    style={{ height: 45, width: '100%', padding: '0 15px', borderRadius: 10, border: '2px solid #e2e8f0', outline: 'none', fontSize: 14, marginBottom: 20 }}
                                                />
                                                <div className="sd-table-wrapper">
                                                    <table className="sd-table">
                                                        <thead>
                                                            <tr>
                                                                <th>Name</th>
                                                                <th>ID</th>
                                                                <th>Program</th>
                                                                <th>Action</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {filteredStudents.slice(0, 10).map(s => (
                                                                <tr key={s.id}>
                                                                    <td className="sd-td-bold">{s.name}</td>
                                                                    <td>{getStudentId(s)}</td>
                                                                    <td>{s.program}</td>
                                                                    <td>
                                                                        <button className="sd-link-btn" onClick={() => setSelectedStudent(s)}>Select Student</button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, padding: '15px', background: '#f8fafc', borderRadius: 12 }}>
                                                    <div>
                                                        <div style={{ fontSize: 16, fontWeight: 800 }}>{selectedStudent.name}</div>
                                                        <div style={{ fontSize: 13, color: '#64748b' }}>{selectedStudent.program} • {getStudentId(selectedStudent)}</div>
                                                    </div>
                                                    <button className="sd-btn sd-btn-ghost" onClick={() => { setSelectedStudent(null); setSelectedCourses([]); }}>
                                                        Change Student
                                                    </button>
                                                </div>

                                                <h3 style={{ fontSize: 15, marginBottom: 12 }}>Available Courses (Select to Enroll)</h3>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12, marginBottom: 24 }}>
                                                    {courses.map(c => {
                                                        const code = c.code || c.id;
                                                        const isEnrolled = selectedStudent.enrolledIn?.includes(code);
                                                        const isSelected = selectedCourses.includes(code);

                                                        return (
                                                            <div
                                                                key={c.id}
                                                                onClick={() => !isEnrolled && toggleCourseSelection(code)}
                                                                style={{
                                                                    padding: '12px 16px',
                                                                    borderRadius: 10,
                                                                    border: `2px solid ${isSelected ? '#1e40af' : isEnrolled ? '#e2e8f0' : '#f1f5f9'}`,
                                                                    background: isSelected ? 'rgba(30,64,175,0.05)' : isEnrolled ? '#f8fafc' : 'white',
                                                                    cursor: isEnrolled ? 'not-allowed' : 'pointer',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 12,
                                                                    opacity: isEnrolled ? 0.6 : 1,
                                                                    transition: 'all 0.2s'
                                                                }}
                                                            >
                                                                <div style={{
                                                                    width: 20, height: 20, borderRadius: 4,
                                                                    border: '2px solid #cbd5e1',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    background: isSelected ? '#1e40af' : 'transparent',
                                                                    borderColor: isSelected ? '#1e40af' : '#cbd5e1'
                                                                }}>
                                                                    {(isSelected || isEnrolled) && <i className="fas fa-check" style={{ color: 'white', fontSize: 10 }}></i>}
                                                                </div>
                                                                <div>
                                                                    <div style={{ fontWeight: 700, fontSize: 13 }}>{code}</div>
                                                                    <div style={{ fontSize: 11, color: '#64748b' }}>{isEnrolled ? 'Already Enrolled' : c.name}</div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                <button
                                                    className="sd-btn sd-btn-primary"
                                                    style={{ width: '100%', justifyContent: 'center' }}
                                                    disabled={enrolling || selectedCourses.length === 0}
                                                    onClick={handleEnrollStudent}
                                                >
                                                    {enrolling ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check-circle"></i>}
                                                    {enrolling ? 'Enrolling...' : `Enroll in ${selectedCourses.length} Courses`}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ══════════ DOCKETS TAB ══════════ */}
                            {activeTab === 'dockets' && (
                                <div className="sd-card">
                                    <div className="sd-card-header">Exam Dockets & Permits</div>
                                    <div className="sd-card-body">
                                        <p style={{ marginBottom: 20, color: '#64748b' }}>Manage exam eligibility and generate dockets for students.</p>
                                        <div className="sd-table-wrapper">
                                            <table className="sd-table">
                                                <thead>
                                                    <tr>
                                                        <th>Student</th>
                                                        <th>Program</th>
                                                        <th>Enrollment</th>
                                                        <th>Eligibility</th>
                                                        <th>Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {students.slice(0, 15).map(s => (
                                                        <tr key={s.id}>
                                                            <td className="sd-td-bold">{s.name}</td>
                                                            <td>{s.program}</td>
                                                            <td>{s.enrolledIn?.length || 0} Courses</td>
                                                            <td><Badge status={(s.enrolledIn?.length || 0) > 0 ? 'Eligible' : 'Ineligible'} /></td>
                                                            <td>
                                                                <button className="sd-dl-btn" disabled={(s.enrolledIn?.length || 0) === 0}>
                                                                    <i className="fas fa-file-pdf"></i> Generate Docket
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ══════════ STUDENTS TAB ══════════ */}
                            {activeTab === 'students' && (
                                <div className="sd-card">
                                    <div className="sd-card-header">
                                        Student Directory
                                        <div style={{ position: 'relative', width: 300 }}>
                                            <i className="fas fa-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}></i>
                                            <input
                                                type="text"
                                                placeholder="Search students..."
                                                value={searchQuery}
                                                onChange={e => setSearchQuery(e.target.value)}
                                                style={{ width: '100%', height: 36, paddingLeft: 36, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}
                                            />
                                        </div>
                                    </div>
                                    <div className="sd-table-wrapper">
                                        <table className="sd-table">
                                            <thead>
                                                <tr>
                                                    <th>Name</th>
                                                    <th>ID</th>
                                                    <th>Email</th>
                                                    <th>Department</th>
                                                    <th>Program</th>
                                                    <th>Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredStudents.map(s => (
                                                    <tr key={s.id}>
                                                        <td className="sd-td-bold">{s.name}</td>
                                                        <td><span className="sd-code">{getStudentId(s)}</span></td>
                                                        <td>{s.email}</td>
                                                        <td>{s.department}</td>
                                                        <td>{s.program}</td>
                                                        <td><Badge status={s.status || 'Active'} /></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* ══════════ SETTINGS TAB ══════════ */}
                            {activeTab === 'settings' && (
                                <div className="sd-card" style={{ maxWidth: 600, margin: '0 auto' }}>
                                    <div className="sd-card-header">Account Settings</div>
                                    <div className="sd-card-body">
                                        <div className="sd-profile-large">
                                            <div className="sd-avatar-lg" style={{ background: '#1e40af' }}>{registrar.name.charAt(0)}</div>
                                            <div>
                                                <div className="sd-profile-fullname">{registrar.name}</div>
                                                <div className="sd-profile-email">{registrar.email}</div>
                                            </div>
                                        </div>
                                        <div className="sd-kv" style={{ marginBottom: 15 }}>
                                            <label className="sd-kv-key">Change Password</label>
                                            <input type="password" placeholder="New Password" style={{ border: 'none', background: 'transparent', outline: 'none', fontWeight: 600, padding: '8px 0', borderBottom: '1px solid #e2e8f0' }} />
                                        </div>
                                        <button className="sd-btn sd-btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Update Profile</button>
                                    </div>
                                </div>
                            )}

                            {/* Styled Utility Classes */}
                            <style>{`
                .registrar-theme .sd-avatar {
                    background: #1e40af !important;
                    color: white !important;
                }
                .registrar-theme .sd-nav-link.active {
                    border-left-color: #f59e0b !important;
                    background: rgba(255, 255, 255, 0.15) !important;
                }
                .sd-input {
                    width: 100%;
                    border: none;
                    background: transparent;
                    outline: none;
                    font-weight: 600;
                    padding: 4px 0;
                    color: #1e293b;
                }
                .sd-toast {
                    position: fixed;
                    top: 24px;
                    right: 24px;
                    padding: 14px 24px;
                    border-radius: 12px;
                    color: white;
                    z-index: 2000;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.2);
                    animation: sd-toast-slide 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    font-weight: 600;
                    letter-spacing: -0.01em;
                }
                @keyframes sd-toast-slide {
                    from { transform: translateX(100px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                .sd-toast-err {
                    background: linear-gradient(135deg, #e11d48, #fb7185);
                }
                .sd-dl-btn {
                    background: #f1f5f9;
                    border: 1px solid #e2e8f0;
                    color: #475569;
                    padding: 8px 16px;
                    border-radius: 10px;
                    font-size: 12.5px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                }
                .sd-dl-btn:hover:not(:disabled) {
                    background: #e2e8f0;
                    color: #1e293b;
                    transform: translateY(-1px);
                }
                .sd-dl-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
            `}</style>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default RegistrarDashboard;
