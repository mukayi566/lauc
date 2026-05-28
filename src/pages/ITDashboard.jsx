import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, limit, doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import '../dashboards.css';
import itNetworkMap from '../assets/it_network_map.png';

const ITDashboard = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [stats, setStats] = useState({
        activeUsers: 1428,
        supportTickets: 14,
        systemStatus: 'Optimal',
        lastBackup: '2 hours ago',
        uptime: '99.99%',
        serverLoad: '28%'
    });

    const [tickets, setTickets] = useState([
        { id: 'TIC-101', user: 'Mary Banda (Finance)', issue: 'Portal Access Denied', status: 'Open', priority: 'High', date: '2026-05-28' },
        { id: 'TIC-102', user: 'Dr. Sandala (Staff)', issue: 'Grade Upload Error', status: 'In Progress', priority: 'Medium', date: '2026-05-28' },
        { id: 'TIC-103', user: 'John Phiri (Student)', issue: 'Password Reset', status: 'Closed', priority: 'Low', date: '2026-05-27' },
        { id: 'TIC-104', user: 'Alice Mumba (Registrar)', issue: 'Database Sync Failure', status: 'Open', priority: 'Critical', date: '2026-05-28' },
    ]);

    const [logs, setLogs] = useState([
        { id: 1, action: 'User Permissions Updated', officer: 'IT Admin', time: '10 mins ago', status: 'Success' },
        { id: 2, action: 'System Backup Initiated', officer: 'Auto-Task', time: '2 hours ago', status: 'Completed' },
        { id: 3, action: 'Security Patch v2.4 Applied', officer: 'System', time: '5 hours ago', status: 'Success' },
    ]);

    const { currentUser, signOut, changePassword } = useAuth();
    const navigate = useNavigate();

    const [profile, setProfile] = useState(null);
    const [showPassModal, setShowPassModal] = useState(false);
    const [passForm, setPassForm] = useState({ new: '', confirm: '' });
    const [updatingPass, setUpdatingPass] = useState(false);

    useEffect(() => {
        if (!currentUser) return;
        const fetchProfile = async () => {
            const d = await getDoc(doc(db, 'users', currentUser.uid));
            if (d.exists()) {
                const data = d.data();
                setProfile(data);
                if (data.mustChangePassword) setShowPassModal(true);
            }
        };
        fetchProfile();
    }, [currentUser]);

    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        if (passForm.new !== passForm.confirm) { toast.error("Passwords do not match"); return; }
        if (passForm.new.length < 6) { toast.error("Password too short"); return; }
        setUpdatingPass(true);
        try {
            await changePassword(passForm.new);
            await updateDoc(doc(db, 'users', currentUser.uid), {
                mustChangePassword: false,
                password: passForm.new,
                updatedAt: new Date()
            });
            setShowPassModal(false);
            toast.success("Security credentials updated!");
        } catch (err) {
            toast.error(err.message);
        } finally {
            setUpdatingPass(false);
        }
    };

    const handleLogout = async () => {
        await signOut();
        navigate('/it-login');
    };

    return (
        <div className="sd-shell it-theme">
            {showPassModal && (
                <div className="sd-modal-overlay">
                    <div className="sd-modal">
                        <div className="sd-modal-head">
                            <h3><i className="fas fa-shield-alt"></i> Security Update Required</h3>
                        </div>
                        <div className="sd-modal-body">
                            <p className="sd-muted" style={{ marginBottom: 20 }}>
                                You are using a temporary password. Please set a secure password to continue accessing the IT Console.
                            </p>
                            <form onSubmit={handleUpdatePassword}>
                                <div className="sd-form-group">
                                    <label className="sd-label">New Secure Password</label>
                                    <input
                                        type="password"
                                        className="sd-input"
                                        placeholder="••••••••"
                                        value={passForm.new}
                                        onChange={e => setPassForm({ ...passForm, new: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="sd-form-group">
                                    <label className="sd-label">Confirm New Password</label>
                                    <input
                                        type="password"
                                        className="sd-input"
                                        placeholder="••••••••"
                                        value={passForm.confirm}
                                        onChange={e => setPassForm({ ...passForm, confirm: e.target.value })}
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="sd-btn sd-btn-primary"
                                    style={{ width: '100%', marginTop: 10 }}
                                    disabled={updatingPass}
                                >
                                    {updatingPass ? <i className="fas fa-spinner fa-spin"></i> : 'Update Security Credentials'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Sidebar */}
            <aside className="sd-sidebar">
                <div className="sd-sidebar-header">
                    <div className="sd-sidebar-logo">
                        <div className="sd-logo-icon" style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}>
                            <i className="fas fa-microchip"></i>
                        </div>
                        <div>
                            <div className="sd-logo-title">IT CONSOLE</div>
                            <div className="sd-logo-sub">SYSTEM ADMIN</div>
                        </div>
                    </div>
                </div>

                <div className="sd-profile-pill" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)' }}>
                    <div className="sd-avatar" style={{ border: '2px solid rgba(255,255,255,0.2)' }}>
                        {profile?.name?.charAt(0) || 'IT'}
                    </div>
                    <div className="sd-profile-info" style={{ overflow: 'hidden' }}>
                        <div className="sd-profile-name">{profile?.name || 'IT Officer'}</div>
                        <div className="sd-profile-id">ID: {currentUser?.uid?.slice(0, 8)}</div>
                    </div>
                </div>

                <nav className="sd-nav">
                    <div className="sd-nav-group">Main Operations</div>
                    <button className={`sd-nav-link ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
                        <i className="fas fa-chart-line"></i> Dashboard {activeTab === 'overview' && <span className="sd-nav-indicator"></span>}
                    </button>
                    <button className={`sd-nav-link ${activeTab === 'infrastructure' ? 'active' : ''}`} onClick={() => setActiveTab('infrastructure')}>
                        <i className="fas fa-network-wired"></i> Live Infrastructure {activeTab === 'infrastructure' && <span className="sd-nav-indicator"></span>}
                    </button>
                    <button className={`sd-nav-link ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
                        <i className="fas fa-user-shield"></i> Access Control {activeTab === 'users' && <span className="sd-nav-indicator"></span>}
                    </button>
                    <button className={`sd-nav-link ${activeTab === 'tickets' ? 'active' : ''}`} onClick={() => setActiveTab('tickets')}>
                        <i className="fas fa-ticket-alt"></i> Support Tickets {activeTab === 'tickets' && <span className="sd-nav-indicator"></span>}
                    </button>

                    <div className="sd-nav-group" style={{ marginTop: 20 }}>System Maintenance</div>
                    <button className={`sd-nav-link ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveTab('logs')}>
                        <i className="fas fa-terminal"></i> Audit Logs
                    </button>
                    <button className={`sd-nav-link ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
                        <i className="fas fa-sliders-h"></i> System Settings
                    </button>
                </nav>

                <div className="sd-sidebar-footer">
                    <button onClick={handleLogout} className="sd-nav-link sd-logout" style={{ width: '100%', cursor: 'pointer', border: 'none', background: 'none' }}>
                        <i className="fas fa-power-off"></i> Terminate Session
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="sd-body">
                <header className="sd-topbar">
                    <button className="sd-hamburger"><i className="fas fa-bars"></i></button>
                    <div className="sd-topbar-title">
                        {activeTab.charAt(0).toUpperCase() + activeTab.slice(1).replace('-', ' ')}
                    </div>

                    <div className="sd-topbar-right">
                        <div className="header-badge" style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f0fdf4', padding: '6px 12px', borderRadius: 20, border: '1px solid #bbf7d0', marginRight: 15 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }}></span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#047857' }}>All Systems Nominal</span>
                        </div>
                        <div className="sd-icon-btn">
                            <i className="fas fa-search"></i>
                        </div>
                        <div className="sd-icon-btn">
                            <i className="fas fa-bell"></i>
                            <span className="sd-notif-dot">4</span>
                        </div>
                        <div className="sd-topbar-avatar" style={{ border: '2px solid var(--primary-light)' }}>
                            {profile?.name?.charAt(0) || 'IT'}
                        </div>
                    </div>
                </header>

                <div className="sd-main">
                    <div className="sd-tab-fade">
                        {activeTab === 'overview' && (
                            <>
                                <div className="sd-welcome-banner" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <div>
                                        <h1 className="sd-welcome-h1">System Console Active</h1>
                                        <p className="sd-welcome-p">Lazarun v4.2 stable • Total Throughput: 4.8 TB/s • Security Level: Shielded</p>
                                    </div>
                                    <div className="sd-welcome-actions">
                                        <button className="sd-btn sd-btn-white"><i className="fas fa-shield-virus"></i> Security Scan</button>
                                        <button className="sd-btn sd-btn-glass"><i className="fas fa-download"></i> Daily Report</button>
                                    </div>
                                </div>

                                <div className="sd-stats-row">
                                    <div className="sd-stat-card card-glow-it">
                                        <div className="sd-stat-icon" style={{ background: 'rgba(55, 48, 163, 0.1)', color: '#3730a3' }}><i className="fas fa-microchip"></i></div>
                                        <div className="sd-stat-val">{stats.activeUsers}</div>
                                        <div className="sd-stat-lbl">Active Connections</div>
                                    </div>
                                    <div className="sd-stat-card card-glow-it">
                                        <div className="sd-stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}><i className="fas fa-server"></i></div>
                                        <div className="sd-stat-val">{stats.uptime}</div>
                                        <div className="sd-stat-lbl">SLA Performance</div>
                                    </div>
                                    <div className="sd-stat-card card-glow-it">
                                        <div className="sd-stat-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}><i className="fas fa-exclamation-triangle"></i></div>
                                        <div className="sd-stat-val">0</div>
                                        <div className="sd-stat-lbl">System Faults</div>
                                    </div>
                                    <div className="sd-stat-card card-glow-it">
                                        <div className="sd-stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}><i className="fas fa-hdd"></i></div>
                                        <div className="sd-stat-val">94.2%</div>
                                        <div className="sd-stat-lbl">Storage Health</div>
                                    </div>
                                </div>

                                <div className="sd-two-col">
                                    <div className="sd-card">
                                        <div className="sd-card-header">
                                            <span><i className="fas fa-ticket-alt" style={{ marginRight: 8 }}></i> Incident Response Queue</span>
                                            <button className="sd-link-btn" onClick={() => setActiveTab('tickets')}>Process All</button>
                                        </div>
                                        <div className="sd-card-body" style={{ padding: 0 }}>
                                            <div className="it-table-wrapper">
                                                <table className="it-data-table">
                                                    <thead>
                                                        <tr>
                                                            <th>Origin</th>
                                                            <th>Incident</th>
                                                            <th>Level</th>
                                                            <th>Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {tickets.map(t => (
                                                            <tr key={t.id}>
                                                                <td>
                                                                    <div style={{ fontWeight: 600 }}>{t.user.split('(')[0]}</div>
                                                                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{t.user.match(/\(([^)]+)\)/)?.[1] || 'Unknown'}</div>
                                                                </td>
                                                                <td style={{ fontSize: 13 }}>{t.issue}</td>
                                                                <td>
                                                                    <span className={`it-badge it-badge-priority-${t.priority.toLowerCase()}`}>
                                                                        {t.priority}
                                                                    </span>
                                                                </td>
                                                                <td>
                                                                    <span className={`it-badge it-badge-status-${t.status.toLowerCase().replace(' ', '-')}`}>
                                                                        {t.status}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="sd-card">
                                        <div className="sd-card-header">
                                            <span><i className="fas fa-microchip" style={{ marginRight: 8 }}></i> Real-time Telemetry</span>
                                            <i className="fas fa-ellipsis-v" style={{ cursor: 'pointer', color: '#94a3b8' }}></i>
                                        </div>
                                        <div className="sd-card-body">
                                            <div className="resource-monitor">
                                                <div className="resource-item">
                                                    <div className="resource-header">
                                                        <span>Core Utilization</span>
                                                        <span className="res-val">28.4%</span>
                                                    </div>
                                                    <div className="res-bar"><div className="res-fill" style={{ width: '28.4%', background: 'linear-gradient(90deg, #3730a3, #4f46e5)' }}></div></div>
                                                </div>
                                                <div className="resource-item" style={{ marginTop: 20 }}>
                                                    <div className="resource-header">
                                                        <span>Elastic Pool Memory</span>
                                                        <span className="res-val">42.1%</span>
                                                    </div>
                                                    <div className="res-bar"><div className="res-fill" style={{ width: '42.1%', background: 'linear-gradient(90deg, #7c3aed, #8b5cf6)' }}></div></div>
                                                </div>
                                                <div className="resource-item" style={{ marginTop: 20 }}>
                                                    <div className="resource-header">
                                                        <span>CDN Bandwidth Usage</span>
                                                        <span className="res-val">1.2 Gbps</span>
                                                    </div>
                                                    <div className="res-bar"><div className="res-fill" style={{ width: '15%', background: 'linear-gradient(90deg, #10b981, #34d399)' }}></div></div>
                                                </div>
                                            </div>

                                            <div className="health-check-list" style={{ marginTop: 25, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                                <div className="health-item"><i className="fas fa-check-circle text-success"></i><span>Firebase Sync</span></div>
                                                <div className="health-item"><i className="fas fa-check-circle text-success"></i><span>SSL Active</span></div>
                                                <div className="health-item"><i className="fas fa-check-circle text-success"></i><span>API Online</span></div>
                                                <div className="health-item"><i className="fas fa-clock text-warning"></i><span>Backup Pending</span></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {activeTab === 'infrastructure' && (
                            <div className="sd-card" style={{ background: '#0a0a0f', border: '1px solid #1e1b4b' }}>
                                <div className="sd-card-header" style={{ background: 'rgba(255,255,255,0.05)', color: 'white', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                    <h3><i className="fas fa-project-diagram"></i> Global Network Topology</h3>
                                    <div style={{ display: 'flex', gap: 10 }}>
                                        <button className="sd-btn sd-btn-glass sd-btn-sm">Reload Nodes</button>
                                        <button className="sd-btn sd-btn-primary sd-btn-sm">Ping All</button>
                                    </div>
                                </div>
                                <div className="sd-card-body" style={{ padding: 0, position: 'relative', minHeight: 600 }}>
                                    <img
                                        src={itNetworkMap}
                                        alt="Infrastructure Map"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'brightness(0.9) contrast(1.1)' }}
                                    />
                                    <div style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(0,0,0,0.6)', padding: 15, borderRadius: 10, backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}>
                                        <h4 style={{ fontSize: 13, marginBottom: 10 }}>Node Status</h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            <div style={{ fontSize: 11, display: 'flex', justifyContent: 'space-between', gap: 20 }}><span>Core Switch Alfa:</span> <span style={{ color: '#10b981' }}>ONLINE</span></div>
                                            <div style={{ fontSize: 11, display: 'flex', justifyContent: 'space-between', gap: 20 }}><span>Database Cluster:</span> <span style={{ color: '#10b981' }}>ONLINE</span></div>
                                            <div style={{ fontSize: 11, display: 'flex', justifyContent: 'space-between', gap: 20 }}><span>Student Gateway:</span> <span style={{ color: '#10b981' }}>STABLE</span></div>
                                            <div style={{ fontSize: 11, display: 'flex', justifyContent: 'space-between', gap: 20 }}><span>Intrusion Alert:</span> <span style={{ color: '#f59e0b' }}>CLEAR</span></div>
                                        </div>
                                    </div>
                                    <div className="it-map-overlay-bottom" style={{ position: 'absolute', bottom: 20, left: 20, right: 20, display: 'flex', gap: 15 }}>
                                        <div style={{ flex: 1, background: 'rgba(55, 48, 163, 0.2)', padding: '10px 15px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}>
                                            <div style={{ fontSize: 10, textTransform: 'uppercase', marginBottom: 4, opacity: 0.7 }}>Active Peer Connections</div>
                                            <div style={{ fontSize: 18, fontWeight: 800 }}>4,129 <small style={{ fontSize: 11, fontWeight: 400 }}>Peak Observed</small></div>
                                        </div>
                                        <div style={{ flex: 1, background: 'rgba(16, 185, 129, 0.2)', padding: '10px 15px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}>
                                            <div style={{ fontSize: 10, textTransform: 'uppercase', marginBottom: 4, opacity: 0.7 }}>Global Latency</div>
                                            <div style={{ fontSize: 18, fontWeight: 800 }}>24ms <small style={{ fontSize: 11, fontWeight: 400 }}>Optimal</small></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'users' && (
                            <div className="sd-card">
                                <div className="sd-card-header">
                                    <h3><i className="fas fa-user-shield"></i> Global Access & Security Policies</h3>
                                    <button className="sd-btn sd-btn-primary sd-btn-sm"><i className="fas fa-plus"></i> New Policy</button>
                                </div>
                                <div className="sd-card-body">
                                    <div className="it-policy-grid">
                                        {[
                                            { title: 'Multi-Factor Auth', desc: 'Require biometric or TOTP for admin roles', icon: 'fa-fingerprint', color: '#6366f1' },
                                            { title: 'Intrusion Detection', desc: 'Auto-block IPs after failed attempts', icon: 'fa-shield-virus', color: '#ef4444' },
                                            { title: 'Database Encryption', desc: 'AES-256 encryption at rest', icon: 'fa-lock', color: '#10b981' },
                                            { title: 'Session Timeout', desc: 'Auto-logout after 30 mins inactive', icon: 'fa-user-clock', color: '#f59e0b' }
                                        ].map(policy => (
                                            <div key={policy.title} className="policy-item">
                                                <div className="policy-icon" style={{ background: `${policy.color}15`, color: policy.color }}>
                                                    <i className={`fas ${policy.icon}`}></i>
                                                </div>
                                                <div className="policy-info">
                                                    <h4>{policy.title}</h4>
                                                    <p>{policy.desc}</p>
                                                </div>
                                                <label className="it-switch">
                                                    <input type="checkbox" defaultChecked />
                                                    <span className="it-slider"></span>
                                                </label>
                                            </div>
                                        ))}
                                    </div>

                                    <div style={{ marginTop: 40 }}>
                                        <h4>Authentication Methods Breakdown</h4>
                                        <div className="auth-chart-placeholder">
                                            <div className="auth-bar-group">
                                                <div className="auth-label">SSO (SAML)</div>
                                                <div className="auth-bar-w"><div className="auth-bar-f" style={{ width: '85%', background: '#6366f1' }}></div></div>
                                                <div className="auth-pct">85%</div>
                                            </div>
                                            <div className="auth-bar-group">
                                                <div className="auth-label">OAuth 2.0</div>
                                                <div className="auth-bar-w"><div className="auth-bar-f" style={{ width: '62%', background: '#8b5cf6' }}></div></div>
                                                <div className="auth-pct">62%</div>
                                            </div>
                                            <div className="auth-bar-group">
                                                <div className="auth-label">Local Auth</div>
                                                <div className="auth-bar-w"><div className="auth-bar-f" style={{ width: '12%', background: '#f59e0b' }}></div></div>
                                                <div className="auth-pct">12%</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {(activeTab === 'systems' || activeTab === 'tickets' || activeTab === 'logs' || activeTab === 'settings') && (
                            <div className="sd-card" style={{ textAlign: 'center', padding: '100px 40px' }}>
                                <div className="empty-state-icon" style={{ fontSize: 64, color: '#e2e8f0', marginBottom: 20 }}>
                                    <i className="fas fa-tools"></i>
                                </div>
                                <h3 style={{ fontSize: 20, color: '#1e293b' }}>Maintenance in Progress</h3>
                                <p style={{ color: '#64748b', maxWidth: 400, margin: '10px auto' }}>
                                    The <b>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</b> module is currently being optimized for better performance.
                                </p>
                                <button className="sd-btn sd-btn-ghost" onClick={() => setActiveTab('overview')} style={{ marginTop: 24 }}>
                                    Take me back to Overview
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <style>{`
                .it-theme {
                    /* Variable overrides for specific IT feel if needed */
                }

                .it-table-wrapper {
                    width: 100%;
                    overflow-x: auto;
                }

                .it-data-table {
                    width: 100%;
                    border-collapse: collapse;
                }

                .it-data-table th {
                    text-align: left;
                    padding: 14px 22px;
                    background: #f8fafc;
                    font-size: 11px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    color: #64748b;
                    border-bottom: 1px solid #f1f5f9;
                }

                .it-data-table td {
                    padding: 16px 22px;
                    border-bottom: 1px solid #f8fafc;
                    color: #334155;
                    vertical-align: middle;
                }

                .it-data-table tr:hover td {
                    background: #fcfdfe;
                }

                .it-badge {
                    display: inline-flex;
                    padding: 4px 10px;
                    border-radius: 6px;
                    font-size: 11px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .it-badge-priority-critical { background: #fee2e2; color: #b91c1c; }
                .it-badge-priority-high { background: #fff7ed; color: #c2410c; }
                .it-badge-priority-medium { background: #f0f9ff; color: #0369a1; }
                .it-badge-priority-low { background: #f1f5f9; color: #475569; }

                .it-badge-status-open { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
                .it-badge-status-in-progress { background: #fef9c3; color: #a16207; border: 1px solid #fef08a; }
                .it-badge-status-closed { background: #f1f5f9; color: #64748b; }

                .resource-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 13px; font-weight: 600; color: #475569; }
                .res-val { font-family: 'JetBrains Mono', 'Courier New', monospace; color: #1e1b4b; }
                .res-bar { height: 10px; background: #f1f5f9; border-radius: 5px; overflow: hidden; }
                .res-fill { height: 100%; border-radius: 5px; transition: width 1s cubic-bezier(0.4, 0, 0.2, 1); }

                .health-item { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; font-size: 12px; font-weight: 500; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
                .text-success { color: #10b981; }
                .text-warning { color: #f59e0b; }

                .it-policy-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; margin-top: 20px; }
                .policy-item { display: flex; align-items: center; gap: 16px; padding: 20px; background: #fcfdfe; border: 1px solid #f1f5f9; border-radius: 12px; transition: all 0.2s; }
                .policy-item:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.04); border-color: #3730a3; }
                .policy-icon { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
                .policy-info { flex: 1; }
                .policy-info h4 { margin: 0 0 4px 0; font-size: 14px; color: #1e293b; }
                .policy-info p { margin: 0; font-size: 12px; color: #64748b; }

                /* Switch toggle */
                .it-switch { position: relative; display: inline-block; width: 40px; height: 22px; }
                .it-switch input { opacity: 0; width: 0; height: 0; }
                .it-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #e2e8f0; transition: .4s; border-radius: 34px; }
                .it-slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
                input:checked + .it-slider { background-color: #3730a3; }
                input:checked + .it-slider:before { transform: translateX(18px); }

                .auth-chart-placeholder { margin-top: 20px; display: flex; flex-direction: column; gap: 15px; }
                .auth-bar-group { display: flex; align-items: center; gap: 15px; }
                .auth-label { width: 120px; font-size: 13px; color: #64748b; }
                .auth-bar-w { flex: 1; height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden; }
                .auth-bar-f { height: 100%; border-radius: 4px; }
                .auth-pct { width: 40px; font-size: 12px; font-weight: 700; color: #1e293b; text-align: right; }

                @keyframes pulse-custom {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.05); opacity: 0.8; }
                    100% { transform: scale(1); opacity: 1; }
                }
                
                .sd-notif-dot {
                    animation: pulse-custom 2s infinite;
                }
            `}</style>
        </div>
    );
};

export default ITDashboard;
