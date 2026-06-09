import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';

const AuditLogs = () => {
    const [logs, setLogs] = useState([
        { user: 'Admin', action: 'Modified Payroll Record', target: 'PAY-2026-06-001', ip: '192.168.1.45', timestamp: '2 mins ago' },
        { user: 'HR Head', action: 'Approved Leave Request', target: 'John Doe', ip: '192.168.1.12', timestamp: '1 hour ago' },
        { user: 'Finance', action: 'Exported Payroll CSV', target: 'System', ip: '10.0.0.5', timestamp: '3 hours ago' },
        { user: 'IT Admin', action: 'Assigned Asset', target: 'Laptop ST-042', ip: '192.168.1.8', timestamp: 'Yesterday' }
    ]);

    return (
        <div className="sd-tab-fade">
            <div className="sd-page-header">
                <div>
                    <h2 className="sd-page-title">Compliance & Audit Trail</h2>
                    <p className="sd-page-sub">Monitor user activity logs, track data changes, and ensure HR compliance.</p>
                </div>
                <button className="sd-btn sd-btn-white">
                    <i className="fas fa-file-export"></i> Export Audit Report
                </button>
            </div>

            <div className="sd-card">
                <div className="sd-card-header">
                    <span><i className="fas fa-user-shield"></i> System Activity Log</span>
                    <div className="header-filters">
                        <select className="sd-input" style={{ width: 180, padding: '4px 8px' }}>
                            <option>All Activities</option>
                            <option>Payroll Changes</option>
                            <option>Asset Movements</option>
                            <option>Auth Events</option>
                        </select>
                    </div>
                </div>
                <div className="sd-card-body">
                    <div className="table-responsive">
                        <table className="sd-table">
                            <thead>
                                <tr>
                                    <th>Timestamp</th>
                                    <th>User</th>
                                    <th>Action</th>
                                    <th>Affected Object</th>
                                    <th>IP Address</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log, i) => (
                                    <tr key={i}>
                                        <td style={{ fontSize: 12, color: '#64748b' }}>{log.timestamp}</td>
                                        <td><strong>{log.user}</strong></td>
                                        <td>{log.action}</td>
                                        <td><code style={{ fontSize: 11, background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>{log.target}</code></td>
                                        <td style={{ fontSize: 11, color: '#94a3b8' }}>{log.ip}</td>
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

export default AuditLogs;
