import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

const OrgStructure = () => {
    const [departments, setDepartments] = useState([]);
    const [employees, setEmployees] = useState([]);

    useEffect(() => {
        onSnapshot(collection(db, 'departments' || 'users'), (snap) => {
            // Logic: Mocking departments if collection doesn't exist yet for visual demo
            const depts = snap.docs.length > 0 ? snap.docs.map(d => ({ id: d.id, ...d.data() })) : [
                { name: 'Academic Affairs', head: 'Dr. John Phiri', staffCount: 45 },
                { name: 'Finance & Admin', head: 'Mrs. Sarah Lungu', staffCount: 12 },
                { name: 'Information Technology', head: 'Mr. David Mwale', staffCount: 8 },
                { name: 'Human Resources', head: 'Ms. Grace Banda', staffCount: 5 }
            ];
            setDepartments(depts);
        });
        onSnapshot(collection(db, 'users'), (snap) =>
            setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        );
    }, []);

    return (
        <div className="sd-tab-fade">
            <div className="sd-page-header">
                <div>
                    <h2 className="sd-page-title">Organizational Structure</h2>
                    <p className="sd-page-sub">Manage departments, define positions, and view the reporting hierarchy.</p>
                </div>
                <button className="sd-btn sd-btn-primary">
                    <i className="fas fa-sitemap"></i> View Org Chart
                </button>
            </div>

            <div className="sd-stats-row">
                <div className="sd-stat-card" style={{ borderLeft: '4px solid #7c3aed' }}>
                    <div className="sd-stat-icon" style={{ color: '#7c3aed' }}><i className="fas fa-building"></i></div>
                    <div className="sd-stat-val">
                        <div style={{ fontWeight: 800, fontSize: 20 }}>{departments.length}</div>
                    </div>
                    <div className="sd-stat-lbl">Departments</div>
                </div>
                <div className="sd-stat-card" style={{ borderLeft: '4px solid #10b981' }}>
                    <div className="sd-stat-icon" style={{ color: '#10b981' }}><i className="fas fa-id-badge"></i></div>
                    <div className="sd-stat-val">
                        <div style={{ fontWeight: 800, fontSize: 20 }}>24</div>
                    </div>
                    <div className="sd-stat-lbl">Designated Positions</div>
                </div>
                <div className="sd-stat-card" style={{ borderLeft: '4px solid #2563eb' }}>
                    <div className="sd-stat-icon" style={{ color: '#2563eb' }}><i className="fas fa-code-branch"></i></div>
                    <div className="sd-stat-val">
                        <div style={{ fontWeight: 800, fontSize: 20 }}>3</div>
                    </div>
                    <div className="sd-stat-lbl">College Branches</div>
                </div>
            </div>

            <div className="sd-card" style={{ marginTop: 24 }}>
                <div className="sd-card-header">
                    <span><i className="fas fa-layer-group"></i> Departmental Overview</span>
                </div>
                <div className="sd-card-body">
                    <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
                        {departments.map((dept, i) => (
                            <div key={i} className="sd-card" style={{ padding: 20, background: '#f8fafc', borderLeft: '4px solid #7c3aed' }}>
                                <div style={{ fontWeight: 800, color: '#1e293b', fontSize: 16, marginBottom: 8 }}>{dept.name}</div>
                                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
                                    <i className="fas fa-user-tie" style={{ marginRight: 6 }}></i>
                                    HOD: {dept.head || 'To be assigned'}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed' }}>{dept.staffCount || 0} Employees</span>
                                    <button className="sd-link-btn" style={{ fontSize: 11 }}>Manage Dept</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrgStructure;
