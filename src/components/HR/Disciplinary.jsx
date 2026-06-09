import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';

const Disciplinary = () => {
    const [incidents, setIncidents] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newIncident, setNewIncident] = useState({
        employeeName: '',
        incidentDate: new Date().toISOString().split('T')[0],
        description: '',
        actionTaken: 'Investigation',
        status: 'Open'
    });

    useEffect(() => {
        onSnapshot(query(collection(db, 'disciplinary_cases'), orderBy('createdAt', 'desc')), (snap) =>
            setIncidents(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        );
    }, []);

    const handleAddIncident = async (e) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, 'disciplinary_cases'), {
                ...newIncident,
                createdAt: serverTimestamp()
            });
            setShowAddModal(false);
            setNewIncident({ employeeName: '', incidentDate: new Date().toISOString().split('T')[0], description: '', actionTaken: 'Investigation', status: 'Open' });
            toast.success('Incident logged');
        } catch (err) {
            toast.error('Error logging incident');
        }
    };

    return (
        <div className="sd-tab-fade">
            <div className="sd-page-header">
                <div>
                    <h2 className="sd-page-title">Disciplinary & Grievance Management</h2>
                    <p className="sd-page-sub">Securely log employee incidents, track warning letters, and manage investigations.</p>
                </div>
                <button className="sd-btn sd-btn-primary" style={{ background: '#dc2626' }} onClick={() => setShowAddModal(true)}>
                    <i className="fas fa-exclamation-circle"></i> Log New Incident
                </button>
            </div>

            <div className="sd-stats-row">
                <div className="sd-stat-card" style={{ borderLeft: '4px solid #dc2626' }}>
                    <div className="sd-stat-icon" style={{ color: '#dc2626' }}><i className="fas fa-gavel"></i></div>
                    <div className="sd-stat-val">
                        <div style={{ fontWeight: 800, fontSize: 20 }}>{incidents.filter(i => i.status === 'Open').length}</div>
                    </div>
                    <div className="sd-stat-lbl">Active Cases</div>
                </div>
                <div className="sd-stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
                    <div className="sd-stat-icon" style={{ color: '#f59e0b' }}><i className="fas fa-bullhorn"></i></div>
                    <div className="sd-stat-val">
                        <div style={{ fontWeight: 800, fontSize: 20 }}>5</div>
                    </div>
                    <div className="sd-stat-lbl">Staff Complaints</div>
                </div>
                <div className="sd-stat-card" style={{ borderLeft: '4px solid #10b981' }}>
                    <div className="sd-stat-icon" style={{ color: '#10b981' }}><i className="fas fa-check-circle"></i></div>
                    <div className="sd-stat-val">
                        <div style={{ fontWeight: 800, fontSize: 20 }}>14</div>
                    </div>
                    <div className="sd-stat-lbl">Cases Resolved</div>
                </div>
            </div>

            <div className="sd-card" style={{ marginTop: 24 }}>
                <div className="sd-card-header">
                    <span><i className="fas fa-history"></i> Case History</span>
                </div>
                <div className="sd-card-body">
                    <div className="table-responsive">
                        <table className="sd-table">
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>Incident Date</th>
                                    <th>Action Taken</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {incidents.length === 0 ? (
                                    <tr><td colSpan={5} className="sd-empty">No active disciplinary cases.</td></tr>
                                ) : incidents.map(cas => (
                                    <tr key={cas.id}>
                                        <td><strong>{cas.employeeName}</strong></td>
                                        <td>{cas.incidentDate}</td>
                                        <td>{cas.actionTaken}</td>
                                        <td>
                                            <span className={`sd-badge ${cas.status === 'Open' ? 'badge-red' : 'badge-green'}`}>
                                                {cas.status}
                                            </span>
                                        </td>
                                        <td>
                                            <button className="sd-btn sd-btn-white sd-btn-sm">View Details</button>
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
                            <h3>Log New Incident / Grievance</h3>
                            <button className="sd-close-btn" onClick={() => setShowAddModal(false)}>&times;</button>
                        </div>
                        <div className="sd-modal-body">
                            <form onSubmit={handleAddIncident} className="sd-modal-form">
                                <label>Employee Name</label>
                                <input required value={newIncident.employeeName} onChange={e => setNewIncident({ ...newIncident, employeeName: e.target.value })} placeholder="Full name of employee" />
                                <label>Incident Date</label>
                                <input type="date" required value={newIncident.incidentDate} onChange={e => setNewIncident({ ...newIncident, incidentDate: e.target.value })} />
                                <label>Initial Action Taken</label>
                                <select value={newIncident.actionTaken} onChange={e => setNewIncident({ ...newIncident, actionTaken: e.target.value })}>
                                    <option>Investigation</option>
                                    <option>Verbal Warning</option>
                                    <option>Written Warning</option>
                                    <option>Grievance Meeting Scheduled</option>
                                </select>
                                <label>Incident Details</label>
                                <textarea rows={4} value={newIncident.description} onChange={e => setNewIncident({ ...newIncident, description: e.target.value })} placeholder="Detailed description of the incident..." style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                                <button type="submit" className="sd-btn sd-btn-primary" style={{ width: '100%', marginTop: 20, background: '#dc2626' }}>Submit Case</button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Disciplinary;
