import React from 'react';
import Layout from '../components/Layout';

const TermsConditions = () => {
    return (
        <Layout>
            <div className="page-header" style={{ background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)', padding: '100px 0 60px', color: 'white', textAlign: 'center' }}>
                <div className="container">
                    <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>Terms & Conditions</h1>
                    <p style={{ fontSize: '1.2rem', opacity: 0.9 }}>Agreement governing your use of our services</p>
                </div>
            </div>

            <div className="section">
                <div className="container" style={{ maxWidth: '900px' }}>
                    <div className="content-card" style={{ background: 'white', padding: '40px', borderRadius: '15px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                        <p style={{ marginBottom: '25px', color: '#666', fontStyle: 'italic' }}>Last Updated: May 2026</p>

                        <h2 style={{ color: '#1e3c72', marginBottom: '20px' }}>1. Agreement to Terms</h2>
                        <p style={{ marginBottom: '25px', lineHeight: '1.8', color: '#444' }}>
                            By accessing or using the Fairview University College website and portals, you agree to be bound by these Terms and Conditions. If you disagree with any part of these terms, you may not access our services.
                        </p>

                        <h2 style={{ color: '#1e3c72', marginBottom: '20px' }}>2. Academic Integrity</h2>
                        <p style={{ marginBottom: '25px', lineHeight: '1.8', color: '#444' }}>
                            All students using our portal and E-Learning platform must adhere to the highest standards of academic integrity. Plagiarism, cheating, or any form of academic dishonesty is strictly prohibited and may lead to disciplinary action, including expulsion.
                        </p>

                        <h2 style={{ color: '#1e3c72', marginBottom: '20px' }}>3. User Accounts</h2>
                        <p style={{ marginBottom: '25px', lineHeight: '1.8', color: '#444' }}>
                            When you create an account with us, you must provide information that is accurate and current. You are responsible for safeguarding the password that you use to access the service and for any activities or actions under your password.
                        </p>

                        <h2 style={{ color: '#1e3c72', marginBottom: '20px' }}>4. Payment Terms</h2>
                        <p style={{ marginBottom: '25px', lineHeight: '1.8', color: '#444' }}>
                            Tuition fees must be paid in accordance with the university's payment schedule. Failure to pay fees may result in restricted access to portals, exams, and academic records. Refund policies are governed by the specific program agreements.
                        </p>

                        <h2 style={{ color: '#1e3c72', marginBottom: '20px' }}>5. Intellectual Property</h2>
                        <p style={{ marginBottom: '25px', lineHeight: '1.8', color: '#444' }}>
                            The content provided on the website and within the E-Learning platform, including text, graphics, logos, and course materials, is the property of Fairview University College and is protected by copyright and other intellectual property laws.
                        </p>

                        <h2 style={{ color: '#1e3c72', marginBottom: '20px' }}>6. Limitation of Liability</h2>
                        <p style={{ marginBottom: '25px', lineHeight: '1.8', color: '#444' }}>
                            In no event shall Fairview University College be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, or other intangible losses, resulting from your access to or use of our services.
                        </p>

                        <h2 style={{ color: '#1e3c72', marginBottom: '20px' }}>7. Changes to Terms</h2>
                        <p style={{ marginBottom: '25px', lineHeight: '1.8', color: '#444' }}>
                            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will providing notice of any significant changes by posting the new Terms on this page.
                        </p>

                        <h2 style={{ color: '#1e3c72', marginBottom: '20px' }}>8. Governing Law</h2>
                        <p style={{ marginBottom: '25px', lineHeight: '1.8', color: '#444' }}>
                            These Terms shall be governed and construed in accordance with the laws of Zambia, without regard to its conflict of law provisions.
                        </p>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default TermsConditions;
