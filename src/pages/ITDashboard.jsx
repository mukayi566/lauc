import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, limit, doc, updateDoc, setDoc } from 'firebase/firestore';
import '../dashboards.css';

const ITDashboard = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [stats, setStats] = useState({
        activeUsers: 0,
        supportTickets: 0,
        systemStatus: 'Optimal',
        lastBackup: '2 hours ago'
    });
    const [tickets, setTickets] = useState([
        { id: 'TIC-101', user: 'Mary Banda (Finance)', issue: 'Portal Access Denied', status: 'Open', priority: 'High', date: '2026-05-28' },
        { id: 'TIC-102', user: 'Dr. Sandala (Staff)', issue: 'Grade Upload Error', status: 'In Progress', priority: 'Medium', date: '2026-05-28' },
        { id: 'TIC-103', user: 'John Phiri (Student)', issue: 'Password Reset', status: 'Closed', priority: 'Low', date: '2026-05-27' },
    ]);

    const { currentUser, signOut } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    return (
        <div className="dashboard-container">
            {/* Sidebar */}
            <aside className="dashboard-sidebar">
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <i className="fas fa-microchip"></i>
                        <span>IT CONSOLE</span>
                    </div>
                </div>
                <nav className="sidebar-nav">
                    <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>
                        <i className="fas fa-th-large"></i> Overview
                    </button>
                    <button className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')}>
                        <i className="fas fa-users-cog"></i> User Management
                    </button>
                    <button className={activeTab === 'tickets' ? 'active' : ''} onClick={() => setActiveTab('tickets')}>
                        <i className="fas fa-ticket-alt"></i> Support Tickets
                    </button>
                    <button className={activeTab === 'systems' ? 'active' : ''} onClick={() => setActiveTab('systems')}>
                        <i className="fas fa-server"></i> System Health
                    </button>
                    <button className={activeTab === 'settings' ? 'active' : ''} onClick={() => setActiveTab('settings')}>
                        <i className="fas fa-cog"></i> Configuration
                    </button>
                </nav>
                <div className="sidebar-footer">
                    <button onClick={handleLogout} className="logout-btn">
                        <i className="fas fa-sign-out-alt"></i> Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="dashboard-main">
                <header className="dashboard-header">
                    <div className="header-search">
                        <i className="fas fa-search"></i>
                        <input type="text" placeholder="Search systems, users, tickets..." />
                    </div>
                    <div className="header-actions">
                        <div className="notification-bell">
                            <i className="fas fa-bell"></i>
                            <span className="badge">3</span>
                        </div>
                        <div className="user-profile">
                            <div className="user-info">
                                <span className="user-name">IT Administrator</span>
                                <span className="user-role">Superuser</span>
                            </div>
                            <div className="user-avatar">IT</div>
                        </div>
                    </div>
                </header>

                <div className="dashboard-content">
                    {activeTab === 'overview' && (
                        <>
                            <div className="stats-grid">
                                <div className="stat-card">
                                    <div className="stat-icon purple"><i className="fas fa-users"></i></div>
                                    <div className="stat-details">
                                        <h3>Active Users</h3>
                                        <p>1,248</p>
                                        <span className="trend positive"><i className="fas fa-arrow-up"></i> 12%</span>
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon blue"><i className="fas fa-ticket-alt"></i></div>
                                    <div className="stat-details">
                                        <h3>Open Tickets</h3>
                                        <p>14</p>
                                        <span className="trend negative"><i className="fas fa-arrow-down"></i> 5%</span>
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon green"><i className="fas fa-check-circle"></i></div>
                                    <div className="stat-details">
                                        <h3>System Uptime</h3>
                                        <p>99.9%</p>
                                        <span className="trend neutral">Stable</span>
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon orange"><i className="fas fa-database"></i></div>
                                    <div className="stat-details">
                                        <h3>Data Backup</h3>
                                        <p>Healthy</p>
                                        <span className="trend positive">Today 04:00</span>
                                    </div>
                                </div>
                            </div>

                            <div className="dashboard-grid">
                                <div className="content-card col-span-2">
                                    <div className="card-header">
                                        <h3>Recent Support Tickets</h3>
                                        <button className="btn-text">View All</button>
                                    </div>
                                    <div className="table-responsive">
                                        <table className="data-table">
                                            <thead>
                                                <tr>
                                                    <th>ID</th>
                                                    <th>User</th>
                                                    <th>Issue</th>
                                                    <th>Priority</th>
                                                    <th>Status</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {tickets.map(t => (
                                                    <tr key={t.id}>
                                                        <td>{t.id}</td>
                                                        <td>{t.user}</td>
                                                        <td>{t.issue}</td>
                                                        <td><span className={`priority-badge ${t.priority.toLowerCase()}`}>{t.priority}</span></td>
                                                        <td><span className={`status-badge ${t.status.toLowerCase().replace(' ', '-')}`}>{t.status}</span></td>
                                                        <td>
                                                            <button className="btn-icon"><i className="fas fa-eye"></i></button>
                                                            <button className="btn-icon"><i className="fas fa-comment"></i></button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="content-card">
                                    <div className="card-header">
                                        <h3>System Resource Usage</h3>
                                    </div>
                                    <div className="resource-list">
                                        {[
                                            { label: 'CPU Usage', value: 34, color: '#6d28d9' },
                                            { label: 'Memory', value: 68, color: '#3b82f6' },
                                            { label: 'Storage', value: 45, color: '#10b981' },
                                            { label: 'Network', value: 12, color: '#f59e0b' }
                                        ].map(r => (
                                            <div key={r.label} className="resource-item">
                                                <div className="resource-info">
                                                    <span>{r.label}</span>
                                                    <span>{r.value}%</span>
                                                </div>
                                                <div className="progress-bar">
                                                    <div className="progress-fill" style={{ width: `${r.value}%`, backgroundColor: r.color }}></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'users' && (
                        <div className="content-card">
                            <div className="card-header">
                                <h3>Portal Access Management</h3>
                                <button className="btn btn-primary"><i className="fas fa-plus"></i> Audit Logs</button>
                            </div>
                            <p className="section-desc">Manage authentication methods and security protocols for all department portals.</p>
                            <div className="settings-grid">
                                <div className="setting-control">
                                    <div className="setting-info">
                                        <h4>Multi-Factor Authentication</h4>
                                        <p>Enforce MFA for all administrative roles.</p>
                                    </div>
                                    <label className="switch">
                                        <input type="checkbox" defaultChecked />
                                        <span className="slider"></span>
                                    </label>
                                </div>
                                <div className="setting-control">
                                    <div className="setting-info">
                                        <h4>Auto-Lock Account</h4>
                                        <p>Lock account after 5 failed login attempts.</p>
                                    </div>
                                    <label className="switch">
                                        <input type="checkbox" defaultChecked />
                                        <span className="slider"></span>
                                    </label>
                                </div>
                                <div className="setting-control">
                                    <div className="setting-info">
                                        <h4>Password Policy</h4>
                                        <p>Require special characters and 8+ length.</p>
                                    </div>
                                    <label className="switch">
                                        <input type="checkbox" defaultChecked />
                                        <span className="slider"></span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <style>{`
                .priority-badge { font-size: 11px; padding: 2px 8px; border-radius: 4px; font-weight: 700; text-transform: uppercase; }
                .priority-badge.high { background: #fee2e2; color: #b91c1c; }
                .priority-badge.medium { background: #fef3c7; color: #b45309; }
                .priority-badge.low { background: #dcfce7; color: #15803d; }

                .status-badge { font-size: 11px; padding: 2px 8px; border-radius: 4px; font-weight: 600; }
                .status-badge.open { background: #e0f2fe; color: #0369a1; }
                .status-badge.in-progress { background: #ede9fe; color: #6d28d9; }
                .status-badge.closed { background: #f1f5f9; color: #475569; }

                .resource-list { display: flex; flexDirection: column; gap: 20px; padding: 10px 0; }
                .resource-info { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px; font-weight: 600; color: #64748b; }
                .progress-bar { height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden; }
                .progress-fill { height: 100%; transition: width 0.5s ease; }

                .settings-grid { display: grid; grid-template-columns: 1fr; gap: 20px; margin-top: 25px; }
                .setting-control { display: flex; justify-content: space-between; align-items: center; padding: 20px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; }
                .setting-info h4 { margin: 0 0 4px 0; font-size: 15px; color: #1e293b; }
                .setting-info p { margin: 0; font-size: 13px; color: #64748b; }

                /* Switch toggle */
                .switch { position: relative; display: inline-block; width: 44px; height: 24px; }
                .switch input { opacity: 0; width: 0; height: 0; }
                .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e1; transition: .4s; border-radius: 34px; }
                .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
                input:checked + .slider { background-color: #6d28d9; }
                input:checked + .slider:before { transform: translateX(20px); }
            `}</style>
        </div>
    );
};

export default ITDashboard;
