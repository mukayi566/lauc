import React from 'react';
import Layout from '../components/Layout';

const FeesTuition = () => {
    const currentYear = new Date().getFullYear();

    return (
        <Layout>
            {/* HERO */}
            <section className="hero">
                <div className="hero-content">
                    <div className="page-breadcrumb"><i className="fas fa-home"></i> Home / Fees & Tuition</div>
                    <h1>Fees & Tuition {currentYear}</h1>
                    <p>Transparent and affordable fee structures for all our academic programs.</p>
                    <div className="hero-buttons">
                        <a href="/admissions#apply" className="btn btn-primary">
                            <i className="fas fa-file-alt"></i> Apply Now
                        </a>
                        <a href="tel:+260977787114" className="btn btn-secondary">
                            <i className="fas fa-phone"></i> Contact Finance
                        </a>
                    </div>
                </div>

                {/* Seamless Curved Wave Divider */}
                <div className="hero-divider">
                    <svg viewBox="0 0 1440 120" preserveAspectRatio="none">
                        <path d="M0,96L120,101.3C240,107,480,117,720,117.3C960,117,1200,107,1320,101.3L1440,96L1440,120L1320,120C1200,120,960,120,720,120C480,120,240,120,120,120L0,120Z" fill="#ffffff"></path>
                    </svg>
                </div>
            </section>

            {/* FEES TABLE */}
            <section className="section">
                <div className="container">
                    <h2 className="section-title">Schedule of Fees</h2>
                    <p className="section-subtitle">Comprehensive breakdown of tuition and administrative costs</p>

                    <div className="fees-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', marginBottom: '40px' }}>
                        <div className="sd-card" style={{ padding: '30px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                            <h3 style={{ borderBottom: '2px solid var(--clr-blue)', paddingBottom: '15px', marginBottom: '20px', color: 'var(--clr-blue)' }}>Tuition Fees (Per Term)</h3>
                            <table className="fees-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                                        <th style={{ padding: '12px' }}>Programme</th>
                                        <th style={{ padding: '12px' }}>Full Time</th>
                                        <th style={{ padding: '12px' }}>Distance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={{ padding: '12px' }}>Teachers' Degree</td>
                                        <td style={{ padding: '12px' }}>K 4,000</td>
                                        <td style={{ padding: '12px' }}>K 4,500</td>
                                    </tr>
                                    <tr style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={{ padding: '12px' }}>Teachers' Diploma</td>
                                        <td style={{ padding: '12px' }}>K 3,000</td>
                                        <td style={{ padding: '12px' }}>K 3,500</td>
                                    </tr>
                                    <tr style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={{ padding: '12px' }}>Specialized Diplomas*</td>
                                        <td style={{ padding: '12px' }}>K 3,000</td>
                                        <td style={{ padding: '12px' }}>—</td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '12px' }}>Computer/Food Diplomas</td>
                                        <td colSpan="2" style={{ padding: '12px' }}>K 5,500 - K 6,000 / Sem</td>
                                    </tr>
                                </tbody>
                            </table>
                            <div style={{ marginTop: '20px', padding: '15px', background: '#f0f9ff', borderRadius: '8px' }}>
                                <small style={{ color: '#0369a1' }}>* Includes: Sales, Social Work, PR, Journalism, Counselling, Hospitality</small>
                            </div>
                        </div>

                        <div className="sd-card" style={{ padding: '30px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                            <h3 style={{ borderBottom: '2px solid var(--clr-blue)', paddingBottom: '15px', marginBottom: '20px', color: 'var(--clr-blue)' }}>General & Admin Fees</h3>
                            <ul style={{ listStyle: 'none', padding: 0 }}>
                                <li style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #eee' }}>
                                    <span>Registration (Diploma / Degree)</span><strong>K 200 / K 300</strong>
                                </li>
                                <li style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #eee' }}>
                                    <span>Boarding Fee (Per Term)</span><strong>ZMW 1,500</strong>
                                </li>
                                <li style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #eee' }}>
                                    <span>Transport (Per Term)</span><strong>ZMW 500</strong>
                                </li>
                                <li style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #eee' }}>
                                    <span>Educational Tour Fee</span><strong>ZMW 1,000</strong>
                                </li>
                                <li style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
                                    <span>Medical Fee / ID Card</span><strong>ZMW 200 / 150</strong>
                                </li>
                            </ul>
                            <div style={{ marginTop: '20px', padding: '15px', background: '#fff7ed', borderRadius: '8px' }}>
                                <small style={{ color: '#9a3412' }}>Note: Students must provide three (3) reams of A4 paper per year or Kwacha equivalent.</small>
                            </div>
                        </div>
                    </div>

                    <div className="payment-info" style={{ marginTop: '60px', padding: '40px', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                        <h3 style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <i className="fas fa-credit-card" style={{ color: 'var(--clr-blue)' }}></i> Payment Methods & Policies
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '40px' }}>
                            <div>
                                <h4 style={{ marginBottom: '15px', color: '#334155' }}>Payment Schedule</h4>
                                <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.7' }}>
                                    All fees are payable in cash or bank transfer every end of the month (a month in advance).
                                    Prompt payment ensures uninterrupted access to university resources and services.
                                </p>
                            </div>
                            <div>
                                <h4 style={{ marginBottom: '15px', color: '#334155' }}>Refund Policy</h4>
                                <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.7' }}>
                                    Registration fees are non-refundable. No refunds or discounts will be made for absence due to illness or holidays.
                                    Fees paid are strictly for the current academic session.
                                </p>
                            </div>
                            <div>
                                <h4 style={{ marginBottom: '15px', color: '#334155' }}>Accommodation</h4>
                                <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.7' }}>
                                    Safe and secure boarding facilities are available for students at ZMW 1,500 per term.
                                    Spaces are limited and allocated on a first-come, first-served basis.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* FINANCET CTA */}
            <section className="section" style={{ background: 'white' }}>
                <div className="container">
                    <div className="cta-box" style={{ background: 'var(--clr-blue)', color: 'white', padding: '60px', borderRadius: '24px', textAlign: 'center' }}>
                        <h2 style={{ fontSize: '2.5rem', marginBottom: '20px' }}>Questions about Financing?</h2>
                        <p style={{ fontSize: '1.1rem', marginBottom: '40px', opacity: 0.9 }}>
                            Our finance department is available to discuss payment plans and financial aid options.
                        </p>
                        <div className="cta-buttons" style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
                            <a href="tel:+260977787114" className="btn btn-outline-light" style={{ borderColor: 'white', color: 'white' }}>
                                <i className="fas fa-phone"></i> +260 977 787 114
                            </a>
                            <a href="mailto:fairviewuniversitycollege02@gmail.com" className="btn btn-secondary" style={{ background: 'white', color: 'var(--clr-blue)' }}>
                                <i className="fas fa-envelope"></i> Email Finance Office
                            </a>
                        </div>
                    </div>
                </div>
            </section>
        </Layout>
    );
};

export default FeesTuition;
