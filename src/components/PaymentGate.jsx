/**
 * PaymentGate — Locked-state UI component
 *
 * Renders a full-width locked panel when a student hasn't
 * paid at least 50% of their semester fees.
 *
 * Props:
 *   percentPaid      – number (0-100)
 *   amountPaid       – ZMW number
 *   amountRequired   – ZMW number (= 50% of annual fee)
 *   onGoToPayments   – callback to navigate to the Payments tab
 *   featureName      – string, e.g. "E-Learning Portal" or "Exam Results"
 */

import React from 'react';

const ZMW = (n) =>
    `K ${Number(n).toLocaleString('en-ZM', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function PaymentGate({
    percentPaid = 0,
    amountPaid = 0,
    amountRequired = 7500,
    onGoToPayments,
    featureName = 'this feature',
}) {
    const remaining = Math.max(0, amountRequired - amountPaid);
    const barWidth = Math.min(percentPaid, 100);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            padding: '40px 20px',
            animation: 'fadeIn 0.4s ease',
        }}>
            {/* ── Lock card ── */}
            <div style={{
                background: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '24px',
                padding: '48px 40px',
                maxWidth: '520px',
                width: '100%',
                boxShadow: '0 4px 32px rgba(0,0,0,0.06)',
                textAlign: 'center',
            }}>
                {/* Lock icon */}
                <div style={{
                    width: 88,
                    height: 88,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 28px',
                    fontSize: 36,
                    color: '#d97706',
                    boxShadow: '0 8px 24px rgba(217,119,6,0.2)',
                }}>
                    <i className="fas fa-lock" />
                </div>

                {/* Headline */}
                <h2 style={{
                    fontSize: '1.5rem',
                    fontWeight: 800,
                    color: '#1e293b',
                    marginBottom: 12,
                }}>
                    Access Restricted
                </h2>

                {/* Body message */}
                <p style={{
                    fontSize: '0.95rem',
                    color: '#64748b',
                    lineHeight: 1.7,
                    marginBottom: 32,
                    maxWidth: 380,
                    margin: '0 auto 32px',
                }}>
                    Your account balance is insufficient to access{' '}
                    <strong style={{ color: '#1e293b' }}>{featureName}</strong>.
                    Please clear at least <strong style={{ color: '#dc2626' }}>50%</strong> of your
                    semester fees to unlock this section.
                </p>

                {/* Progress section */}
                <div style={{
                    background: '#f8fafc',
                    borderRadius: 16,
                    padding: '20px 24px',
                    marginBottom: 28,
                    textAlign: 'left',
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: 10,
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#475569',
                    }}>
                        <span>Payment Progress</span>
                        <span style={{ color: barWidth >= 50 ? '#10b981' : '#dc2626' }}>
                            {barWidth.toFixed(1)}% of 50% required
                        </span>
                    </div>

                    {/* Progress bar */}
                    <div style={{
                        height: 12,
                        background: '#e2e8f0',
                        borderRadius: 8,
                        overflow: 'hidden',
                        marginBottom: 14,
                        position: 'relative',
                    }}>
                        {/* 50% gate marker */}
                        <div style={{
                            position: 'absolute',
                            left: '50%',
                            top: 0,
                            bottom: 0,
                            width: 2,
                            background: '#94a3b8',
                            zIndex: 2,
                        }} />
                        <div style={{
                            width: `${barWidth}%`,
                            height: '100%',
                            background: barWidth >= 50
                                ? 'linear-gradient(90deg, #10b981, #059669)'
                                : 'linear-gradient(90deg, #f59e0b, #ef4444)',
                            borderRadius: 8,
                            transition: 'width 0.5s ease',
                            position: 'relative',
                            zIndex: 1,
                        }} />
                    </div>

                    {/* Stats row */}
                    <div style={{ display: 'flex', gap: 16 }}>
                        <div style={{
                            flex: 1,
                            background: 'white',
                            borderRadius: 10,
                            padding: '10px 14px',
                            border: '1px solid #e2e8f0',
                        }}>
                            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Amount Paid
                            </div>
                            <div style={{ fontSize: 16, fontWeight: 800, color: '#10b981', marginTop: 2 }}>
                                {ZMW(amountPaid)}
                            </div>
                        </div>
                        <div style={{
                            flex: 1,
                            background: 'white',
                            borderRadius: 10,
                            padding: '10px 14px',
                            border: '1px solid #fca5a5',
                        }}>
                            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Still Needed
                            </div>
                            <div style={{ fontSize: 16, fontWeight: 800, color: '#dc2626', marginTop: 2 }}>
                                {remaining > 0 ? ZMW(remaining) : 'Cleared ✓'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Note about verification */}
                <p style={{
                    fontSize: 11.5,
                    color: '#94a3b8',
                    background: '#f1f5f9',
                    padding: '10px 16px',
                    borderRadius: 8,
                    marginBottom: 24,
                    lineHeight: 1.6,
                }}>
                    <i className="fas fa-info-circle" style={{ marginRight: 6, color: '#64748b' }} />
                    Payments must be <strong>verified</strong> by the Finance office before access is granted.
                    Once verified, access is updated automatically — no page refresh needed.
                </p>

                {/* CTA */}
                {onGoToPayments && (
                    <button
                        onClick={onGoToPayments}
                        style={{
                            background: 'linear-gradient(135deg, #1e3c72, #2a5298)',
                            color: 'white',
                            border: 'none',
                            padding: '14px 32px',
                            borderRadius: 12,
                            fontSize: 14,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 10,
                            boxShadow: '0 4px 12px rgba(30,60,114,0.3)',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                        }}
                        onMouseOver={e => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(30,60,114,0.4)';
                        }}
                        onMouseOut={e => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(30,60,114,0.3)';
                        }}
                    >
                        <i className="fas fa-credit-card" />
                        Make a Payment
                    </button>
                )}
            </div>
        </div>
    );
}
