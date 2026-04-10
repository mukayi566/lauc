import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import '../dashboards.css';

/* ─────────────────────────────────────────────────────────────────
   HELPERS & Mock Data
   (Using Zambian context as requested in history)
───────────────────────────────────────────────────────────────── */
const Badge = ({ status }) => {
    const map = {
        'Ongoing': 'badge-green',
        'Completed': 'badge-teal',
        'Canceled': 'badge-red',
        'Active': 'badge-green',
        'Inactive': 'badge-red',
        'Urgent': 'badge-red',
        'Info': 'badge-teal'
    };
    return <span className={`sd-badge ${map[status] || 'badge-teal'}`}>{status}</span>;
};

const INITIAL_COURSES = [
    { id: '1', code: 'CSC101', name: 'Introduction to Computer Science', students: 48, status: 'Ongoing', semester: 'Spring 2026' },
    { id: '2', code: 'MTH201', name: 'Calculus II', students: 32, status: 'Ongoing', semester: 'Spring 2026' },
    { id: '3', code: 'CSC305', name: 'Database Management', students: 25, status: 'Completed', semester: 'Fall 2025' },
];

const INITIAL_ANNOUNCEMENTS = [
    { id: '1', title: 'Mid-semester Exam Date', content: 'The mid-semester exam for CSC101 will be on April 15th.', date: '2026-03-25', status: 'Urgent' },
    { id: '2', title: 'Calculus Assignment #3', content: 'Assignment 3 is now uploaded in the portal. Due by Friday.', date: '2026-03-28', status: 'Info' },
];

const INITIAL_STUDENTS = [
    { id: '1', name: 'Alex Mwansa', email: 'alex@example.com', studentId: 'LAUC/2023/CSC/001', course: 'CSC101' },
    { id: '2', name: 'Banda Chibesa', email: 'banda@example.com', studentId: 'LAUC/2023/MTH/012', course: 'MTH201' },
    { id: '3', name: 'Mutale Phiri', email: 'mutale@example.com', studentId: 'LAUC/2023/CSC/045', course: 'CSC101' },
];

const StaffDashboard = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showManageModal, setShowManageModal] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [courses, setCourses] = useState(INITIAL_COURSES);
    const [announcements, setAnnouncements] = useState(INITIAL_ANNOUNCEMENTS);
    const [students, setStudents] = useState(INITIAL_STUDENTS);
    const [searchQuery, setSearchQuery] = useState('');
    const [lecturerData, setLecturerData] = useState(null);
    const [showPasswordForce, setShowPasswordForce] = useState(false);
    
    // Announcement Form
    const [newAnn, setNewAnn] = useState({ title: '', content: '', status: 'Info' });
    const [passForm, setPassForm] = useState({ current: '', new: '', confirm: '' });

    const navigate = useNavigate();
    const { signOut, currentUser } = useAuth();

    // Fetch Lecturer Data
    useEffect(() => {
        if (!currentUser?.email) return;
        const q = query(collection(db, 'lecturers'), where('email', '==', currentUser.email));
        const unsub = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const data = { docId: snapshot.docs[0].id, ...snapshot.docs[0].data() };
                setLecturerData(data);
                if (data.mustChangePassword) {
                    setShowPasswordForce(true);
                }
            }
        });
        return () => unsub();
    }, [currentUser]);

    const updatePassword = async (e) => {
        e.preventDefault();
        if (passForm.new !== passForm.confirm) return alert("Passwords don't match");
        if (!lecturerData) return;

        try {
            await updateDoc(doc(db, 'lecturers', lecturerData.docId), {
                password: passForm.new,
                mustChangePassword: false
            });
            setShowPasswordForce(false);
            alert("Password updated successfully!");
        } catch (err) {
            console.error(err);
            alert("Error updating password");
        }
    };

    const logout = async () => {
        await signOut();
        navigate('/login');
    };

    const handleNewAnnouncement = (e) => {
        e.preventDefault();
        const ann = {
            id: Date.now().toString(),
            ...newAnn,
            date: new Date().toISOString().split('T')[0]
        };
        setAnnouncements([ann, ...announcements]);
        setShowAnnouncementModal(false);
        setNewAnn({ title: '', content: '', status: 'Info' });
    };

    const navItems = [
        { id: 'dashboard', icon: 'fa-tachometer-alt', label: 'Dashboard' },
        { id: 'courses', icon: 'fa-book', label: 'My Courses' },
        { id: 'students', icon: 'fa-users', label: 'Students' },
        { id: 'announcements', icon: 'fa-bullhorn', label: 'Announcements' },
        { id: 'settings', icon: 'fa-cog', label: 'Settings' },
    ];

    const lecturer = lecturerData || {
        name: 'Loading...',
        role: 'Staff',
        email: currentUser?.email,
        initials: '..'
    };

    const displayInitials = lecturer.name !== 'Loading...' 
        ? lecturer.name.split(' ').map(n => n[0]).join('') 
        : '..';

    const filteredStudents = students.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.studentId.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="sd-shell staff-theme">
            {/* OVERLAY FOR MOBILE */}
            {sidebarOpen && <div className="sd-overlay" onClick={() => setSidebarOpen(false)} />}

            {/* SIDEBAR */}
            <div className={`sd-sidebar ${sidebarOpen ? 'sd-sidebar--open' : ''}`}>
                <div className="sd-sidebar-logo">
                    <div className="sd-logo-icon"><i className="fas fa-chalkboard-teacher"></i></div>
                    <div>
                        <div className="sd-logo-title">LAUC Portal</div>
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
                        <button className="sd-icon-btn"><i className="fas fa-search"></i></button>
                        <button className="sd-icon-btn"><i className="fas fa-bell"></i><span className="sd-notif-dot">2</span></button>
                        <div className="sd-topbar-avatar" onClick={() => setShowProfileModal(true)}>{displayInitials}</div>
                    </div>
                </header>

                <main className="sd-main">
                    {/* DASHBOARD TAB */}
                    {activeTab === 'dashboard' && (
                        <div className="sd-tab-fade">
                            <div className="sd-welcome-banner">
                                <div>
                                    <h1 className="sd-welcome-h1">Welcome back, {lecturer.name.split(' ')[1]}!</h1>
                                    <p className="sd-welcome-p">You have 2 classes scheduled for today.</p>
                                </div>
                                <div className="sd-welcome-actions">
                                    <button className="sd-btn sd-btn-white" onClick={() => setShowAnnouncementModal(true)}>
                                        <i className="fas fa-plus"></i> New Announcement
                                    </button>
                                </div>
                            </div>

                            <div className="sd-stats-row">
                                <div className="sd-stat-card">
                                    <div className="sd-stat-icon">
                                        <i className="fas fa-users"></i>
                                    </div>
                                    <div className="sd-stat-val">105</div>
                                    <div className="sd-stat-lbl">Total Students</div>
                                </div>
                                <div className="sd-stat-card">
                                    <div className="sd-stat-icon">
                                        <i className="fas fa-book"></i>
                                    </div>
                                    <div className="sd-stat-val">3</div>
                                    <div className="sd-stat-lbl">Active Courses</div>
                                </div>
                                <div className="sd-stat-card">
                                    <div className="sd-stat-icon">
                                        <i className="fas fa-clock"></i>
                                    </div>
                                    <div className="sd-stat-val">12</div>
                                    <div className="sd-stat-lbl">Weekly Hours</div>
                                </div>
                                <div className="sd-stat-card">
                                    <div className="sd-stat-icon">
                                        <i className="fas fa-star"></i>
                                    </div>
                                    <div className="sd-stat-val">4.9</div>
                                    <div className="sd-stat-lbl">Avg Rating</div>
                                </div>
                            </div>

                            <div className="sd-two-col">
                                <div className="sd-card">
                                    <div className="sd-card-header">Upcoming Classes</div>
                                    <div className="sd-card-body">
                                        <div className="sd-schedule-item">
                                            <div className="sd-schedule-dot" style={{ background: 'var(--primary-color)' }}><i className="fas fa-laptop-code"></i></div>
                                            <div className="sd-schedule-info">
                                                <div className="sd-schedule-course">CSC101 - Intro to CS</div>
                                                <div className="sd-schedule-meta">09:00 - 11:00 · Room 302</div>
                                            </div>
                                        </div>
                                        <div className="sd-schedule-item">
                                            <div className="sd-schedule-dot" style={{ background: '#10b981' }}><i className="fas fa-calculator"></i></div>
                                            <div className="sd-schedule-info">
                                                <div className="sd-schedule-course">MTH201 - Calculus II</div>
                                                <div className="sd-schedule-meta">14:00 - 16:00 · Lab 1</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="sd-card">
                                    <div className="sd-card-header">Recent Students</div>
                                    <div className="sd-card-body" style={{ padding: 0 }}>
                                        {students.slice(0, 3).map(s => (
                                            <div key={s.id} className="sd-notif-row">
                                                <div className="sd-avatar-xl" style={{ width: 35, height: 35, fontSize: 12 }}>{s.name.charAt(0)}</div>
                                                <div className="sd-notif-body">
                                                    <div className="sd-notif-text" style={{ fontWeight: 600 }}>{s.name}</div>
                                                    <div className="sd-notif-time">{s.course} · {s.studentId}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* COURSES TAB */}
                    {activeTab === 'courses' && (
                        <div className="sd-tab-fade">
                            <div className="sd-page-header">
                                <div>
                                    <h2 className="sd-page-title">Course Management</h2>
                                    <p className="sd-page-sub">Manage your assigned courses and student grades.</p>
                                </div>
                            </div>
                            <div className="sd-card">
                                <div className="sd-table-wrapper">
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
                                                    <td>{course.students}</td>
                                                    <td>{course.semester}</td>
                                                    <td><Badge status={course.status} /></td>
                                                    <td>
                                                        <button className="sd-dl-btn" onClick={() => { setSelectedCourse(course); setShowManageModal(true); }}>
                                                            <i className="fas fa-edit"></i> Manage
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

                    {/* STUDENTS TAB */}
                    {activeTab === 'students' && (
                        <div className="sd-tab-fade">
                            <div className="sd-page-header">
                                <div>
                                    <h2 className="sd-page-title">Student Directory</h2>
                                    <p className="sd-page-sub">Total {filteredStudents.length} students enrolled in your courses.</p>
                                </div>
                                <div style={{ display: 'flex', gap: 10 }}>
                                    <input 
                                        type="text" 
                                        placeholder="Search name or ID..." 
                                        className="sd-modal-form" // Reuse style
                                        style={{ height: 40, width: 250, padding: '0 15px', borderRadius: 8, border: '1px solid #ddd' }}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="sd-card">
                                <div className="sd-table-wrapper">
                                    <table className="sd-table">
                                        <thead>
                                            <tr>
                                                <th>Name</th>
                                                <th>Student ID</th>
                                                <th>Email</th>
                                                <th>Course</th>
                                                <th>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredStudents.map(student => (
                                                <tr key={student.id}>
                                                    <td className="sd-td-bold">{student.name}</td>
                                                    <td>{student.studentId}</td>
                                                    <td>{student.email}</td>
                                                    <td>{student.course}</td>
                                                    <td>
                                                        <button className="sd-icon-btn-sm"><i className="fas fa-envelope"></i></button>
                                                        <button className="sd-icon-btn-sm"><i className="fas fa-eye"></i></button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ANNOUNCEMENTS TAB */}
                    {activeTab === 'announcements' && (
                        <div className="sd-tab-fade">
                            <div className="sd-page-header">
                                <div>
                                    <h2 className="sd-page-title">Course Announcements</h2>
                                    <p className="sd-page-sub">Post updates for your students.</p>
                                </div>
                                <button className="sd-btn sd-btn-primary" onClick={() => setShowAnnouncementModal(true)}>
                                    <i className="fas fa-plus"></i> New Announcement
                                </button>
                            </div>
                            <div className="sd-card">
                                <div className="sd-card-body" style={{ padding: 0 }}>
                                    {announcements.length === 0 ? (
                                        <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>No announcements posted yet.</div>
                                    ) : announcements.map(ann => (
                                        <div key={ann.id} className="sd-notif-row">
                                            <div className="sd-notif-icon" style={{ color: ann.status === 'Urgent' ? '#dc2626' : 'var(--primary-color)' }}>
                                                <i className={`fas ${ann.status === 'Urgent' ? 'fa-exclamation-circle' : 'fa-info-circle'}`}></i>
                                            </div>
                                            <div className="sd-notif-body">
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <div className="sd-notif-text" style={{ fontWeight: 700, fontSize: 15 }}>{ann.title}</div>
                                                    <Badge status={ann.status} />
                                                </div>
                                                <div className="sd-notif-text" style={{ marginTop: 5 }}>{ann.content}</div>
                                                <div className="sd-notif-time">{ann.date}</div>
                                            </div>
                                            <button className="sd-icon-btn-sm" style={{ alignSelf: 'center' }} onClick={() => setAnnouncements(announcements.filter(a => a.id !== ann.id))}>
                                                <i className="fas fa-trash"></i>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SETTINGS TAB */}
                    {activeTab === 'settings' && (
                        <div className="sd-tab-fade">
                            <div className="sd-page-header">
                                <h2 className="sd-page-title">Profile Settings</h2>
                            </div>
                            <div className="sd-card" style={{ maxWidth: 600 }}>
                                <div className="sd-card-body">
                                    <div className="sd-profile-large">
                                        <div className="sd-avatar-lg" style={{ width: 80, height: 80, fontSize: 28 }}>{lecturer.initials}</div>
                                        <div>
                                            <h2 className="sd-profile-fullname">{lecturer.name}</h2>
                                            <p className="sd-profile-email">{lecturer.email}</p>
                                            <button className="sd-btn sd-btn-ghost btn-sm" style={{ marginTop: 10 }}>Change Avatar</button>
                                        </div>
                                    </div>
                                    <form className="sd-modal-form" onSubmit={updatePassword}>
                                        <label>Full Name</label>
                                        <input type="text" defaultValue={lecturer.name} readOnly />
                                        <label>Email Address</label>
                                        <input type="email" defaultValue={lecturer.email} readOnly />
                                        <label>New Password</label>
                                        <input type="password" required value={passForm.new} onChange={e => setPassForm({...passForm, new: e.target.value})} />
                                        <label>Confirm Password</label>
                                        <input type="password" required value={passForm.confirm} onChange={e => setPassForm({...passForm, confirm: e.target.value})} />
                                        <div style={{ marginTop: 24 }}>
                                            <button className="sd-btn sd-btn-primary">Update Password</button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* MODALS */}
            {showManageModal && (
                <div className="sd-modal-overlay">
                    <div className="sd-modal">
                        <div className="sd-modal-head">
                            <h3><i className="fas fa-edit"></i> Manage {selectedCourse?.code}</h3>
                            <button className="sd-close-btn" onClick={() => setShowManageModal(false)}>&times;</button>
                        </div>
                        <div className="sd-modal-body">
                            <p style={{ marginBottom: 20 }}>Managing <strong>{selectedCourse?.name}</strong> students and grades.</p>
                            <div className="sd-modal-form">
                                <label>Course Status</label>
                                <select defaultValue={selectedCourse?.status}>
                                    <option>Ongoing</option>
                                    <option>Completed</option>
                                    <option>Canceled</option>
                                </select>
                                <label>Enter Final Exam Grade (Batch)</label>
                                <p className="sd-modal-hint" style={{ fontSize: 12 }}>You can upload a CSV here or enter individually below.</p>
                                <button className="sd-btn sd-btn-ghost" style={{ width: '100%' }}><i className="fas fa-upload"></i> Upload CSV</button>
                            </div>
                        </div>
                        <div className="sd-modal-actions">
                            <button className="sd-btn sd-btn-ghost" onClick={() => setShowManageModal(false)}>Cancel</button>
                            <button className="sd-btn sd-btn-primary" onClick={() => setShowManageModal(false)}>Save Changes</button>
                        </div>
                    </div>
                </div>
            )}

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
                                    style={{ padding: 12, borderRadius: 10, border: '2px solid #e2e8f0', minHeight: 100, outline: 'none' }}
                                    placeholder="Write your announcement here..." 
                                    required
                                    value={newAnn.content}
                                    onChange={(e) => setNewAnn({...newAnn, content: e.target.value})}
                                />
                                <label>Priority</label>
                                <select 
                                    value={newAnn.status}
                                    onChange={(e) => setNewAnn({...newAnn, status: e.target.value})}
                                >
                                    <option value="Info">Normal (Info)</option>
                                    <option value="Urgent">Important (Urgent)</option>
                                </select>
                            </div>
                            <div className="sd-modal-actions">
                                <button type="button" className="sd-btn sd-btn-ghost" onClick={() => setShowAnnouncementModal(false)}>Cancel</button>
                                <button type="submit" className="sd-btn sd-btn-primary">Post Announcement</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showPasswordForce && (
                <div className="sd-modal-overlay" style={{ zIndex: 9999 }}>
                    <div className="sd-modal" style={{ maxWidth: 450 }}>
                        <div className="sd-modal-head">
                            <h3><i className="fas fa-shield-alt"></i> Security Update Required</h3>
                        </div>
                        <div className="sd-modal-body">
                            <p style={{ marginBottom: 20 }}>Welcome to LAUC Staff Portal. For security reasons, you must change your default password before proceeding.</p>
                            <form className="sd-modal-form" id="forcePassForm" onSubmit={updatePassword}>
                                <label>New Password</label>
                                <input type="password" required value={passForm.new} onChange={e => setPassForm({...passForm, new: e.target.value})} placeholder="Enter secure password" />
                                <label>Confirm Password</label>
                                <input type="password" required value={passForm.confirm} onChange={e => setPassForm({...passForm, confirm: e.target.value})} placeholder="Repeat password" />
                            </form>
                        </div>
                        <div className="sd-modal-actions">
                             <button type="submit" form="forcePassForm" className="sd-btn sd-btn-primary" style={{ width: '100%' }}>Update & Continue</button>
                        </div>
                    </div>
                </div>
            )}

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
                            </div>
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
