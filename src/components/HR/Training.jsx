import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import {
    collection,
    onSnapshot,
    query,
    orderBy,
    addDoc,
    serverTimestamp
} from 'firebase/firestore';
import toast from 'react-hot-toast';

const Training = () => {
    const [courses, setCourses] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newCourse, setNewCourse] = useState({
        title: '',
        trainer: '',
        category: 'Skills Development',
        date: '',
        capacity: 20
    });

    useEffect(() => {
        const unsub = onSnapshot(
            query(collection(db, 'training_courses'), orderBy('date', 'desc')),
            (snap) => setCourses(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        );
        return () => unsub();
    }, []);

    const handleAddCourse = async (e) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, 'training_courses'), {
                ...newCourse,
                createdAt: serverTimestamp()
            });
            setShowAddModal(false);
            setNewCourse({ title: '', trainer: '', category: 'Skills Development', date: '', capacity: 20 });
            toast.success('Training course created');
        } catch (err) {
            toast.error('Error creating course');
        }
    };

    return (
        <div className="sd-tab-fade">
            <div className="sd-page-header">
                <div>
                    <h2 className="sd-page-title">Training & Development</h2>
                    <p className="sd-page-sub">Assign courses, track certifications, and monitor skill assessments.</p>
                </div>
                <button className="sd-btn sd-btn-primary" onClick={() => setShowAddModal(true)}>
                    <i className="fas fa-plus"></i> Create Course
                </button>
            </div>

            <div className="sd-stats-row">
                <div className="sd-stat-card" style={{ borderLeft: '4px solid #7c3aed' }}>
                    <div className="sd-stat-icon" style={{ color: '#7c3aed' }}><i className="fas fa-graduation-cap"></i></div>
                    <div className="sd-stat-val">
                        <div style={{ fontWeight: 800, fontSize: 20 }}>{courses.length}</div>
                    </div>
                    <div className="sd-stat-lbl">Active Courses</div>
                </div>
                <div className="sd-stat-card" style={{ borderLeft: '4px solid #10b981' }}>
                    <div className="sd-stat-icon" style={{ color: '#10b981' }}><i className="fas fa-certificate"></i></div>
                    <div className="sd-stat-val">
                        <div style={{ fontWeight: 800, fontSize: 20 }}>156</div>
                    </div>
                    <div className="sd-stat-lbl">Certificates Issued</div>
                </div>
                <div className="sd-stat-card" style={{ borderLeft: '4px solid #2563eb' }}>
                    <div className="sd-stat-icon" style={{ color: '#2563eb' }}><i className="fas fa-chart-line"></i></div>
                    <div className="sd-stat-val">
                        <div style={{ fontWeight: 800, fontSize: 20 }}>78%</div>
                    </div>
                    <div className="sd-stat-lbl">Skill Growth Index</div>
                </div>
            </div>

            <div className="sd-card" style={{ marginTop: 24 }}>
                <div className="sd-card-header">
                    <span><i className="fas fa-book"></i> Upcoming Training Sessions</span>
                </div>
                <div className="sd-card-body">
                    <div className="table-responsive">
                        <table className="sd-table">
                            <thead>
                                <tr>
                                    <th>Course Title</th>
                                    <th>Trainer</th>
                                    <th>Category</th>
                                    <th>Date</th>
                                    <th>Enrolled</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {courses.length === 0 ? (
                                    <tr><td colSpan={6} className="sd-empty">No training courses found.</td></tr>
                                ) : courses.map(course => (
                                    <tr key={course.id}>
                                        <td><strong>{course.title}</strong></td>
                                        <td>{course.trainer}</td>
                                        <td>{course.category}</td>
                                        <td>{course.date}</td>
                                        <td>12 / {course.capacity}</td>
                                        <td>
                                            <span className="sd-badge badge-blue">Upcoming</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showAddModal && (
                <div className="sd-modal-overlay">
                    <div className="sd-modal">
                        <div className="sd-modal-head">
                            <h3>Create Training Course</h3>
                            <button className="sd-close-btn" onClick={() => setShowAddModal(false)}>&times;</button>
                        </div>
                        <div className="sd-modal-body">
                            <form onSubmit={handleAddCourse} className="sd-modal-form">
                                <label>Course Title</label>
                                <input required value={newCourse.title} onChange={e => setNewCourse({ ...newCourse, title: e.target.value })} placeholder="e.g. Advanced HR Management" />
                                <label>Trainer</label>
                                <input required value={newCourse.trainer} onChange={e => setNewCourse({ ...newCourse, trainer: e.target.value })} />
                                <label>Category</label>
                                <select value={newCourse.category} onChange={e => setNewCourse({ ...newCourse, category: e.target.value })}>
                                    <option>Skills Development</option>
                                    <option>Compliance</option>
                                    <option>Onboarding</option>
                                    <option>Leadership</option>
                                </select>
                                <label>Date</label>
                                <input type="date" required value={newCourse.date} onChange={e => setNewCourse({ ...newCourse, date: e.target.value })} />
                                <button type="submit" className="sd-btn sd-btn-primary" style={{ width: '100%', marginTop: 20 }}>Schedule Course</button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Training;
