import React, { useState } from 'react';

const Benefits = () => {
    const [benefits, setBenefits] = useState([
        { name: 'Medical Insurance', provider: 'Madison Health', coverage: 'Full Family', employees: 42 },
        { name: 'Pension Contribution', provider: 'NAPSA / Private Fund', coverage: 'Statutory + 5%', employees: 110 },
        { name: 'Housing Allowance', provider: 'Internal', coverage: 'Role Based', employees: 15 },
        { name: 'Education Grant', provider: 'Fairview University', coverage: '50% Tuition Discount', employees: 8 }
    ]);

    return (
        <div className="sd-tab-fade">
            <div className="sd-page-header">
                <div>
                    <h2 className="sd-page-title">Employee Benefits & Welfare</h2>
                    <p className="sd-page-sub">Manage medical insurance, pension contributions, and staff welfare programs.</p>
                </div>
                <button className="sd-btn sd-btn-primary">
                    <i className="fas fa-plus"></i> Add Benefit Scheme
                </button>
            </div>

            <div className="sd-stats-row">
                <div className="sd-stat-card" style={{ borderLeft: '4px solid #10b981' }}>
                    <div className="sd-stat-icon" style={{ color: '#10b981' }}><i className="fas fa-hand-holding-heart"></i></div>
                    <div className="sd-stat-val">
                        <div style={{ fontWeight: 800, fontSize: 20 }}>ZMW 45,000</div>
                    </div>
                    <div className="sd-stat-lbl">Monthly Benefit Cost</div>
                </div>
                <div className="sd-stat-card" style={{ borderLeft: '4px solid #2563eb' }}>
                    <div className="sd-stat-icon" style={{ color: '#2563eb' }}><i className="fas fa-users"></i></div>
                    <div className="sd-stat-val">
                        <div style={{ fontWeight: 800, fontSize: 20 }}>92%</div>
                    </div>
                    <div className="sd-stat-lbl">Staff Enrollment</div>
                </div>
                <div className="sd-stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
                    <div className="sd-stat-icon" style={{ color: '#f59e0b' }}><i className="fas fa-gift"></i></div>
                    <div className="sd-stat-val">
                        <div style={{ fontWeight: 800, fontSize: 20 }}>4</div>
                    </div>
                    <div className="sd-stat-lbl">Active Programs</div>
                </div>
            </div>

            <div className="sd-card" style={{ marginTop: 24 }}>
                <div className="sd-card-header">
                    <span><i className="fas fa-heartbeat"></i> Active Benefit Schemes</span>
                </div>
                <div className="sd-card-body">
                    <div className="table-responsive">
                        <table className="sd-table">
                            <thead>
                                <tr>
                                    <th>Scheme Name</th>
                                    <th>Provider</th>
                                    <th>Coverage Details</th>
                                    <th>Enrolled Employees</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {benefits.map((ben, i) => (
                                    <tr key={i}>
                                        <td><strong>{ben.name}</strong></td>
                                        <td>{ben.provider}</td>
                                        <td>{ben.coverage}</td>
                                        <td>{ben.employees}</td>
                                        <td><span className="sd-badge badge-green">Active</span></td>
                                        <td>
                                            <button className="sd-btn sd-btn-white sd-btn-sm">Modify</button>
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

export default Benefits;
