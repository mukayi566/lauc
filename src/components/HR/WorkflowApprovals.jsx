import React, { useState } from 'react';

const WorkflowApprovals = () => {
    const [approvals, setApprovals] = useState([
        { request: 'New Laptop Procurement', department: 'IT', requestedBy: 'John Phiri', cost: 'ZMW 12,500', stage: 'Finance Review' },
        { request: 'Q3 Recruitment Budget', department: 'HR', requestedBy: 'Grace Banda', cost: 'ZMW 85,000', stage: 'Principal Approval' },
        { request: 'Staff Transport Allowance', department: 'Admin', requestedBy: 'Sarah Lungu', cost: 'ZMW 3,200', stage: 'HR Review' }
    ]);

    return (
        <div className="sd-tab-fade">
            <div className="sd-page-header">
                <div>
                    <h2 className="sd-page-title">Workflow & Multi-level Approvals</h2>
                    <p className="sd-page-sub">Track assets, purchase requests, and recruitment approvals through defined chains.</p>
                </div>
                <button className="sd-btn sd-btn-white">
                    <i className="fas fa-cog"></i> Configure Workflow
                </button>
            </div>

            <div className="sd-stats-row" style={{ marginBottom: 24 }}>
                {[
                    { label: 'Pending Review', count: 8, color: '#f59e0b', icon: 'fa-hourglass-half' },
                    { label: 'Authorized', count: 42, color: '#10b981', icon: 'fa-check-double' },
                    { label: 'Flagged / Denied', count: 3, color: '#dc2626', icon: 'fa-times-circle' },
                    { label: 'Avg Approval Time', count: '1.4 Days', color: '#2563eb', icon: 'fa-tachometer-alt' }
                ].map((stat, i) => (
                    <div key={i} className="sd-card" style={{ padding: 20, borderLeft: `4px solid ${stat.color}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{stat.label}</div>
                                <div style={{ fontSize: 24, fontWeight: 800, color: '#1e293b', marginTop: 4 }}>{stat.count}</div>
                            </div>
                            <div style={{ color: stat.color, fontSize: 18 }}><i className={`fas ${stat.icon}`}></i></div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="sd-card">
                <div className="sd-card-header">
                    <span><i className="fas fa-tasks"></i> Pending Approval Queue</span>
                </div>
                <div className="sd-card-body">
                    <div className="table-responsive">
                        <table className="sd-table">
                            <thead>
                                <tr>
                                    <th>Request Details</th>
                                    <th>Department</th>
                                    <th>Value</th>
                                    <th>Current stage</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {approvals.map((app, i) => (
                                    <tr key={i}>
                                        <td>
                                            <div><strong>{app.request}</strong></div>
                                            <div style={{ fontSize: 11, color: '#64748b' }}>By: {app.requestedBy}</div>
                                        </td>
                                        <td>{app.department}</td>
                                        <td><strong>{app.cost}</strong></td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#7c3aed' }}>
                                                <i className="fas fa-spinner fa-spin"></i> {app.stage}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button className="sd-btn sd-btn-sm" style={{ background: '#d1fae5', color: '#065f46' }}>Approve</button>
                                                <button className="sd-btn sd-btn-sm" style={{ background: '#fee2e2', color: '#991b1b' }}>Reject</button>
                                            </div>
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

export default WorkflowApprovals;
