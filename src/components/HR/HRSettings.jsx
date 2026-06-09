import React from 'react';
import toast from 'react-hot-toast';

const HRSettings = () => {
    return (
        <div className="sd-tab-fade">
            <div className="sd-page-header">
                <div>
                    <h2 className="sd-page-title">HR System Settings</h2>
                    <p className="sd-page-sub">Configure global HR parameters, statutory deduction rates, and module access control.</p>
                </div>
            </div>

            <div className="sd-two-col">
                <div className="sd-card">
                    <div className="sd-card-header">
                        <span><i className="fas fa-calculator"></i> Statutory Rates (Payroll)</span>
                    </div>
                    <div className="sd-card-body">
                        <div className="sd-modal-form">
                            <label>NAPSA Contribution Rate (%)</label>
                            <input type="number" defaultValue={5} />
                            <label>NHIMA Deduction (ZMW)</label>
                            <input type="number" defaultValue={50} />
                            <label>PAYE Tax Threshold (ZMW)</label>
                            <input type="number" defaultValue={5100} />
                            <button className="sd-btn sd-btn-primary" onClick={() => toast.success('Statutory settings updated')}>Save Rates</button>
                        </div>
                    </div>
                </div>

                <div className="sd-card">
                    <div className="sd-card-header">
                        <span><i className="fas fa-lock"></i> Module Visibility</span>
                    </div>
                    <div className="sd-card-body">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {[
                                { name: 'Self-Service Portal', enabled: true },
                                { name: 'Biometric Integration', enabled: false },
                                { name: 'Performance Scoring', enabled: true },
                                { name: 'External Job Postings', enabled: true }
                            ].map((mod, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < 3 ? '1px solid #f1f5f9' : 'none' }}>
                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{mod.name}</div>
                                    <div style={{
                                        width: 36,
                                        height: 20,
                                        background: mod.enabled ? '#10b981' : '#cbd5e1',
                                        borderRadius: 10,
                                        position: 'relative',
                                        cursor: 'pointer'
                                    }}>
                                        <div style={{
                                            width: 14,
                                            height: 14,
                                            background: 'white',
                                            borderRadius: '50%',
                                            position: 'absolute',
                                            top: 3,
                                            right: mod.enabled ? 3 : 'unset',
                                            left: mod.enabled ? 'unset' : 3
                                        }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HRSettings;
