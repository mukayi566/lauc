import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import {
    collection,
    onSnapshot,
    addDoc,
    updateDoc,
    doc,
    serverTimestamp,
    query,
    orderBy
} from 'firebase/firestore';
import toast from 'react-hot-toast';

const PayrollPremium = ({ employees, profile }) => {
    const [payrollRecords, setPayrollRecords] = useState([]);
    const [showPayModal, setShowPayModal] = useState(false);
    const [selectedEmp, setSelectedEmp] = useState(null);
    const [payForm, setPayForm] = useState({
        basicPay: 0,
        allowance: 0,
        bonus: 0,
        month: new Date().toISOString().slice(0, 7)
    });

    useEffect(() => {
        const unsub = onSnapshot(
            query(collection(db, 'payroll'), orderBy('createdAt', 'desc')),
            (snap) => setPayrollRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        );
        return () => unsub();
    }, []);

    // Basic Zambian Tax Logic (Simplified)
    const calculateDeductions = (gross) => {
        const napsa = Math.min(gross * 0.05, 1200); // 5% capped at ~1200
        const nhima = 50; // Flat 50 for NHIMA usually

        let paye = 0;
        const taxable = gross - napsa;
        if (taxable > 5100) {
            if (taxable <= 7100) paye = (taxable - 5100) * 0.20;
            else if (taxable <= 9200) paye = (2000 * 0.20) + (taxable - 7100) * 0.30;
            else paye = (2000 * 0.20) + (2100 * 0.30) + (taxable - 9200) * 0.37;
        }

        return { napsa, nhima, paye, net: gross - napsa - nhima - paye };
    };

    const handleProcessPayroll = async (e) => {
        e.preventDefault();
        if (!selectedEmp) return;

        const gross = Number(payForm.basicPay) + Number(payForm.allowance) + Number(payForm.bonus);
        const { napsa, nhima, paye, net } = calculateDeductions(gross);

        try {
            await addDoc(collection(db, 'payroll'), {
                employeeName: selectedEmp.name,
                employeeId: selectedEmp.id,
                basicPay: Number(payForm.basicPay),
                allowance: Number(payForm.allowance),
                bonus: Number(payForm.bonus),
                grossPay: gross,
                napsa,
                nhima,
                paye,
                netPay: net,
                month: payForm.month,
                status: 'Pending',
                processedBy: profile?.name || 'HR Officer',
                createdAt: serverTimestamp(),
                type: 'Staff'
            });
            setShowPayModal(false);
            toast.success('Payroll processed for ' + selectedEmp.name);
        } catch (err) {
            toast.error('Error processing payroll');
        }
    };

    return (
        <div className="sd-tab-fade">
            <div className="sd-page-header">
                <div>
                    <h2 className="sd-page-title">Payroll Management (Premium)</h2>
                    <p className="sd-page-sub">Handle PAYE, NAPSA, NHIMA, and net salary calculations with approval workflows.</p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button className="sd-btn sd-btn-white">
                        <i className="fas fa-file-export"></i> Bank Export (CSV)
                    </button>
                    <button className="sd-btn sd-btn-primary" onClick={() => setShowPayModal(true)}>
                        <i className="fas fa-plus"></i> Run Payroll
                    </button>
                </div>
            </div>

            <div className="sd-stats-row">
                <div className="sd-stat-card" style={{ borderLeft: '4px solid #10b981' }}>
                    <div className="sd-stat-icon" style={{ color: '#10b981' }}><i className="fas fa-money-check-alt"></i></div>
                    <div className="sd-stat-val">
                        <div style={{ fontWeight: 800, fontSize: 20 }}>ZMW {payrollRecords.filter(p => p.month === payForm.month).reduce((acc, p) => acc + (p.netPay || 0), 0).toLocaleString()}</div>
                    </div>
                    <div className="sd-stat-lbl">Total Net (Current Month)</div>
                </div>
                <div className="sd-stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
                    <div className="sd-stat-icon" style={{ color: '#3b82f6' }}><i className="fas fa-university"></i></div>
                    <div className="sd-stat-val">
                        <div style={{ fontWeight: 800, fontSize: 20 }}>ZMW {payrollRecords.filter(p => p.month === payForm.month).reduce((acc, p) => acc + (p.paye || 0), 0).toLocaleString()}</div>
                    </div>
                    <div className="sd-stat-lbl">Total PAYE Tax</div>
                </div>
                <div className="sd-stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
                    <div className="sd-stat-icon" style={{ color: '#f59e0b' }}><i className="fas fa-shield-alt"></i></div>
                    <div className="sd-stat-val">
                        <div style={{ fontWeight: 800, fontSize: 20 }}>ZMW {payrollRecords.filter(p => p.month === payForm.month).reduce((acc, p) => acc + (p.napsa || p.nhima || 0), 0).toLocaleString()}</div>
                    </div>
                    <div className="sd-stat-lbl">Statutory Deductions</div>
                </div>
            </div>

            <div className="sd-card" style={{ marginTop: 24 }}>
                <div className="sd-card-header">
                    <span><i className="fas fa-list"></i> Payroll Ledger</span>
                </div>
                <div className="sd-card-body">
                    <div className="table-responsive">
                        <table className="sd-table">
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>Month</th>
                                    <th>Gross</th>
                                    <th>PAYE</th>
                                    <th>NAPSA</th>
                                    <th>Net Pay</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payrollRecords.length === 0 ? (
                                    <tr><td colSpan={8} className="sd-empty">No payroll records found.</td></tr>
                                ) : payrollRecords.map(rec => (
                                    <tr key={rec.id}>
                                        <td><strong>{rec.employeeName}</strong></td>
                                        <td>{rec.month}</td>
                                        <td>{rec.grossPay?.toLocaleString() || rec.amount?.toLocaleString()}</td>
                                        <td>{rec.paye?.toLocaleString() || '—'}</td>
                                        <td>{rec.napsa?.toLocaleString() || '—'}</td>
                                        <td style={{ fontWeight: 800, color: '#059669' }}>{rec.netPay?.toLocaleString() || rec.amount?.toLocaleString()}</td>
                                        <td>
                                            <span className={`sd-badge ${rec.status === 'Approved' ? 'badge-green' : 'badge-gold'}`}>
                                                {rec.status}
                                            </span>
                                        </td>
                                        <td>
                                            <button className="sd-icon-btn" title="Download Payslip"><i className="fas fa-file-pdf"></i></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showPayModal && (
                <div className="sd-modal-overlay">
                    <div className="sd-modal">
                        <div className="sd-modal-head">
                            <h3>Run Payroll Calculation</h3>
                            <button className="sd-close-btn" onClick={() => setShowPayModal(false)}>&times;</button>
                        </div>
                        <div className="sd-modal-body">
                            <form onSubmit={handleProcessPayroll} className="sd-modal-form">
                                <label>Select Employee</label>
                                <select required onChange={e => {
                                    const emp = employees.find(x => x.id === e.target.value);
                                    setSelectedEmp(emp);
                                }}>
                                    <option value="">-- Choose Staff --</option>
                                    {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                </select>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <div>
                                        <label>Basic Salary (ZMW)</label>
                                        <input type="number" required value={payForm.basicPay} onChange={e => setPayForm({ ...payForm, basicPay: e.target.value })} />
                                    </div>
                                    <div>
                                        <label>Allowances (ZMW)</label>
                                        <input type="number" value={payForm.allowance} onChange={e => setPayForm({ ...payForm, allowance: e.target.value })} />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <div>
                                        <label>Bonus (ZMW)</label>
                                        <input type="number" value={payForm.bonus} onChange={e => setPayForm({ ...payForm, bonus: e.target.value })} />
                                    </div>
                                    <div>
                                        <label>Month</label>
                                        <input type="month" required value={payForm.month} onChange={e => setPayForm({ ...payForm, month: e.target.value })} />
                                    </div>
                                </div>

                                {selectedEmp && (
                                    <div style={{ marginTop: 15, padding: 15, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Summary for {selectedEmp.name}</div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                                            <span>Gross Pay:</span>
                                            <span style={{ fontWeight: 700 }}>ZMW {(Number(payForm.basicPay) + Number(payForm.allowance) + Number(payForm.bonus)).toLocaleString()}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 10, color: '#dc2626' }}>
                                            <span>Est. Deductions:</span>
                                            <span>- ZMW {(calculateDeductions(Number(payForm.basicPay) + Number(payForm.allowance) + Number(payForm.bonus)).paye + calculateDeductions(Number(payForm.basicPay) + Number(payForm.allowance) + Number(payForm.bonus)).napsa + 50).toLocaleString()}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 800, color: '#059669', paddingTop: 8, borderTop: '1px dashed #cbd5e1' }}>
                                            <span>Net Pay:</span>
                                            <span>ZMW {calculateDeductions(Number(payForm.basicPay) + Number(payForm.allowance) + Number(payForm.bonus)).net.toLocaleString()}</span>
                                        </div>
                                    </div>
                                )}

                                <button type="submit" className="sd-btn sd-btn-primary" style={{ width: '100%', marginTop: 20 }}>Finalize & Post Payroll</button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PayrollPremium;
