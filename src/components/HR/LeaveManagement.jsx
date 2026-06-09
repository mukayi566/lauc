import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import {
    collection,
    onSnapshot,
    query,
    orderBy,
    updateDoc,
    doc,
    serverTimestamp
} from 'firebase/firestore';
import toast from 'react-hot-toast';

const LeaveManagement = () => {
    const [leaves, setLeaves] = useState([]);

    useEffect(() => {
        const unsub = onSnapshot(
            query(collection(db, 'leave_requests'), orderBy('createdAt', 'desc')),
            (snap) => setLeaves(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        );
        return () => unsub();
    }, []);

    const handleStatusUpdate = async (id, status) => {
        try {
            await updateDoc(doc(db, 'leave_requests', id), {
                status: status,
                approvedAt: serverTimestamp()
            });
            toast.success(`Leave request ${status.toLowerCase()}`);
        } catch (err) {
            toast.error('Failed to update leave status');
        }
    };

    return (
        <div className="sd-tab-fade">
            <div className="sd-page-header">
                <div>
                    <h2 className="sd-page-title">Leave Management</h2>
                    <p className="sd-page-sub">Track annual, sick, and maternity leaves. Approve or reject leave requests.</p>
                </div>
                <button className="sd-btn sd-btn-white">
                    <i className="fas fa-calendar-check"></i> Leave Calendar
                </button>
            </div>

            <div className="sd-stats-row">
                <div className="sd-stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
                    <div className="sd-stat-icon" style={{ color: '#3b82f6' }}><i className="fas fa-paper-plane"></i></div>
                    <div className="sd-stat-val">
                        <div style={{ fontWeight: 800, fontSize: 20 }}>{leaves.filter(l => l.status === 'Pending').length}</div>
                    </div>
                    <div className="sd-stat-lbl">Pending Requests</div>
                </div>
                <div className="sd-stat-card" style={{ borderLeft: '4px solid #10b981' }}>
                    <div className="sd-stat-icon" style={{ color: '#10b981' }}><i className="fas fa-user-slash"></i></div>
                    <div className="sd-stat-val">
                        <div style={{ fontWeight: 800, fontSize: 20 }}>8</div>
                    </div>
                    <div className="sd-stat-lbl">Currently On Leave</div>
                </div>
                <div className="sd-stat-card" style={{ borderLeft: '4px solid #7c3aed' }}>
                    <div className="sd-stat-icon" style={{ color: '#7c3aed' }}><i className="fas fa-chart-pie"></i></div>
                    <div className="sd-stat-val">
                        <div style={{ fontWeight: 800, fontSize: 20 }}>245</div>
                    </div>
                    <div className="sd-stat-lbl">Total Leave Days Used</div>
                </div>
            </div>

            <div className="sd-card" style={{ marginTop: 24 }}>
                <div className="sd-card-header">
                    <span><i className="fas fa-inbox"></i> Leave Requests</span>
                </div>
                <div className="sd-card-body">
                    <div className="table-responsive">
                        <table className="sd-table">
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>Type</th>
                                    <th>Duration</th>
                                    <th>Reason</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaves.length === 0 ? (
                                    <tr><td colSpan={6} className="sd-empty">No leave requests found.</td></tr>
                                ) : leaves.map(leave => (
                                    <tr key={leave.id}>
                                        <td><strong>{leave.employeeName}</strong></td>
                                        <td>{leave.type}</td>
                                        <td>{leave.startDate} to {leave.endDate}</td>
                                        <td style={{ maxWidth: 200, fontSize: 12 }}>{leave.reason}</td>
                                        <td>
                                            <span className={`sd-badge ${leave.status === 'Pending' ? 'badge-gold' : leave.status === 'Approved' ? 'badge-green' : 'badge-red'}`}>
                                                {leave.status}
                                            </span>
                                        </td>
                                        <td>
                                            {leave.status === 'Pending' && (
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    <button className="sd-btn sd-btn-sm" style={{ background: '#d1fae5', color: '#065f46' }} onClick={() => handleStatusUpdate(leave.id, 'Approved')}>Approve</button>
                                                    <button className="sd-btn sd-btn-sm" style={{ background: '#fee2e2', color: '#991b1b' }} onClick={() => handleStatusUpdate(leave.id, 'Rejected')}>Reject</button>
                                                </div>
                                            )}
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

export default LeaveManagement;
