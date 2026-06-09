import React, { useState } from 'react';
import toast from 'react-hot-toast';

const Communications = () => {
    const [messages, setMessages] = useState([
        { title: 'Public Holiday Notice', channel: 'Email', recipients: 'All Staff', status: 'Sent', date: '2026-05-15' },
        { title: 'New Attendance Policy', channel: 'SMS', recipients: 'Lecturers', status: 'Delivered', date: '2026-06-01' },
        { title: 'Staff Meeting Reminder', channel: 'Internal', recipients: 'Administrative Staff', status: 'Scheduled', date: '2026-06-10' }
    ]);

    return (
        <div className="sd-tab-fade">
            <div className="sd-page-header">
                <div>
                    <h2 className="sd-page-title">Communication Center</h2>
                    <p className="sd-page-sub">Broadcast announcements, send staff notices via Email/SMS, and manage internal messaging.</p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button className="sd-btn sd-btn-white" onClick={() => toast.success('Syncing with SMS gateway...')}>
                        <i className="fas fa-sms"></i> Send SMS
                    </button>
                    <button className="sd-btn sd-btn-primary">
                        <i className="fas fa-paper-plane"></i> New Announcement
                    </button>
                </div>
            </div>

            <div className="sd-stats-row">
                <div className="sd-stat-card" style={{ borderLeft: '4px solid #7c3aed' }}>
                    <div className="sd-stat-icon" style={{ color: '#7c3aed' }}><i className="fas fa-envelope-open-text"></i></div>
                    <div className="sd-stat-val">
                        <div style={{ fontWeight: 800, fontSize: 20 }}>1,240</div>
                    </div>
                    <div className="sd-stat-lbl">Emails Sent (MTD)</div>
                </div>
                <div className="sd-stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
                    <div className="sd-stat-icon" style={{ color: '#3b82f6' }}><i className="fas fa-comment-dots"></i></div>
                    <div className="sd-stat-val">
                        <div style={{ fontWeight: 800, fontSize: 20 }}>450</div>
                    </div>
                    <div className="sd-stat-lbl">SMS Broadcasts</div>
                </div>
                <div className="sd-stat-card" style={{ borderLeft: '4px solid #10b981' }}>
                    <div className="sd-stat-icon" style={{ color: '#10b981' }}><i className="fas fa-bullhorn"></i></div>
                    <div className="sd-stat-val">
                        <div style={{ fontWeight: 800, fontSize: 20 }}>12</div>
                    </div>
                    <div className="sd-stat-lbl">Active Notices</div>
                </div>
            </div>

            <div className="sd-card" style={{ marginTop: 24 }}>
                <div className="sd-card-header">
                    <span><i className="fas fa-stream"></i> Broadcast History</span>
                </div>
                <div className="sd-card-body">
                    <div className="table-responsive">
                        <table className="sd-table">
                            <thead>
                                <tr>
                                    <th>Announcement Title</th>
                                    <th>Channel</th>
                                    <th>Recipients</th>
                                    <th>Date</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {messages.map((msg, i) => (
                                    <tr key={i}>
                                        <td><strong>{msg.title}</strong></td>
                                        <td><span style={{ fontSize: 11, background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>{msg.channel}</span></td>
                                        <td>{msg.recipients}</td>
                                        <td>{msg.date}</td>
                                        <td>
                                            <span className={`sd-badge ${msg.status === 'Sent' || msg.status === 'Delivered' ? 'badge-green' : 'badge-gold'}`}>
                                                {msg.status}
                                            </span>
                                        </td>
                                        <td>
                                            <button className="sd-icon-btn"><i className="fas fa-redo"></i></button>
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

export default Communications;
