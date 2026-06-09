import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import {
    collection,
    onSnapshot,
    query,
    orderBy,
    where,
    limit
} from 'firebase/firestore';

const Attendance = () => {
    const [attendance, setAttendance] = useState([]);
    const [shifts, setShifts] = useState([]);

    useEffect(() => {
        const unsubAtt = onSnapshot(
            query(collection(db, 'attendance'), orderBy('timestamp', 'desc'), limit(100)),
            (snap) => setAttendance(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        );
        return () => unsubAtt();
    }, []);

    return (
        <div className="sd-tab-fade">
            <div className="sd-page-header">
                <div>
                    <h2 className="sd-page-title">Attendance & Time Tracking</h2>
                    <p className="sd-page-sub">Monitor clock-in/out, shift management, and overtime tracking.</p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button className="sd-btn sd-btn-white">
                        <i className="fas fa-fingerprint"></i> Biometric Sync
                    </button>
                    <button className="sd-btn sd-btn-primary">
                        <i className="fas fa-calendar-alt"></i> Manage Shifts
                    </button>
                </div>
            </div>

            <div className="sd-stats-row">
                <div className="sd-stat-card" style={{ borderLeft: '4px solid #10b981' }}>
                    <div className="sd-stat-icon" style={{ color: '#10b981' }}><i className="fas fa-user-check"></i></div>
                    <div className="sd-stat-val">
                        <div style={{ fontWeight: 800, fontSize: 20 }}>84%</div>
                    </div>
                    <div className="sd-stat-lbl">Today's Attendance</div>
                </div>
                <div className="sd-stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
                    <div className="sd-stat-icon" style={{ color: '#f59e0b' }}><i className="fas fa-clock"></i></div>
                    <div className="sd-stat-val">
                        <div style={{ fontWeight: 800, fontSize: 20 }}>12</div>
                    </div>
                    <div className="sd-stat-lbl">Late Arrivals Today</div>
                </div>
                <div className="sd-stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
                    <div className="sd-stat-icon" style={{ color: '#3b82f6' }}><i className="fas fa-business-time"></i></div>
                    <div className="sd-stat-val">
                        <div style={{ fontWeight: 800, fontSize: 20 }}>45 hrs</div>
                    </div>
                    <div className="sd-stat-lbl">Overtime Recorded</div>
                </div>
            </div>

            <div className="sd-card" style={{ marginTop: 24 }}>
                <div className="sd-card-header">
                    <span><i className="fas fa-history"></i> Recent Activity</span>
                    <div className="header-filters">
                        <input type="date" className="sd-input" style={{ width: 150, padding: '4px 8px' }} />
                    </div>
                </div>
                <div className="sd-card-body">
                    <div className="table-responsive">
                        <table className="sd-table">
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>Date</th>
                                    <th>Clock In</th>
                                    <th>Clock Out</th>
                                    <th>Wait Time</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {attendance.length === 0 ? (
                                    <tr><td colSpan={6} className="sd-empty">No attendance records found.</td></tr>
                                ) : attendance.map(rec => (
                                    <tr key={rec.id}>
                                        <td>{rec.employeeName}</td>
                                        <td>{rec.timestamp?.toDate ? rec.timestamp.toDate().toLocaleDateString() : 'Today'}</td>
                                        <td>{rec.clockIn || '08:00 AM'}</td>
                                        <td>{rec.clockOut || '—'}</td>
                                        <td>{rec.late ? <span style={{ color: '#dc2626' }}>{rec.lateMinutes} mins late</span> : 'On Time'}</td>
                                        <td>
                                            <span className={`sd-badge ${rec.clockOut ? 'badge-blue' : 'badge-green'}`}>
                                                {rec.clockOut ? 'Completed' : 'On-Site'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Attendance;
