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
  const formRef = useRef(null);

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
          } else {
            setResultsUrl(url);
            setResultsFileName(name);
            toast.success('Academic Results uploaded!');
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
      if (!nrcUrl || !resultsUrl) {
        throw new Error('Please upload all required documents.');
      }

      data.nrcPassportUrl = nrcUrl;
      data.academicResultsUrl = resultsUrl;

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
      setNrcFileName('');
      setResultsFileName('');
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
      <section className="hero">
        <div className="hero-content">
          <div className="page-breadcrumb"><i className="fas fa-home"></i> Home / Admissions</div>
          <h1>Admissions 2026</h1>
          <p>Information about the admissions process at London American University College</p>
          <div className="hero-buttons">
            <a href="#apply" className="btn btn-primary">
              <i className="fas fa-file-alt"></i> Apply Now
            </a>
            <a href="#requirements" className="btn btn-secondary">
              <i className="fas fa-list-check"></i> View Requirements
            </a>
          </div>
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
          <h2 className="section-title">Admission Timeline 2026</h2>
          <p className="section-subtitle">Important dates for the admissions process</p>
          <div className="timeline">
            {[
              { step: 'Applications Open', date: 'December 1, 2025', desc: 'Start submitting your application online or in person.' },
              { step: 'Application Deadline', date: 'December 31, 2025', desc: 'Last day to submit applications for the January 2026 intake.' },
              { step: 'Selection Interviews', date: 'January 5–15, 2026', desc: 'Shortlisted candidates invited for interviews and assessments.' },
              { step: 'Results Announcement', date: 'January 20, 2026', desc: 'Admission results published online and by email.' },
              { step: 'Registration', date: 'January 25–31, 2026', desc: 'Successful candidates register and pay initial fees.' },
              { step: 'Classes Commence', date: 'February 2, 2026', desc: 'Academic year officially begins.' },
            ].map((t) => (
              <div key={t.step} className="timeline-item">
                <h4>{t.step}</h4>
                <p><strong>{t.date}</strong> — {t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEES TABLE */}
      <section className="section">
        <div className="container">
          <h2 className="section-title">Tuition Fees Structure</h2>
          <p className="section-subtitle">Annual tuition fees for our programs (2026)</p>
          <div style={{ overflowX: 'auto' }}>
            <table className="fees-table">
              <thead>
                <tr>
                  <th>Program</th>
                  <th>Level</th>
                  <th>Duration</th>
                  <th>Annual Fee (ZMW)</th>
                  <th>Total Cost (ZMW)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Bachelor of Science in Nursing', 'Degree', '4 years', '15,000', '60,000'],
                  ['Bachelor of Science in Clinical Medical Sciences', 'Degree', '4 years', '16,000', '64,000'],
                  ['Bachelor of Business Administration', 'Degree', '4 years', '14,000', '56,000'],
                  ['Bachelor of Science in Public Health', 'Degree', '4 years', '15,000', '60,000'],
                  ['Diploma in Registered Nursing', 'Diploma', '3 years', '12,000', '36,000'],
                  ['Diploma in Public Health', 'Diploma', '3 years', '11,000', '33,000'],
                  ['Diploma in Environmental Health', 'Diploma', '3 years', '11,000', '33,000'],
                  ['Diploma in Social Work', 'Diploma', '3 years', '10,000', '30,000'],
                ].map((row) => (
                  <tr key={row[0]}>
                    <td><strong>{row[0]}</strong></td>
                    <td><span style={{ background: 'rgba(42,82,152,0.1)', color: '#2a5298', padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700 }}>{row[1]}</span></td>
                    <td>{row[2]}</td>
                    <td>{row[3]}</td>
                    <td><strong style={{ color: '#1e3c72' }}>{row[4]}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ marginTop: 18, color: '#666', fontSize: 13, textAlign: 'center' }}>
            <strong>Note:</strong> Fees include tuition, library, laboratory, and technology fees. Accommodation and meals are additional.
            Scholarships and payment plans are available for qualified students.
          </p>
        </div>
      </section>

      {/* APPLICATION FORM */}
      <section className="section section-alt" id="apply">
        <div className="container">
          <h2 className="section-title">Apply Now</h2>
          <p className="section-subtitle">Complete this form to submit your application to London American University College</p>

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
                    <input type="date" id="dob" name="dob" required />
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
                <div className="form-row full">
                  <div className="form-group">
                    <label htmlFor="address">Physical Address *</label>
                    <input type="text" id="address" name="address" required placeholder="Enter your home address" />
                  </div>
                </div>
              </div>

              {/* Academic */}
              <div className="form-section">
                <h3><i className="fas fa-graduation-cap"></i> Academic Information</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="program">Program of Interest *</label>
                    <select id="program" name="program" required>
                      <option value="">Select a Program</option>
                      <optgroup label="Degree Programs">
                        <option>Bachelor of Science in Nursing</option>
                        <option>Bachelor of Science in Clinical Medical Sciences</option>
                        <option>Bachelor of Business Administration</option>
                        <option>Bachelor of Science in Public Health</option>
                      </optgroup>
                      <optgroup label="Diploma Programs">
                        <option>Diploma in Registered Nursing</option>
                        <option>Diploma in Public Health</option>
                        <option>Diploma in Environmental Health</option>
                        <option>Diploma in Social Work</option>
                      </optgroup>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="intake">Intake Year *</label>
                    <select id="intake" name="intake" required>
                      <option value="">Select Intake</option>
                      <option>January 2026</option>
                      <option>September 2026</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="school">Last School Attended *</label>
                    <input type="text" id="school" name="school" required placeholder="Secondary school name" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="yearCompleted">Year Completed *</label>
                    <input type="number" id="yearCompleted" name="yearCompleted" min="2000" max="2026" required placeholder="e.g. 2024" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="grades">Examination Body &amp; Grades *</label>
                    <input type="text" id="grades" name="grades" required placeholder="e.g. ECZ Grade 12 — English B, Maths C, Biology B" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="nationality">Nationality *</label>
                    <input type="text" id="nationality" name="nationality" required placeholder="e.g. Zambian" />
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div className="form-section">
                <h3><i className="fas fa-file-upload"></i> Supporting Documents</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="nrcPassport">NRC / Passport Number *</label>
                    <input type="text" id="nrcPassport" name="nrcPassport" required placeholder="Enter ID or passport number" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="refereeName">Referee Name *</label>
                    <input type="text" id="refereeName" name="refereeName" required placeholder="Name of your referee" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="nrcPassportFile">Upload NRC / Passport (PDF or Image) *</label>
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
                    <small style={{display: 'block', marginTop: 4, color: '#666'}}>Maximum size: 5MB</small>
                  </div>
                  <div className="form-group">
                    <label htmlFor="academicResultsFile">Upload Academic Results / Transcripts *</label>
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
                    <small style={{display: 'block', marginTop: 4, color: '#666'}}>Maximum size: 5MB</small>
                  </div>
                </div>
                <div className="form-row full">
                  <div className="form-group">
                    <label htmlFor="personalStatement">Personal Statement</label>
                    <textarea id="personalStatement" name="personalStatement" placeholder="Tell us about yourself, your goals, and why you want to study at LAUC..."></textarea>
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
              <a href="tel:+260977476614" className="btn btn-primary">
                <i className="fas fa-phone"></i> +260977476614
              </a>
              <a href="mailto:contact@londonamericanuniversitycollege.com" className="btn btn-secondary">
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
