import React from 'react';
import Layout from '../components/Layout';

const PrivacyPolicy = () => {
    return (
        <Layout>
            <div className="page-header" style={{ background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)', padding: '100px 0 60px', color: 'white', textAlign: 'center' }}>
                <div className="container">
                    <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>Privacy Policy</h1>
                    <p style={{ fontSize: '1.2rem', opacity: 0.9 }}>How we protect and manage your personal data</p>
                </div>
            </div>

            <div className="section">
                <div className="container" style={{ maxWidth: '900px' }}>
                    <div className="content-card" style={{ background: 'white', padding: '40px', borderRadius: '15px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                        <p style={{ marginBottom: '25px', color: '#666', fontStyle: 'italic' }}>Last Updated: May 2026</p>

                        <h2 style={{ color: '#1e3c72', marginBottom: '20px' }}>1. Introduction</h2>
                        <p style={{ marginBottom: '25px', lineHeight: '1.8', color: '#444' }}>
                            Fairview University College ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our student and staff portals.
                        </p>

                        <h2 style={{ color: '#1e3c72', marginBottom: '20px' }}>2. Information We Collect</h2>
                        <p style={{ marginBottom: '15px', lineHeight: '1.8', color: '#444' }}>
                            We may collect personal information that you provide directly to us:
                        </p>
                        <ul style={{ marginBottom: '25px', paddingLeft: '20px', lineHeight: '1.8', color: '#444' }}>
                            <li>Contact information (name, email address, phone number, mailing address)</li>
                            <li>Academic records and application details</li>
                            <li>Identification documents (NRC, Passport)</li>
                            <li>Login credentials for our portals</li>
                            <li>Financial information for tuition payments</li>
                        </ul>

                        <h2 style={{ color: '#1e3c72', marginBottom: '20px' }}>3. How We Use Your Information</h2>
                        <p style={{ marginBottom: '15px', lineHeight: '1.8', color: '#444' }}>
                            We use the information we collect to:
                        </p>
                        <ul style={{ marginBottom: '25px', paddingLeft: '20px', lineHeight: '1.8', color: '#444' }}>
                            <li>Process your admission application</li>
                            <li>Manage your academic record and progress</li>
                            <li>Provide access to our E-Learning and student portals</li>
                            <li>Communicate important university updates and news</li>
                            <li>Process financial transactions and scholarship awards</li>
                            <li>Improve our website and services</li>
                        </ul>

                        <h2 style={{ color: '#1e3c72', marginBottom: '20px' }}>4. Data Security</h2>
                        <p style={{ marginBottom: '25px', lineHeight: '1.8', color: '#444' }}>
                            We implement appropriate technical and organizational security measures to protect the security of any personal information we process. However, please also remember that we cannot guarantee that the internet itself is 100% secure.
                        </p>

                        <h2 style={{ color: '#1e3c72', marginBottom: '20px' }}>5. Third-Party Services</h2>
                        <p style={{ marginBottom: '25px', lineHeight: '1.8', color: '#444' }}>
                            Our website uses Firebase (a Google service) for authentication and data storage. By using our services, you also agree to Google's Privacy Policy. We do not sell your personal data to third parties.
                        </p>

                        <h2 style={{ color: '#1e3c72', marginBottom: '20px' }}>6. Your Rights</h2>
                        <p style={{ marginBottom: '25px', lineHeight: '1.8', color: '#444' }}>
                            Depending on your location, you may have certain rights regarding your personal information, including the right to access, correct, or delete the data we hold about you.
                        </p>

                        <h2 style={{ color: '#1e3c72', marginBottom: '20px' }}>7. Contact Us</h2>
                        <p style={{ marginBottom: '25px', lineHeight: '1.8', color: '#444' }}>
                            If you have questions or comments about this policy, you may contact us at:
                            <br /><br />
                            <strong>Fairview University College</strong><br />
                            Plot 70A/77, off Zambezi Rd, Foxdale, Lusaka<br />
                            Email: fairviewuniversitycollege02@gmail.com<br />
                            Phone: +260 977 787 114
                        </p>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default PrivacyPolicy;
