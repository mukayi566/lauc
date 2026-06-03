import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, getDocs, query, where, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { JitsiMeeting } from '@jitsi/react-sdk';
import Layout from '../components/Layout';
import '../dashboards.css';
import './elearning.css';

const StudentELearning = () => {
    const [activeSection, setActiveSection] = useState('courses');
    const [courses, setCourses] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewingCourse, setViewingCourse] = useState(null);
    const [courseMaterials, setCourseMaterials] = useState([]);
    const [loadingMaterials, setLoadingMaterials] = useState(false);
    const [libraryMaterials, setLibraryMaterials] = useState([]);
    const [loadingLibrary, setLoadingLibrary] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [liveSessions, setLiveSessions] = useState([]);
    const [loadingLive, setLoadingLive] = useState(true);
    const [joiningSession, setJoiningSession] = useState(null);
    const { currentUser, userRole } = useAuth();
    const navigate = useNavigate();

    const uid = currentUser?.uid;

    const loadData = useCallback(async () => {
        if (!uid) return;
        setLoading(true);

        try {
            // 1. Fetch student's registered courses
            const coursesCol = collection(db, 'students', uid, 'courses');
            const coursesSnap = await getDocs(coursesCol);
            const studentCourses = coursesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            // 2. Fetch assignments & Calculate real progress per course
            const allAssignments = [];
            const courseProgressMap = {};

            for (const course of studentCourses) {
                const courseId = course.docId || course.id;
                const examsCol = collection(db, 'courses', courseId, 'exams');
                const examsQuery = query(examsCol, where('status', '==', 'published'));
                const examsSnap = await getDocs(examsQuery);

                let totalExams = 0;
                let submittedExams = 0;

                for (const d of examsSnap.docs) {
                    totalExams++;
                    const examData = d.data();
                    const examId = d.id;

                    const safeUid = String(uid).replace(/\//g, '_');
                    const subRef = doc(db, 'courses', courseId, 'exams', examId, 'submissions', safeUid);
                    const subSnap = await getDoc(subRef);
                    const isSubmitted = subSnap.exists();

                    if (isSubmitted) submittedExams++;

                    allAssignments.push({
                        id: examId,
                        title: examData.title,
                        course: course.code || courseId,
                        courseId: courseId,
                        dueDate: examData.endDate ? new Date(examData.endDate).toLocaleDateString() : '—',
                        status: isSubmitted ? 'Submitted' : 'Pending',
                        type: examData.type || 'Quiz'
                    });
                }

                // Calculate progress: percentage of submitted exams
                courseProgressMap[courseId] = totalExams > 0
                    ? Math.round((submittedExams / totalExams) * 100)
                    : 0;
            }

            const updatedCourses = studentCourses.map(c => ({
                ...c,
                progress: courseProgressMap[c.docId || c.id] || 0,
                materials: Math.floor(Math.random() * 5) + 3, // Keep mock materials for now
                nextLive: 'Scheduled'
            }));

            setCourses(updatedCourses);
            setAssignments(allAssignments);

        } catch (err) {
            console.error('Error loading E-Learning data:', err);
        } finally {
            setLoading(false);
        }
    }, [uid]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Real-time listener for active virtual classes
    useEffect(() => {
        const q = query(
            collection(db, 'virtual_classes'),
            where('status', '==', 'active')
        );
        const unsub = onSnapshot(q, (snap) => {
            setLiveSessions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoadingLive(false);
        });
        return () => unsub();
    }, []);

    const fetchCourseMaterials = async (courseCode) => {
        setLoadingMaterials(true);
        try {
            const q = query(
                collection(db, 'learning_materials'),
                where('course', '==', courseCode),
                where('published', '==', true)
            );
            const querySnapshot = await getDocs(q);
            const materials = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setCourseMaterials(materials);
        } catch (error) {
            console.error("Error fetching course materials:", error);
        } finally {
            setLoadingMaterials(false);
        }
    };

    const handleEnterClassroom = (course) => {
        setViewingCourse(course);
        fetchCourseMaterials(course.code || course.id);
    };

    const handleBackToCourses = () => {
        setViewingCourse(null);
        setCourseMaterials([]);
    };

    const fetchLibraryMaterials = async () => {
        setLoadingLibrary(true);
        try {
            const q = query(
                collection(db, 'learning_materials'),
                where('published', '==', true)
            );
            const querySnapshot = await getDocs(q);
            const materials = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setLibraryMaterials(materials);
        } catch (error) {
            console.error("Error fetching library materials:", error);
        } finally {
            setLoadingLibrary(false);
        }
    };

    useEffect(() => {
        if (activeSection === 'library') {
            fetchLibraryMaterials();
        }
    }, [activeSection]);

    const filteredLibrary = libraryMaterials.filter(mat => {
        const matchesSearch = mat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            mat.course.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = filterType === 'all' || mat.type === filterType;
        return matchesSearch && matchesType;
    });

    const handleBack = () => {
        if (userRole === 'student') navigate('/student-dashboard');
        else if (userRole === 'staff') navigate('/staff-dashboard');
        else navigate('/login');
    };

    return (
        <Layout>
            <div className="elearning-page">
                {/* Secondary Header for LMS navigation */}
                <div className="elearning-subheader">
                    <div className="container flex-between">
                        <div className="elearning-nav">
                            <button className={activeSection === 'courses' ? 'active' : ''} onClick={() => setActiveSection('courses')}>
                                <i className="fas fa-book"></i> My Courses
                            </button>
                            <button className={activeSection === 'live' ? 'active' : ''} onClick={() => setActiveSection('live')}>
                                <i className="fas fa-video"></i> Virtual Classes
                            </button>
                            <button className={activeSection === 'assignments' ? 'active' : ''} onClick={() => setActiveSection('assignments')}>
                                <i className="fas fa-tasks"></i> Assignments
                            </button>
                            <button className={activeSection === 'library' ? 'active' : ''} onClick={() => setActiveSection('library')}>
                                <i className="fas fa-book-reader"></i> Digital Library
                            </button>
                        </div>
                        <div className="user-context">
                            <button className="btn-context" onClick={handleBack}>
                                <i className="fas fa-arrow-left"></i> Exit to Dashboard
                            </button>
                        </div>
                    </div>
                </div>

                <div className="container section">
                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', color: '#1e3c72' }}>
                            <i className="fas fa-circle-notch fa-spin fa-3x" style={{ marginBottom: '15px' }}></i>
                            <p>Syncing your academic records...</p>
                        </div>
                    ) : (
                        <>
                            {activeSection === 'courses' && (
                                <div className="elearning-content">
                                    <div className="section-title-area">
                                        <h2>My Active Courses</h2>
                                        <p>Continue where you left off in your academic journey.</p>
                                    </div>

                                    {courses.length === 0 ? (
                                        <div className="content-card" style={{ padding: '60px', textAlign: 'center', background: 'white', borderRadius: '16px' }}>
                                            <i className="fas fa-book-open fa-3x" style={{ color: '#e2e8f0', marginBottom: '20px' }}></i>
                                            <h3>No enrolled courses found</h3>
                                            <p style={{ color: '#64748b' }}>Visit the main dashboard to register for your semester courses.</p>
                                            <button className="btn btn-primary mt-20" onClick={handleBack}>Go to Dashboard</button>
                                        </div>
                                    ) : (
                                        <div className="courses-grid-lms">
                                            {courses.map(course => (
                                                <div key={course.id} className="lms-course-card">
                                                    <div className="card-top">
                                                        <span className="course-code">{course.code || course.id}</span>
                                                        <i className="fas fa-bookmark"></i>
                                                    </div>
                                                    <h3>{course.name}</h3>
                                                    <p className="lecturer-name">By {course.lecturer || 'Department Faculty'}</p>

                                                    <div className="progress-container">
                                                        <div className="progress-info">
                                                            <span>Progress</span>
                                                            <span>{course.progress}%</span>
                                                        </div>
                                                        <div className="progress-bar-bg">
                                                            <div className="progress-bar-fill" style={{ width: `${course.progress}%` }}></div>
                                                        </div>
                                                    </div>

                                                    <div className="card-stats">
                                                        <span><i className="fas fa-file-pdf"></i> {course.materials} Resources</span>
                                                        <span><i className="fas fa-video"></i> {course.nextLive}</span>
                                                    </div>

                                                    <button
                                                        className="btn btn-primary w-full mt-10"
                                                        onClick={() => handleEnterClassroom(course)}
                                                    >
                                                        Enter Classroom
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeSection === 'live' && (
                                <div className="live-classes-view">
                                    {joiningSession ? (
                                        // Active Jitsi Meeting
                                        <div style={{ background: '#0f172a', borderRadius: '20px', overflow: 'hidden', height: '700px', display: 'flex', flexDirection: 'column' }}>
                                            <div style={{ padding: '14px 22px', background: 'rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <span style={{ background: '#3b82f6', color: 'white', padding: '3px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}>
                                                        {joiningSession.course}
                                                    </span>
                                                    <h4 style={{ color: 'white', margin: 0, fontSize: '14px' }}>{joiningSession.topic}</h4>
                                                    <span style={{ color: '#10b981', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                        <i className="fas fa-circle" style={{ fontSize: '7px' }}></i> LIVE
                                                    </span>
                                                </div>
                                                <button
                                                    style={{ background: '#ef4444', color: 'white', padding: '7px 16px', borderRadius: '8px', fontSize: '13px', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                                                    onClick={() => setJoiningSession(null)}
                                                >
                                                    <i className="fas fa-phone-slash" style={{ marginRight: '6px' }}></i>
                                                    Leave Class
                                                </button>
                                            </div>
                                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                                <JitsiMeeting
                                                    domain="meet.jit.si"
                                                    roomName={joiningSession.roomName}
                                                    userInfo={{
                                                        displayName: currentUser?.displayName || 'Student',
                                                        email: currentUser?.email || ''
                                                    }}
                                                    configOverwrite={{
                                                        startWithAudioMuted: true,
                                                        startWithVideoMuted: false,
                                                        disableDeepLinking: true,
                                                        prejoinPageEnabled: false
                                                    }}
                                                    interfaceConfigOverwrite={{
                                                        SHOW_JITSI_WATERMARK: false,
                                                        SHOW_WATERMARK_FOR_GUESTS: false,
                                                        TOOLBAR_BUTTONS: [
                                                            'microphone', 'camera', 'desktop',
                                                            'fullscreen', 'hangup', 'chat',
                                                            'raisehand', 'tileview', 'select-background'
                                                        ]
                                                    }}
                                                    getIFrameRef={(el) => {
                                                        if (el) {
                                                            el.style.width = '100%';
                                                            el.style.height = '100%';
                                                            el.style.border = 'none';
                                                        }
                                                    }}
                                                    onReadyToClose={() => setJoiningSession(null)}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        // Session browser
                                        <>
                                            <div className="section-title-area">
                                                <h2>Virtual Classrooms</h2>
                                                <p>Live sessions started by your lecturers. Join in real-time using Jitsi Meet.</p>
                                            </div>

                                            {loadingLive ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '250px', color: '#64748b' }}>
                                                    <i className="fas fa-circle-notch fa-spin fa-2x" style={{ marginBottom: '15px', color: '#3b82f6' }}></i>
                                                    <p>Checking for live sessions...</p>
                                                </div>
                                            ) : liveSessions.length === 0 ? (
                                                <div style={{ background: 'white', borderRadius: '20px', padding: '60px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                                                    <i className="fas fa-video-slash fa-3x" style={{ color: '#cbd5e1', marginBottom: '20px' }}></i>
                                                    <h3 style={{ color: '#1e293b', marginBottom: '10px' }}>No Live Classes Right Now</h3>
                                                    <p style={{ color: '#64748b' }}>When a lecturer starts a virtual class, it will appear here for you to join.</p>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'grid', gap: '20px' }}>
                                                    {liveSessions.map(session => (
                                                        <div key={session.id} style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '2px solid #dcfce7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', boxShadow: '0 4px 20px rgba(16, 185, 129, 0.08)' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                                <div style={{ width: '56px', height: '56px', background: 'linear-gradient(135deg, #10b981, #059669)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.4rem', flexShrink: 0 }}>
                                                                    <i className="fas fa-video"></i>
                                                                </div>
                                                                <div>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                                                                        <span style={{ background: '#3b82f6', color: 'white', padding: '2px 10px', borderRadius: '5px', fontSize: '12px', fontWeight: 700 }}>
                                                                            {session.course}
                                                                        </span>
                                                                        <span style={{ background: '#dcfce7', color: '#16a34a', padding: '2px 10px', borderRadius: '5px', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                            <i className="fas fa-circle" style={{ fontSize: '6px' }}></i> LIVE NOW
                                                                        </span>
                                                                    </div>
                                                                    <h3 style={{ margin: '0 0 4px', fontSize: '16px', color: '#1e293b', fontWeight: 700 }}>{session.topic}</h3>
                                                                    <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>
                                                                        <i className="fas fa-chalkboard-teacher" style={{ marginRight: '6px' }}></i>
                                                                        {session.lecturerName || 'Your Lecturer'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => setJoiningSession(session)}
                                                                style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', padding: '12px 28px', borderRadius: '10px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)', whiteSpace: 'nowrap' }}
                                                            >
                                                                <i className="fas fa-video"></i>
                                                                Join Class
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}

                            {activeSection === 'assignments' && (
                                <div className="assignments-view">
                                    <div className="section-title-area">
                                        <h2>My Assignments</h2>
                                        <p>Track your deadlines and submit your coursework.</p>
                                    </div>

                                    <div className="content-card">
                                        {assignments.length === 0 ? (
                                            <div style={{ padding: '40px', textAlign: 'center' }}>
                                                <i className="fas fa-tasks fa-2x" style={{ color: '#cbd5e1', marginBottom: '15px' }}></i>
                                                <p style={{ color: '#64748b' }}>Great job! You have no pending assignments or quizzes.</p>
                                            </div>
                                        ) : (
                                            <table className="data-table">
                                                <thead>
                                                    <tr>
                                                        <th>Assessment Title</th>
                                                        <th>Course</th>
                                                        <th>Deadline</th>
                                                        <th>Current Status</th>
                                                        <th style={{ textAlign: 'right' }}>Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {assignments.map((ass, idx) => (
                                                        <tr key={idx}>
                                                            <td>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                    <div className={`type-icon-wrapper ${ass.type?.toLowerCase() || 'quiz'}`}>
                                                                        <i className={ass.type?.toLowerCase() === 'exam' ? 'fas fa-file-signature' : 'fas fa-stopwatch'}></i>
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-bold">{ass.title}</div>
                                                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{ass.type || 'Quiz'} Assessment</div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <span className="course-tag">{ass.course}</span>
                                                            </td>
                                                            <td>
                                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                    <span style={{ fontWeight: 600 }}>{ass.dueDate}</span>
                                                                    <span style={{ fontSize: '0.7rem', color: '#ef4444' }}>Due at 23:59</span>
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <span className={`status-badge-new ${ass.status.toLowerCase()}`}>
                                                                    <i className={ass.status === 'Submitted' ? 'fas fa-check-circle' : 'fas fa-clock'}></i>
                                                                    {ass.status}
                                                                </span>
                                                            </td>
                                                            <td style={{ textAlign: 'right' }}>
                                                                <button className={`lms-action-btn ${ass.status === 'Submitted' ? 'view' : 'take'}`}>
                                                                    <i className={ass.status === 'Submitted' ? 'fas fa-eye' : 'fas fa-edit'}></i>
                                                                    {ass.status === 'Submitted' ? 'Review Result' : 'Take ' + (ass.type || 'Quiz')}
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeSection === 'library' && (
                                <div className="library-view">
                                    <div className="section-title-area">
                                        <h2>Digital Library</h2>
                                        <p>Access all course materials and academic resources uploaded by our faculty.</p>
                                    </div>

                                    <div className="library-controls-card">
                                        <div className="search-bar-library">
                                            <i className="fas fa-search"></i>
                                            <input
                                                type="text"
                                                placeholder="Search by title, course, or keyword..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                            />
                                        </div>
                                        <div className="filter-group">
                                            <button className={filterType === 'all' ? 'active' : ''} onClick={() => setFilterType('all')}>All</button>
                                            <button className={filterType === 'pdf' ? 'active' : ''} onClick={() => setFilterType('pdf')}>PDFs</button>
                                            <button className={filterType === 'video' ? 'active' : ''} onClick={() => setFilterType('video')}>Videos</button>
                                            <button className={filterType === 'slides' ? 'active' : ''} onClick={() => setFilterType('slides')}>Slides</button>
                                            <button className={filterType === 'past' ? 'active' : ''} onClick={() => setFilterType('past')}>Past Papers</button>
                                        </div>
                                    </div>

                                    {loadingLibrary ? (
                                        <div className="loading-state-library">
                                            <i className="fas fa-spinner fa-spin"></i>
                                            <p>Organizing library resources...</p>
                                        </div>
                                    ) : (
                                        <div className="library-grid">
                                            {filteredLibrary.length === 0 ? (
                                                <div className="empty-library">
                                                    <i className="fas fa-search-minus"></i>
                                                    <h4>No matching resources found</h4>
                                                    <p>Try adjusting your search or filters to find what you're looking for.</p>
                                                </div>
                                            ) : (
                                                filteredLibrary.map(mat => {
                                                    const typeConfig = {
                                                        pdf: { icon: 'fa-file-pdf', color: 'blue' },
                                                        video: { icon: 'fa-video', color: 'indigo' },
                                                        slides: { icon: 'fa-file-powerpoint', color: 'pink' },
                                                        zip: { icon: 'fa-file-archive', color: 'orange' },
                                                        link: { icon: 'fa-link', color: 'cyan' },
                                                        past: { icon: 'fa-book-open', color: 'purple' }
                                                    };
                                                    const config = typeConfig[mat.type] || { icon: 'fa-file', color: 'green' };

                                                    return (
                                                        <div key={mat.id} className="library-resource-card">
                                                            <div className={`resource-icon ${config.color}`}>
                                                                <i className={`fas ${config.icon}`}></i>
                                                            </div>
                                                            <div className="resource-body">
                                                                <span className="resource-course">{mat.course}</span>
                                                                <h4 className="resource-title">{mat.title}</h4>
                                                                <div className="resource-meta">
                                                                    <span>{mat.fileSize}</span>
                                                                    <span>&bull;</span>
                                                                    <span>{mat.createdAt?.toDate().toLocaleDateString()}</span>
                                                                </div>
                                                            </div>
                                                            <div className="resource-footer">
                                                                {mat.type === 'link' ? (
                                                                    <a href={mat.fileUrl} target="_blank" rel="noreferrer" className="btn-resource">
                                                                        <i className="fas fa-external-link-alt"></i> Open
                                                                    </a>
                                                                ) : (
                                                                    <a href={mat.fileUrl} target="_blank" rel="noreferrer" className="btn-resource" download>
                                                                        <i className="fas fa-download"></i> Get File
                                                                    </a>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {viewingCourse && (
                                <div className="classroom-modal-overlay">
                                    <div className="classroom-view-content">
                                        <div className="classroom-header">
                                            <div className="classroom-title">
                                                <button className="back-btn" onClick={handleBackToCourses}>
                                                    <i className="fas fa-arrow-left"></i>
                                                </button>
                                                <div>
                                                    <span className="course-code-tag">{viewingCourse.code}</span>
                                                    <h2>{viewingCourse.name}</h2>
                                                </div>
                                            </div>
                                            <button className="close-classroom" onClick={handleBackToCourses}>&times;</button>
                                        </div>

                                        <div className="classroom-body">
                                            <div className="classroom-sidebar">
                                                <div className="lecturer-info-card">
                                                    <div className="avatar-placeholder">
                                                        <i className="fas fa-user-tie"></i>
                                                    </div>
                                                    <h4>{viewingCourse.lecturer || 'Department Faculty'}</h4>
                                                    <p>Course Instructor</p>
                                                    <button className="btn btn-outline btn-sm w-full mt-10">Message Instructor</button>
                                                </div>

                                                <div className="classroom-nav-mini">
                                                    <button className="active"><i className="fas fa-folder-open"></i> Study Resources</button>
                                                    <button><i className="fas fa-bullhorn"></i> Announcements</button>
                                                    <button><i className="fas fa-users"></i> Discussion Board</button>
                                                </div>
                                            </div>

                                            <div className="classroom-main-content">
                                                <div className="section-header">
                                                    <h3>Study Materials & Resources</h3>
                                                    <p>Download and review materials uploaded by your lecturer.</p>
                                                </div>

                                                {loadingMaterials ? (
                                                    <div className="loading-state">
                                                        <i className="fas fa-spinner fa-spin"></i>
                                                        <p>Retrieving course materials...</p>
                                                    </div>
                                                ) : courseMaterials.length === 0 ? (
                                                    <div className="empty-state-card">
                                                        <i className="fas fa-ghost"></i>
                                                        <h4>No materials available yet</h4>
                                                        <p>Your lecturer hasn't uploaded any study resources for this course.</p>
                                                    </div>
                                                ) : (
                                                    <div className="materials-list-classroom">
                                                        {courseMaterials.map((mat) => {
                                                            const typeConfig = {
                                                                pdf: { icon: 'fa-file-pdf', color: 'blue' },
                                                                video: { icon: 'fa-video', color: 'indigo' },
                                                                slides: { icon: 'fa-file-powerpoint', color: 'pink' },
                                                                zip: { icon: 'fa-file-archive', color: 'orange' },
                                                                link: { icon: 'fa-link', color: 'cyan' },
                                                                past: { icon: 'fa-book-open', color: 'purple' }
                                                            };
                                                            const config = typeConfig[mat.type] || { icon: 'fa-file', color: 'green' };

                                                            return (
                                                                <div key={mat.id} className="classroom-material-item">
                                                                    <div className={`mat-icon ${config.color}`}>
                                                                        <i className={`fas ${config.icon}`}></i>
                                                                    </div>
                                                                    <div className="mat-details">
                                                                        <div className="mat-name">{mat.title}</div>
                                                                        <div className="mat-meta">
                                                                            {mat.topic && <span>{mat.topic} &bull; </span>}
                                                                            {mat.fileSize} &bull; Uploaded {mat.createdAt?.toDate().toLocaleDateString()}
                                                                        </div>
                                                                    </div>
                                                                    <div className="mat-actions">
                                                                        {mat.type === 'link' ? (
                                                                            <a href={mat.fileUrl} target="_blank" rel="noreferrer" className="btn-download">
                                                                                <i className="fas fa-external-link-alt"></i> Open Link
                                                                            </a>
                                                                        ) : (
                                                                            <a href={mat.fileUrl} target="_blank" rel="noreferrer" className="btn-download" download>
                                                                                <i className="fas fa-download"></i> Download
                                                                            </a>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default StudentELearning;
