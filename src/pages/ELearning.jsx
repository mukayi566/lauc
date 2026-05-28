import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../dashboards.css';

const ELearning = () => {
    const [activeSection, setActiveSection] = useState('courses');
    const { userRole } = useAuth();
    const navigate = useNavigate();

    const handleBack = () => {
        if (userRole === 'student') navigate('/student-dashboard');
        else if (userRole === 'lecturer') navigate('/staff-dashboard');
        else navigate('/portal-gateway');
    };

    const courses = [
        { id: 'CSC101', name: 'Introduction to Programming', lecturer: 'Dr. Sandala', progress: 75, materials: 12, nextLive: 'Tomorrow, 10:00 AM' },
        { id: 'BIT202', name: 'Database Management Systems', lecturer: 'Prof. Kalaba', progress: 40, materials: 8, nextLive: 'Friday, 02:00 PM' },
        { id: 'ENG111', name: 'Communication Skills', lecturer: 'Mrs. Phiri', progress: 95, materials: 15, nextLive: 'Saturday, 09:00 AM' },
    ];

    const assignments = [
        { title: 'Project Proposal', course: 'CSC101', dueDate: '2026-06-01', status: 'Pending' },
        { title: 'Normalization Lab', course: 'BIT202', dueDate: '2026-05-30', status: 'Submitted' },
    ];

    return (
        <div className="elearning-page">
            {/* Header */}
            <header className="elearning-header">
                <div className="container flex-between">
                    <div className="elearning-brand" style={{ cursor: 'pointer' }} onClick={handleBack}>
                        <i className="fas fa-graduation-cap"></i>
                        <span>Fairview E-Learning</span>
                    </div>
                    <div className="elearning-nav">
                        <button className={activeSection === 'courses' ? 'active' : ''} onClick={() => setActiveSection('courses')}>My Courses</button>
                        <button className={activeSection === 'live' ? 'active' : ''} onClick={() => setActiveSection('live')}>Virtual Classes</button>
                        <button className={activeSection === 'assignments' ? 'active' : ''} onClick={() => setActiveSection('assignments')}>Assignments</button>
                        <button className={activeSection === 'library' ? 'active' : ''} onClick={() => setActiveSection('library')}>Digital Library</button>
                    </div>
                    <div className="user-access">
                        <button className="btn btn-outline btn-sm" onClick={handleBack} style={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}>
                            <i className="fas fa-arrow-left"></i> Dashboard
                        </button>
                        <i className="fas fa-bell"></i>
                        <div className="avatar-circle">ST</div>
                    </div>
                </div>
            </header>

            <div className="container section">
                {activeSection === 'courses' && (
                    <div className="elearning-content">
                        <div className="section-title-area">
                            <h2>My Active Courses</h2>
                            <p>Continue where you left off in your academic journey.</p>
                        </div>

                        <div className="courses-grid-lms">
                            {courses.map(course => (
                                <div key={course.id} className="lms-course-card">
                                    <div className="card-top">
                                        <span className="course-code">{course.id}</span>
                                        <i className="fas fa-bookmark"></i>
                                    </div>
                                    <h3>{course.name}</h3>
                                    <p className="lecturer-name">By {course.lecturer}</p>

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
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="upcoming-item">
                                                <div className="time-col">
                                                    <span className="time">14:00</span>
                                                    <span className="ampm">PM</span>
                                                </div>
                                                <div className="info-col">
                                                    <h4>Community Health Nursing</h4>
                                                    <p>Discussion on Epidemic Responses</p>
                                                </div>
                                                <button className="btn btn-outline btn-sm">Set Reminder</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <aside className="live-sidebar">
                                <div className="calendar-card">
                                    <h3>Class Calendar</h3>
                                    <div className="placeholder-calendar">
                                        {/* Mock Calendar */}
                                        <div className="cal-day selected">28 <small>Thu</small></div>
                                        <div className="cal-day">29 <small>Fri</small></div>
                                        <div className="cal-day">30 <small>Sat</small></div>
                                        <div className="cal-day">31 <small>Sun</small></div>
                                    </div>
                                </div>
                                <div className="announcements-mini">
                                    <h3>Announcements</h3>
                                    <div className="ann-item">
                                        <span className="date">28 May</span>
                                        <p>New handouts uploaded for CSC101.</p>
                                    </div>
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
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Title</th>
                                        <th>Course</th>
                                        <th>Due Date</th>
                                        <th>Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {assignments.map((ass, idx) => (
                                        <tr key={idx}>
                                            <td className="font-bold">{ass.title}</td>
                                            <td>{ass.course}</td>
                                            <td>{ass.dueDate}</td>
                                            <td>
                                                <span className={`status-badge ${ass.status.toLowerCase()}`}>
                                                    {ass.status}
                                                </span>
                                            </td>
                                            <td>
                                                <button className="btn btn-primary btn-xs">
                                                    {ass.status === 'Submitted' ? 'View' : 'Upload'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .elearning-page { min-height: 100vh; background: #f4f7fa; }
                .elearning-header { background: #1e3c72; color: white; padding: 15px 0; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
                .flex-between { display: flex; justify-content: space-between; align-items: center; }
                .elearning-brand { display: flex; align-items: center; gap: 12px; font-weight: 800; font-size: 1.5rem; }
                .elearning-nav { display: flex; gap: 20px; }
                .elearning-nav button { background: none; border: none; color: rgba(255,255,255,0.7); font-weight: 600; padding: 8px 15px; border-radius: 8px; cursor: pointer; transition: 0.3s; }
                .elearning-nav button:hover { background: rgba(255,255,255,0.1); color: white; }
                .elearning-nav button.active { background: white; color: #1e3c72; }

                .user-access { display: flex; align-items: center; gap: 20px; }
                .avatar-circle { width: 38px; height: 38px; border-radius: 50%; background: #2a5298; display: flex; align-items: center; justifyContent: center; font-weight: 700; border: 2px solid rgba(255,255,255,0.3); }

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
            `}</style>
        </div>
    );
};

export default ELearning;
