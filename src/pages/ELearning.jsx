import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import Layout from '../components/Layout';
import '../dashboards.css';

const ELearning = () => {
    const [activeSection, setActiveSection] = useState('courses');
    const [courses, setCourses] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
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

                                                    <button className="btn btn-primary w-full mt-10">Enter Classroom</button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeSection === 'live' && (
                                <div className="live-classes-view">
                                    <div className="section-title-area">
                                        <h2>Virtual Classrooms</h2>
                                        <p>Join scheduled live sessions and interact with your lecturers in real-time.</p>
                                    </div>

                                    <div className="live-grid">
                                        <div className="live-main">
                                            <div className="now-live-card">
                                                <div className="live-badge">LIVE NOW</div>
                                                <h3>Advanced Programming with C++</h3>
                                                <p>Module 4: Memory Management and Pointers</p>
                                                <div className="live-meta">
                                                    <span><i className="fas fa-user"></i> 42 Students</span>
                                                    <span><i className="fas fa-clock"></i> Started 15m ago</span>
                                                </div>
                                                <button className="btn btn-danger"><i className="fas fa-video"></i> Join Zoom Meeting</button>
                                            </div>

                                            <div className="upcoming-live">
                                                <h3>Upcoming Sessions</h3>
                                                <div className="upcoming-list">
                                                    {courses.length > 0 ? courses.slice(0, 3).map((course, i) => (
                                                        <div key={i} className="upcoming-item">
                                                            <div className="time-col">
                                                                <span className="time">{10 + i}:00</span>
                                                                <span className="ampm">AM</span>
                                                            </div>
                                                            <div className="info-col">
                                                                <h4>{course.name}</h4>
                                                                <p>Weekly Virtual Lecture - Zoom Session</p>
                                                            </div>
                                                            <button className="btn btn-outline btn-sm">Set Reminder</button>
                                                        </div>
                                                    )) : (
                                                        <div className="upcoming-item" style={{ justifyContent: 'center', color: '#64748b' }}>
                                                            No sessions scheduled for today.
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <aside className="live-sidebar">
                                            <div className="calendar-card">
                                                <h3>Class Calendar</h3>
                                                <div className="placeholder-calendar">
                                                    <div className="cal-day selected">{new Date().getDate()} <small>{new Date().toLocaleDateString('en-US', { weekday: 'short' })}</small></div>
                                                    <div className="cal-day">{new Date().getDate() + 1} <small>{new Date(Date.now() + 86400000).toLocaleDateString('en-US', { weekday: 'short' })}</small></div>
                                                    <div className="cal-day">{new Date().getDate() + 2} <small>{new Date(Date.now() + 172800000).toLocaleDateString('en-US', { weekday: 'short' })}</small></div>
                                                    <div className="cal-day">{new Date().getDate() + 3} <small>{new Date(Date.now() + 259200000).toLocaleDateString('en-US', { weekday: 'short' })}</small></div>
                                                </div>
                                            </div>
                                            <div className="announcements-mini">
                                                <h3>Recent Alerts</h3>
                                                {courses.length > 0 ? (
                                                    <div className="ann-item">
                                                        <span className="date">Today</span>
                                                        <p>New handouts uploaded for {courses[0].code || 'your courses'}.</p>
                                                    </div>
                                                ) : (
                                                    <div className="ann-item">
                                                        <p>Check back later for updates.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </aside>
                                    </div>
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
                        </>
                    )}
                </div>

                <style>{`
                .elearning-page { min-height: 100vh; background: #f4f7fa; }
                .elearning-subheader { background: white; border-bottom: 1px solid #e2e8f0; padding: 12px 0; position: sticky; top: 0; z-index: 90; }
                .flex-between { display: flex; justify-content: space-between; align-items: center; }
                
                .elearning-nav { display: flex; gap: 10px; }
                .elearning-nav button { 
                    background: none; 
                    border: 1px solid transparent; 
                    color: #64748b; 
                    font-weight: 600; 
                    padding: 8px 16px; 
                    border-radius: 10px; 
                    cursor: pointer; 
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 0.9rem;
                }
                .elearning-nav button i { color: #2a5298; opacity: 0.7; }
                .elearning-nav button:hover { background: #f8fafc; color: #1e3c72; }
                .elearning-nav button.active { background: #f0f7ff; color: #1e3c72; border-color: #dbeafe; }
                .elearning-nav button.active i { color: #1e3c72; opacity: 1; }

                .user-context { display: flex; align-items: center; gap: 15px; }
                .btn-context {
                    background: #f1f5f9;
                    border: none;
                    color: #475569;
                    padding: 8px 16px;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 0.85rem;
                    cursor: pointer;
                    transition: 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .btn-context:hover { background: #e2e8f0; color: #1e293b; }

                .section-title-area { margin-bottom: 40px; }
                .section-title-area h2 { font-weight: 800; color: #1e293b; margin-bottom: 8px; }
                .section-title-area p { color: #64748b; }

                .courses-grid-lms { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 30px; }
                .lms-course-card { background: white; padding: 25px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #eef2f6; }
                .card-top { display: flex; justify-content: space-between; margin-bottom: 20px; }
                .course-code { font-weight: 800; color: #1e3c72; background: #e0f2fe; padding: 4px 12px; border-radius: 6px; font-size: 0.8rem; }
                .lms-course-card h3 { font-weight: 700; margin-bottom: 10px; color: #1e293b; }
                .lecturer-name { color: #64748b; font-size: 0.9rem; margin-bottom: 25px; }

                .progress-container { margin-bottom: 25px; }
                .progress-info { display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 600; color: #475569; margin-bottom: 8px; }
                .progress-bar-bg { height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden; }
                .progress-bar-fill { height: 100%; background: linear-gradient(90deg, #1e3c72, #2a5298); border-radius: 4px; }

                .card-stats { display: flex; flex-direction: column; gap: 8px; font-size: 0.85rem; color: #64748b; padding-top: 20px; border-top: 1px solid #f1f5f9; }
                .card-stats i { color: #1e3c72; margin-right: 8px; }

                .live-grid { display: grid; grid-template-columns: 1fr 300px; gap: 40px; }
                .now-live-card { background: linear-gradient(135deg, #1e293b, #0f172a); color: white; padding: 40px; border-radius: 20px; margin-bottom: 30px; position: relative; overflow: hidden; }
                .live-badge { display: inline-block; background: #ef4444; color: white; font-weight: 800; font-size: 0.7rem; padding: 4px 10px; border-radius: 4px; margin-bottom: 20px; animation: pulse 1.5s infinite; }
                .now-live-card h3 { font-size: 1.8rem; margin-bottom: 10px; }
                .live-meta { display: flex; gap: 30px; margin: 25px 0; color: rgba(255,255,255,0.7); font-size: 0.9rem; }
                .live-meta i { margin-right: 8px; }

                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.5; }
                    100% { opacity: 1; }
                }

                .upcoming-live h3 { font-weight: 800; color: #1e293b; margin-bottom: 20px; }
                .upcoming-list { display: flex; flex-direction: column; gap: 15px; }
                .upcoming-item { background: white; padding: 20px; border-radius: 12px; display: flex; align-items: center; gap: 20px; }
                .time-col { display: flex; flex-direction: column; align-items: center; min-width: 60px; color: #1e3c72; font-weight: 800; border-right: 2px solid #f1f5f9; padding-right: 20px; }
                .time { font-size: 1.2rem; line-height: 1; }
                .ampm { font-size: 0.7rem; }
                .info-col { flex: 1; }
                .info-col h4 { font-weight: 700; color: #1e293b; }
                .info-col p { font-size: 0.85rem; color: #64748b; }

                .calendar-card { background: white; padding: 25px; border-radius: 16px; margin-bottom: 30px; }
                .placeholder-calendar { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 15px; }
                .cal-day { text-align: center; padding: 10px; border-radius: 8px; background: #f8fafc; font-weight: 700; color: #475569; }
                .cal-day.selected { background: #1e3c72; color: white; }
                .cal-day small { display: block; font-size: 10px; text-transform: uppercase; }

                .status-badge.pending { background: #fee2e2; color: #b91c1c; }
                .status-badge.submitted { background: #dcfce7; color: #15803d; }

                /* Professional Table Updates */
                .data-table { width: 100%; border-collapse: separate; border-spacing: 0 8px; margin-top: -8px; }
                .data-table th { background: none; color: #64748b; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; padding: 12px 20px; border: none; font-weight: 700; }
                .data-table tr { background: white; }
                .data-table td { padding: 20px; border-top: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9; }
                .data-table tr td:first-child { border-left: 1px solid #f1f5f9; border-top-left-radius: 12px; border-bottom-left-radius: 12px; }
                .data-table tr td:last-child { border-right: 1px solid #f1f5f9; border-top-right-radius: 12px; border-bottom-right-radius: 12px; }

                .type-icon-wrapper { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; }
                .type-icon-wrapper.quiz { background: #f0fdf4; color: #16a34a; }
                .type-icon-wrapper.exam { background: #fff1f2; color: #e11d48; }

                .course-tag { background: #f1f5f9; color: #475569; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-size: 0.75rem; border: 1px solid #e2e8f0; }

                .status-badge-new { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; }
                .status-badge-new.pending { background: #fff7ed; color: #c2410c; border: 1px solid #ffedd5; }
                .status-badge-new.submitted { background: #f0fdf4; color: #15803d; border: 1px solid #dcfce7; }
                .status-badge-new i { font-size: 0.8rem; }

                .lms-action-btn { display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 0.85rem; border: none; cursor: pointer; transition: 0.2s; }
                .lms-action-btn.take { background: #1e3c72; color: white; }
                .lms-action-btn.view { background: #f1f5f9; color: #475569; }

                /* Responsive Adjustments */
                @media (max-width: 1024px) {
                    .live-grid { grid-template-columns: 1fr; }
                    .live-sidebar { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                    .calendar-card { margin-bottom: 0; }
                }

                @media (max-width: 768px) {
                    .elearning-header .container { flex-direction: column; gap: 15px; text-align: center; }
                    .elearning-nav { width: 100%; overflow-x: auto; padding-bottom: 5px; justify-content: flex-start; }
                    .elearning-nav button { white-space: nowrap; padding: 6px 12px; font-size: 0.9rem; }
                    
                    .section-title-area { text-align: center; margin-bottom: 25px; }
                    .courses-grid-lms { grid-template-columns: 1fr; }

                    .live-sidebar { grid-template-columns: 1fr; }
                    .now-live-card { padding: 25px; }
                    .now-live-card h3 { font-size: 1.4rem; }
                    .live-meta { flex-direction: column; gap: 10px; }

                    .upcoming-item { flex-direction: column; text-align: center; gap: 10px; }
                    .time-col { border-right: none; border-bottom: 2px solid #f1f5f9; padding-right: 0; padding-bottom: 15px; width: 100%; }

                    /* Make table scrollable on mobile */
                    .content-card { overflow-x: auto; -webkit-overflow-scrolling: touch; }
                    .data-table { min-width: 650px; }
                }

                @media (max-width: 480px) {
                    .user-access { width: 100%; justify-content: center; }
                    .btn-sm { padding: 5px 10px; font-size: 0.8rem; }
                }
            `}</style>
            </div>
        </Layout>
    );
};

export default ELearning;
