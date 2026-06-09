import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import {
    collection,
    onSnapshot,
    query,
    where,
    addDoc,
    serverTimestamp
} from 'firebase/firestore';
import toast from 'react-hot-toast';

const AssetManagement = () => {
    const [assignments, setAssignments] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [newAssignment, setNewAssignment] = useState({
        employeeId: '',
        employeeName: '',
        assetId: '',
        assetName: '',
        assignedDate: new Date().toISOString().split('T')[0],
        condition: 'Good'
    });

    useEffect(() => {
        onSnapshot(collection(db, 'asset_assignments'), (snap) =>
            setAssignments(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        );
        onSnapshot(collection(db, 'inventory'), (snap) =>
            setInventory(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        );
        onSnapshot(collection(db, 'users'), (snap) =>
            setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        );
    }, []);

    const handleAssign = async (e) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, 'asset_assignments'), {
                ...newAssignment,
                status: 'Assigned',
                createdAt: serverTimestamp()
            });
            setShowAssignModal(false);
            toast.success('Asset assigned successfully');
        } catch (err) {
            toast.error('Error assigning asset');
        }
    };

    return (
        <div className="sd-tab-fade">
            <div className="sd-page-header">
                <div>
                    <h2 className="sd-page-title">Employee Asset Management</h2>
                    <p className="sd-page-sub">Track laptop assignments, vehicles, and office equipment per employee.</p>
                </div>
                <button className="sd-btn sd-btn-primary" onClick={() => setShowAssignModal(true)}>
                    <i className="fas fa-plus"></i> New Assignment
                </button>
            </div>

            <div className="sd-stats-row">
                <div className="sd-stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
                    <div className="sd-stat-icon" style={{ color: '#3b82f6' }}><i className="fas fa-laptop"></i></div>
                    <div className="sd-stat-val">
                        <div style={{ fontWeight: 800, fontSize: 20 }}>{assignments.length}</div>
                    </div>
                    <div className="sd-stat-lbl">Assigned Assets</div>
                </div>
                <div className="sd-stat-card" style={{ borderLeft: '4px solid #10b981' }}>
                    <div className="sd-stat-icon" style={{ color: '#10b981' }}><i className="fas fa-car"></i></div>
                    <div className="sd-stat-val">
                        <div style={{ fontWeight: 800, fontSize: 20 }}>4</div>
                    </div>
                    <div className="sd-stat-lbl">Vehicle Fleet</div>
                </div>
                <div className="sd-stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
                    <div className="sd-stat-icon" style={{ color: '#f59e0b' }}><i className="fas fa-undo"></i></div>
                    <div className="sd-stat-val">
                        <div style={{ fontWeight: 800, fontSize: 20 }}>3</div>
                    </div>
                    <div className="sd-stat-lbl">Pending Returns</div>
                </div>
            </div>

            <div className="sd-card" style={{ marginTop: 24 }}>
                <div className="sd-card-header">
                    <span><i className="fas fa-list-ul"></i> Assigned Assets Ledger</span>
                </div>
                <div className="sd-card-body">
                    <div className="table-responsive">
                        <table className="sd-table">
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>Asset</th>
                                    <th>Assigned Date</th>
                                    <th>Condition</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {assignments.length === 0 ? (
                                    <tr><td colSpan={6} className="sd-empty">No active assignments.</td></tr>
                                ) : assignments.map(asn => (
                                    <tr key={asn.id}>
                                        <td>{asn.employeeName}</td>
                                        <td>{asn.assetName}</td>
                                        <td>{asn.assignedDate}</td>
                                        <td>{asn.condition}</td>
                                        <td><span className="sd-badge badge-blue">{asn.status}</span></td>
                                        <td>
                                            <button className="sd-btn sd-btn-white sd-btn-sm" title="Mark as Returned">
                                                <i className="fas fa-undo"></i> Return
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showAssignModal && (
                <div className="sd-modal-overlay">
                    <div className="sd-modal">
                        <div className="sd-modal-head">
                            <h3>Assign Asset to Employee</h3>
                            <button className="sd-close-btn" onClick={() => setShowAssignModal(false)}>&times;</button>
                        </div>
                        <div className="sd-modal-body">
                            <form onSubmit={handleAssign} className="sd-modal-form">
                                <label>Select Employee</label>
                                <select required onChange={e => {
                                    const emp = employees.find(x => x.id === e.target.value);
                                    setNewAssignment({ ...newAssignment, employeeId: emp.id, employeeName: emp.name });
                                }}>
                                    <option value="">-- Choose Staff --</option>
                                    {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                </select>
                                <label>Select Asset</label>
                                <select required onChange={e => {
                                    const asset = inventory.find(x => x.id === e.target.value);
                                    setNewAssignment({ ...newAssignment, assetId: asset.id, assetName: asset.name });
                                }}>
                                    <option value="">-- Choose Asset --</option>
                                    {inventory.map(i => <option key={i.id} value={i.id}>{i.name} ({i.code})</option>)}
                                </select>
                                <label>Condition</label>
                                <select value={newAssignment.condition} onChange={e => setNewAssignment({ ...newAssignment, condition: e.target.value })}>
                                    <option>New</option>
                                    <option>Excellent</option>
                                    <option>Good</option>
                                    <option>Fair</option>
                                </select>
                                <button type="submit" className="sd-btn sd-btn-primary" style={{ width: '100%', marginTop: 20 }}>Complete Assignment</button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssetManagement;
