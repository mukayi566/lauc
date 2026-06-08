import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const Admissions = () => {
  const { currentUser } = useAuth();
  const [alert, setAlert] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [nrcUrl, setNrcUrl] = useState('');
  const [resultsUrl, setResultsUrl] = useState('');
  const [nrcFileName, setNrcFileName] = useState('');
  const [resultsFileName, setResultsFileName] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoFileName, setPhotoFileName] = useState('');
  const [age, setAge] = useState(25); // Default to adult
  const formRef = useRef(null);

  // Generate dynamic intake options (Current year and next year, Jan/July)
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  const intakes = [
    `January ${currentYear}`,
    `July ${currentYear}`,
    `January ${nextYear}`,
    `July ${nextYear}`
  ];

  // Pre-fill email and name if user is logged in
  useEffect(() => {
    if (currentUser && formRef.current) {
      if (!formRef.current.email.value) formRef.current.email.value = currentUser.email || '';
      if (currentUser.displayName) {
        const names = currentUser.displayName.split(' ');
        if (!formRef.current.firstName.value) formRef.current.firstName.value = names[0] || '';
        if (!formRef.current.lastName.value && names.length > 1) formRef.current.lastName.value = names.slice(1).join(' ') || '';
      }
    }
  }, [currentUser]);

  const openWidget = (type) => {
    window.cloudinary.openUploadWidget(
      {
        cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
        uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
        sources: ['local', 'url'],
        multiple: false,
        resourceType: 'auto', // Important for PDF support
      },
      (error, result) => {
        if (!error && result && result.event === "success") {
          const url = result.info.secure_url;
          const name = result.info.original_filename + '.' + result.info.format;
          if (type === 'nrc') {
            setNrcUrl(url);
            setNrcFileName(name);
            toast.success('NRC/Passport uploaded!');
          } else if (type === 'results') {
            setResultsUrl(url);
            setResultsFileName(name);
            toast.success('Academic Results uploaded!');
          } else {
            setPhotoUrl(url);
            setPhotoFileName(name);
            toast.success('Passport Photos uploaded!');
          }
        }
      }
    );
  };

  // Scroll to apply form if hash present
  useEffect(() => {
    if (window.location.hash === '#apply') {
      const el = document.getElementById('apply');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setAlert(null);

    try {
      const formData = new FormData(formRef.current);
      const data = Object.fromEntries(formData.entries());

      // Handle file uploads (Cloudinary URLs already in state)
      if (!nrcUrl || !resultsUrl || !photoUrl) {
        throw new Error('Please upload all required documents (NRC, Results, and Passport Photo).');
      }

      data.nrcPassportUrl = nrcUrl;
      data.academicResultsUrl = resultsUrl;
      data.photoUrl = photoUrl;

      // Remove File objects before saving to Firestore
      delete data.nrcPassportFile;
      delete data.academicResultsFile;

      // Add metadata
      data.submittedAt = serverTimestamp();
      data.date = new Date().toISOString().split('T')[0]; // For easy filtering in dashboard
      data.status = 'Pending';
      data.name = `${data.firstName} ${data.lastName}`; // Concat name for dashboard search
      data.id = `APP-${Date.now().toString().slice(-6)}`; // Simple unique ID

      // Save to 'applications' collection
      await addDoc(collection(db, 'applications'), data);

      formRef.current.reset();
      setNrcUrl('');
      setResultsUrl('');
      setPhotoUrl('');
      setNrcFileName('');
      setResultsFileName('');
      setPhotoFileName('');
      const msg = '🎉 Application submitted successfully! We will contact you within 2–3 business days.';
      setAlert({ type: 'success', msg });
      toast.success(msg);
    } catch (err) {
      console.error('Submission error:', err);
      const msg = '❌ Failed to submit application. Please check your connection and try again.';
      setAlert({ type: 'error', msg });
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      {/* HERO */}
      <section className="hero" style={{ 
        backgroundImage: `linear-gradient(rgba(30, 60, 114, 0.8), rgba(30, 60, 114, 0.8)), url('/admissions-image.jpeg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center 20%',
        position: 'relative'
      }}>
        <div className="hero-content">
          <div className="page-breadcrumb"><i className="fas fa-home"></i> Home / Admissions</div>
          <h1>Admissions 2026</h1>
          <p>Information about the admissions process at Fairview University College</p>
          <div className="hero-buttons">
            <a href="#apply" className="btn btn-primary">
              <i className="fas fa-file-alt"></i> Apply Online
            </a>
            <a href="/ApplicationForm.pdf" download className="btn btn-secondary">
              <i className="fas fa-download"></i> Download Offline Form
            </a>
            <a href="#requirements" className="btn btn-ghost" style={{ color: 'white', border: '1px solid white' }}>
              <i className="fas fa-list-check"></i> View Requirements
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

      {/* REQUIREMENTS */}
      <section className="section" id="requirements">
        <div className="container">
          <h2 className="section-title">Admission Requirements</h2>
          <p className="section-subtitle">Meet the eligibility criteria for our programs</p>
          <div className="requirements-grid">
            {[
              {
                icon: 'fa-graduation-cap', title: 'Academic Requirements',
                items: ['Grade 12 Certificate/GCSE', 'Minimum grade C in core subjects', 'English & Mathematics required', 'Transcript from school'],
              },
              {
                icon: 'fa-passport', title: 'Documentation',
                items: ['Birth Certificate/National ID', 'Passport (for International)', 'Academic Results/Transcripts', 'Referee Letters (2)'],
              },
              {
                icon: 'fa-heart', title: 'Health Requirements',
                items: ['Medical Clearance', 'Vaccination Records', 'HIV Test (where applicable)', 'Insurance Documentation'],
              },
              {
                icon: 'fa-globe', title: 'International Students',
                items: ['Valid Passport', 'English Language Test', 'Visa Sponsorship Available', 'Financial Proof'],
              },
              {
                icon: 'fa-mobile-alt', title: 'Contact Details',
                items: ['Valid Email Address', 'Active Phone Number', 'Physical Address', 'Emergency Contact'],
              },
              {
                icon: 'fa-id-card', title: 'Legal Requirements',
                items: ['Age 18+ years old', 'Clearance Certificate', 'Police Clearance', 'Affidavit (if needed)'],
              },
            ].map((r) => (
              <div key={r.title} className="requirement-card">
                <div className="requirement-icon"><i className={`fas ${r.icon}`}></i></div>
                <h3>{r.title}</h3>
                <ul>
                  {r.items.map((item, ii) => <li key={ii}>{item}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TIMELINE */}
      <section className="section section-alt">
        <div className="container">
          <h2 className="section-title">Admission Timeline {currentYear}</h2>
          <p className="section-subtitle">Important dates for the admissions process</p>
          <div className="timeline">
            {[
              { step: 'January Intake Applications', date: `Dec 1 - Dec 31, ${currentYear - 1}`, desc: 'Official application window for the January intake.' },
              { step: 'July Intake Applications', date: `May 1 - June 30, ${currentYear}`, desc: 'Submissions for the upcoming July intake.' },
              { step: 'Selection Interviews', date: `January 5–15, ${currentYear}`, desc: 'Shortlisted candidates invited for interviews and assessments.' },
              { step: 'Results Announcement', date: `January 20, ${currentYear}`, desc: 'Admission results published online and by email.' },
              { step: 'Registration', date: `January 25–31, ${currentYear}`, desc: 'Successful candidates register and pay initial fees.' },
              { step: 'Classes Commence', date: `February 2, ${currentYear}`, desc: 'Academic year sessions officially begin.' },
            ].map((t) => (
              <div key={t.step} className="timeline-item">
                <h4>{t.step}</h4>
                <p><strong>{t.date}</strong> — {t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEES SUMMARY */}
      <section className="section">
        <div className="container">
          <h2 className="section-title">Tuition & General Fees</h2>
          <p className="section-subtitle">Affordable and transparent pricing for all academic programs</p>

          <div className="cta-box" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: 'var(--clr-body)', boxShadow: 'none' }}>
            <h3 style={{ color: 'var(--clr-blue)', marginBottom: '15px' }}>Plan Your Education</h3>
            <p style={{ color: '#64748b' }}>
              We believe in making quality education accessible. View our detailed fee schedule, including tuition for full-time and distance learning, as well as administrative and boarding costs.
            </p>
            <Link to="/fees-tuition" className="btn btn-primary" style={{ marginTop: '10px' }}>
              <i className="fas fa-list-check"></i> View Full Fees Schedule
            </Link>
          </div>
        </div>
      </section>

      {/* APPLICATION FORM */}
      <section className="section section-alt" id="apply">
        <div className="container">
          <h2 className="section-title">Apply Now</h2>
          <p className="section-subtitle">
            Complete this form to submit your application to Fairview University College.
            <br />
            Prefer physical submission? <a href="/ApplicationForm.pdf" download style={{ color: '#2a5298', fontWeight: 600, textDecoration: 'underline' }}>Download the offline application form</a>.
          </p>

          <div className="form-container">
            {alert && (
              <div className={`alert alert-${alert.type}`}>
                {alert.type === 'success' ? <i className="fas fa-check-circle"></i> : <i className="fas fa-exclamation-circle"></i>}
                {alert.msg}
              </div>
            )}

            <form ref={formRef} onSubmit={handleSubmit}>
              {/* Personal */}
              <div className="form-section">
                <h3><i className="fas fa-user"></i> Personal Information</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="firstName">First Name *</label>
                    <input type="text" id="firstName" name="firstName" required placeholder="Enter first name" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="lastName">Last Name *</label>
                    <input type="text" id="lastName" name="lastName" required placeholder="Enter last name" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="email">Email Address *</label>
                    <input type="email" id="email" name="email" required placeholder="you@example.com" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="phone">Phone Number *</label>
                    <input type="tel" id="phone" name="phone" required placeholder="+260 XXX XXXXXX" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="dob">Date of Birth *</label>
                    <input
                      type="date"
                      id="dob"
                      name="dob"
                      required
                      onChange={(e) => {
                        const birthDate = new Date(e.target.value);
                        const today = new Date();
                        let a = today.getFullYear() - birthDate.getFullYear();
                        const m = today.getMonth() - birthDate.getMonth();
                        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) a--;
                        setAge(a || 21);
                      }}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="gender">Gender *</label>
                    <select id="gender" name="gender" required>
                      <option value="">Select Gender</option>
                      <option>Male</option>
                      <option>Female</option>
                      <option>Prefer not to say</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="address">Physical Address * (Residential)</label>
                    <input type="text" id="address" name="address" required placeholder="Foxdale - Chamba Valley, Plot 70A/77, etc." />
                  </div>
                  <div className="form-group">
                    <label htmlFor="postalAddress">Postal Address</label>
                    <input type="text" id="postalAddress" name="postalAddress" placeholder="P.O. Box 30295" />
                  </div>
                </div>
                {age < 21 && (
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="parentName">Parent/Guardian Name * (For Minors)</label>
                      <input type="text" id="parentName" name="parentName" required={age < 21} placeholder="Full Name of Guardian" />
                    </div>
                    <div className="form-group">
                      <label htmlFor="parentPhone">Parent/Guardian Phone *</label>
                      <input type="tel" id="parentPhone" name="parentPhone" required={age < 21} placeholder="Contact number" />
                    </div>
                  </div>
                )}
              </div>

              {/* Academic */}
              <div className="form-section">
                <h3><i className="fas fa-graduation-cap"></i> Academic Information</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="program">Course you wish to enroll *</label>
                    <select id="program" name="program" required>
                      <option value="">Select a Program</option>
                      <optgroup label="Degree Programmes (2-4 Years)">
                        <option>Secondary Teachers’ Degree</option>
                        <option>Primary Teachers’ Degree</option>
                        <option>Public Relations Degree</option>
                        <option>Social Work Degree</option>
                      </optgroup>
                      <optgroup label="Diploma Programmes (2-3 Years)">
                        <option>Sales and Marketing Diploma</option>
                        <option>Journalism Diploma</option>
                        <option>Psycho-Social Counselling</option>
                        <option>Computer Hardware & Mgmt</option>
                      </optgroup>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="studyMode">Study Mode *</label>
                    <select id="studyMode" name="studyMode" required>
                      <option value="">Select Mode</option>
                      <option>Full-Time</option>
                      <option>Part-Time</option>
                      <option>Distance</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="intake">Intake Applied For *</label>
                    <select id="intake" name="intake" required>
                      <option value="">Select Intake</option>
                      {intakes.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="school">Last School Attended *</label>
                    <input type="text" id="school" name="school" required placeholder="Secondary school name" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="yearCompleted">Year Obtained / Completed *</label>
                    <input type="number" id="yearCompleted" name="yearCompleted" min="2000" max="2026" required placeholder="e.g. 2024" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="nationality">Nationality *</label>
                    <input type="text" id="nationality" name="nationality" required placeholder="Include residential area if foreign" />
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div className="form-section">
                <h3><i className="fas fa-file-upload"></i> Supporting Documents</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="nrcPassport">NRC / Birth Certificate / Passport No. *</label>
                    <input type="text" id="nrcPassport" name="nrcPassport" required placeholder="Enter ID or passport number" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="refereeName">Referee Name *</label>
                    <input type="text" id="refereeName" name="refereeName" required placeholder="Name of your referee" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="nrcPassportFile">Upload Certified ID / Birth Certificate *</label>
                    <div className="cloudinary-upload-wrapper">
                      <button
                        type="button"
                        onClick={() => openWidget('nrc')}
                        className={`cloudinary-btn ${nrcUrl ? 'success' : ''}`}
                      >
                        {nrcUrl ? <><i className="fas fa-check-circle"></i> Change File</> : <><i className="fas fa-upload"></i> Upload File</>}
                      </button>
                      {nrcFileName && <span className="file-name">{nrcFileName}</span>}
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="academicResultsFile">Upload Certified School Results *</label>
                    <div className="cloudinary-upload-wrapper">
                      <button
                        type="button"
                        onClick={() => openWidget('results')}
                        className={`cloudinary-btn ${resultsUrl ? 'success' : ''}`}
                      >
                        {resultsUrl ? <><i className="fas fa-check-circle"></i> Change File</> : <><i className="fas fa-upload"></i> Upload File</>}
                      </button>
                      {resultsFileName && <span className="file-name">{resultsFileName}</span>}
                    </div>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="passportPhoto">Upload 2 Passport Photos *</label>
                    <div className="cloudinary-upload-wrapper">
                      <button
                        type="button"
                        onClick={() => openWidget('photo')}
                        className={`cloudinary-btn ${photoUrl ? 'success' : ''}`}
                      >
                        {photoUrl ? <><i className="fas fa-check-circle"></i> Change Image</> : <><i className="fas fa-camera"></i> Upload Photos</>}
                      </button>
                      {photoFileName && <span className="file-name">{photoFileName}</span>}
                    </div>
                    <small>Colored passport photos with white background</small>
                  </div>
                </div>
                <div className="form-row full">
                  <div className="form-group">
                    <label htmlFor="personalStatement">Personal Statement / Additional Information</label>
                    <textarea id="personalStatement" name="personalStatement" placeholder="Tell us about your goals or any additional information from the physical form..."></textarea>
                  </div>
                </div>
                <div className="form-row full">
                  <div className="form-group">
                    <label htmlFor="howHeard">How did you hear about us?</label>
                    <select id="howHeard" name="howHeard">
                      <option value="">Select an option</option>
                      <option>Social Media</option>
                      <option>Friend/Family</option>
                      <option>Google Search</option>
                      <option>Radio/TV</option>
                      <option>Newspaper</option>
                      <option>School Visit</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Declarations */}
              <div className="form-section">
                <h3><i className="fas fa-signature"></i> Section 7: Declarations</h3>

                <div className="declaration-box" style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                  <p style={{ fontSize: '13px', color: '#475569', marginBottom: '15px', lineHeight: '1.6' }}>
                    <strong>Fees Agreement:</strong> All fees are payable in cash every end of the month (a month in advance).
                    No refunds or discounts will be made for absence due to illness or holidays.
                    I understand that registration fees are non-refundable and I will be fully liable for all financial obligations.
                  </p>

                  {age >= 21 ? (
                    <div className="form-checkbox">
                      <input type="checkbox" id="declStudent" name="declStudent" required />
                      <label htmlFor="declStudent">
                        <strong>Student Declaration (Age 21+):</strong> I hereby declare that I fully understand and accept the conditions
                        set by Fairview University College. I undertake personally to fulfill all financial obligations.
                      </label>
                    </div>
                  ) : (
                    <div className="form-checkbox">
                      <input type="checkbox" id="declParent" name="declParent" required />
                      <label htmlFor="declParent">
                        <strong>Parent/Guardian Declaration (Applicant under 21):</strong> I, as parent/legal guardian,
                        accept all conditions and undertake financial responsibility for the applicant.
                      </label>
                    </div>
                  )}

                  <div className="form-checkbox" style={{ marginTop: '10px' }}>
                    <input type="checkbox" id="noClaim" name="noClaim" required />
                    <label htmlFor="noClaim">
                      I declare not to have any claim against Fairview University College in case of loss of life, property and/or injury sustained.
                    </label>
                  </div>

                  <div className="form-checkbox" style={{ marginTop: '10px' }}>
                    <input type="checkbox" id="termsAgree" name="termsAgree" required />
                    <label htmlFor="termsAgree">
                      I have read and agree to the <Link to="/terms-conditions" target="_blank" style={{ color: '#2a5298', fontWeight: 600 }}>Terms & Conditions</Link> and <Link to="/privacy-policy" target="_blank" style={{ color: '#2a5298', fontWeight: 600 }}>Privacy Policy</Link>. *
                    </label>
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <button type="submit" className="submit-btn" disabled={submitting}>
                  {submitting
                    ? <><i className="fas fa-spinner fa-spin"></i> Submitting...</>
                    : <><i className="fas fa-paper-plane"></i> Submit Application</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* CONTACT CTA */}
      <section className="section">
        <div className="container">
          <div className="cta-box">
            <h2>Need Help with Your Application?</h2>
            <p>Our admissions team is ready to guide you through every step of the application process.</p>
            <div className="cta-buttons">
              <a href="tel:+260977787114" className="btn btn-primary">
                <i className="fas fa-phone"></i> +260 977 787 114
              </a>
              <a href="mailto:fairviewuniversitycollege02@gmail.com" className="btn btn-secondary">
                <i className="fas fa-envelope"></i> Email Us
              </a>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Admissions;
