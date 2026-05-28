import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';

const programs = [
  // DEGREES
  {
    type: 'Degree Programme', level: 'Degree', duration: '4 years', rating: '4.8',
    title: 'Secondary Teachers’ Degree',
    desc: 'Comprehensive teacher training for secondary education. Mathematics and English credits required.',
    modules: ['Educational Psychology', 'Curriculum Design', 'Subject Specialization', 'Teaching Methodology', 'Classroom Management'],
    careers: ['High School Teacher', 'Educational Consultant', 'Curriculum Developer', 'School Administrator'],
  },
  {
    type: 'Degree Programme', level: 'Degree', duration: '4 years', rating: '4.7',
    title: 'Primary Teachers’ Degree',
    desc: 'Specialized training for primary school educators. Focus on foundational subjects including Math and Science.',
    modules: ['Literacy Education', 'Primary Math Pedagogy', 'Child Development', 'Integrated Science', 'Social Studies'],
    careers: ['Primary School Teacher', 'Educational Researcher', 'Child Welfare Officer'],
  },
  {
    type: 'Degree Programme', level: 'Degree', duration: '4 years', rating: '4.7',
    title: 'Early Childhood Teachers’ Degree',
    desc: 'Preparing specialists for pre-school and early childhood education. English credits required.',
    modules: ['Early Learning Systems', 'Child Play & Development', 'Nutrition & Health', 'Creative Arts', 'Inclusive Education'],
    careers: ['Pre-school Teacher', 'Daycare Director', 'Child Development Specialist'],
  },
  {
    type: 'Degree Programme', level: 'Degree', duration: '4 years', rating: '4.8',
    title: 'Bachelor of Science in Nursing',
    desc: 'Professional nursing and midwifery training. Accredited for clinical excellence.',
    modules: ['Anatomy', 'Nursing Fundamentals', 'Medical-Surgical Nursing', 'Maternal Health', 'Community Nursing'],
    careers: ['Registered Nurse', 'Clinical Instructor', 'Ward Manager'],
  },

  // DIPLOMAS
  {
    type: 'Diploma Programme', level: 'Diploma', duration: '3 years', rating: '4.6',
    title: 'Social Work Diploma',
    desc: 'Training for community service and social welfare management. Mature entry accepted.',
    modules: ['Social Policy', 'Community Development', 'Case Management', 'Psychology', 'Ethics in Social Work'],
    careers: ['Social Worker', 'NGO Coordinator', 'Community Liaison Officer'],
  },
  {
    type: 'Diploma Programme', level: 'Diploma', duration: '3 years', rating: '4.5',
    title: 'Journalism Diploma',
    desc: 'Master the arts of reporting, broadcasting and digital media. Focus on ethical journalism.',
    modules: ['Media Law', 'News Writing', 'Broadcasting', 'Digital Media', 'Photojournalism'],
    careers: ['Reporter', 'News Editor', 'Media Producer', 'Content Creator'],
  },
  {
    type: 'Diploma Programme', level: 'Diploma', duration: '3 years', rating: '4.6',
    title: 'Public Relations Diploma',
    desc: 'Strategic communication and image management for corporate and public sectors.',
    modules: ['Corporate Communication', 'Crisis Management', 'Publicity', 'Media Relations', 'Strategic Writing'],
    careers: ['PR Officer', 'Communications Specialist', 'Brand Manager'],
  },
  {
    type: 'Diploma Programme', level: 'Diploma', duration: '3 years', rating: '4.6',
    title: 'Sales and Marketing Diploma',
    desc: 'Business-focused training in market analysis, sales strategy, and consumer behavior.',
    modules: ['Marketing Research', 'Digital Marketing', 'Consumer Behavior', 'Sales Management', 'Business Stats'],
    careers: ['Sales Manager', 'Marketing Coordinator', 'Business Developer'],
  },
  {
    type: 'Diploma Programme', level: 'Diploma', duration: '3 years', rating: '4.5',
    title: 'Hospitality & Events Administration',
    desc: 'Professional training in hotel management, tourism, and event coordination.',
    modules: ['Front Office Ops', 'Event Planning', 'Tourism Management', 'Customer Service', 'Housekeeping'],
    careers: ['Hotel Manager', 'Event Planner', 'Hospitality Consultant'],
  },
  {
    type: 'Diploma Programme', level: 'Diploma', duration: '2 years', rating: '4.7',
    title: 'Computer Hardware & Management',
    desc: 'Technical training in system maintenance, networking, and IT infrastructure management.',
    modules: ['Computer Maintenance', 'Networking', 'Operating Systems', 'IT Security', 'System Admin'],
    careers: ['IT Technician', 'Network Administrator', 'System Support Specialist'],
  },
  {
    type: 'Diploma Programme', level: 'Diploma', duration: '2 years', rating: '4.6',
    title: 'Food & Beverage Management',
    desc: 'Vocational training in culinary arts and catering service management.',
    modules: ['Culinary Skills', 'Food Safety', 'Beverage Service', 'Catering Management', 'Cost Control'],
    careers: ['Restaurant Manager', 'Catering Executive', 'Head Chef'],
  },
  {
    type: 'Diploma Programme', level: 'Diploma', duration: '1 year', rating: '4.9',
    title: 'Lecturing/Teaching Methodology',
    desc: 'Post-graduate training for professionals looking to transition into education and lecturing.',
    modules: ['Pedagogical Skills', 'Assessment Tools', 'Educational Technology', 'Lecture Management'],
    careers: ['University Lecturer', 'Professional Trainer', 'Subject Specialist Instructor'],
  },

  // CERTIFICATES
  {
    type: 'Certificate Programme', level: 'Certificate', duration: '6-12 months', rating: '4.4',
    title: 'Computer Software & Hardware',
    desc: 'Fast-track technical certification in basic IT operations and system repairs.',
    modules: ['Office Suites', 'PC Repair', 'Operating Systems', 'Basic Networking'],
    careers: ['IT Support Assistant', 'Computer Lab Technician'],
  },
  {
    type: 'Certificate Programme', level: 'Certificate', duration: '12 months', rating: '4.5',
    title: 'Tailoring & Design',
    desc: 'Hands-on training in fashion design, garment construction, and textile science.',
    modules: ['Fashion Illustration', 'Pattern Making', 'Machine Ops', 'Textile Science'],
    careers: ['Fashion Designer', 'Tailor', 'Textile Quality Controller'],
  },
  {
    type: 'Certificate Programme', level: 'Certificate', duration: '12-18 months', rating: '4.3',
    title: 'Bricklaying and Plastering',
    desc: 'Practical construction training focusing on structural integrity and finishing.',
    modules: ['Construction Safety', 'Blueprint Reading', 'Masonry Skills', 'Plastering Techniques'],
    careers: ['Mason', 'Construction Supervisor', 'Contractor'],
  },
];

const Programs = () => {
  const [filter, setFilter] = useState('All');
  const [expanded, setExpanded] = useState(null);
  const [enrollment, setEnrollment] = useState({});

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'students'), (snapshot) => {
      const counts = {};
      snapshot.forEach(doc => {
        const prog = doc.data().program;
        if (prog) counts[prog] = (counts[prog] || 0) + 1;
      });
      setEnrollment(counts);
    });
    return () => unsub();
  }, []);

  const filtered = filter === 'All' ? programs : programs.filter(p => p.level === filter);

  return (
    <Layout>
      {/* HERO */}
      <section className="hero">
        <div className="hero-content">
          <div className="page-breadcrumb"><i className="fas fa-home"></i> Home / Programs</div>
          <h1>Academic Programs</h1>
          <p>Explore our diverse range of healthcare, business, and social science programs designed to launch your career.</p>
        </div>

        {/* Seamless Curved Wave Divider */}
        <div className="hero-divider">
          <svg viewBox="0 0 1440 120" preserveAspectRatio="none">
            <path d="M0,96L120,101.3C240,107,480,117,720,117.3C960,117,1200,107,1320,101.3L1440,96L1440,120L1320,120C1200,120,960,120,720,120C480,120,240,120,120,120L0,120Z" fill="#f8faff"></path>
          </svg>
        </div>
      </section>

      {/* INTRO */}
      <section className="section section-alt">
        <div className="container">
          <h2 className="section-title">Our Available Programs</h2>
          <p className="section-subtitle">Our programs are designed to equip students with skills, knowledge, and values needed for success in their chosen careers.</p>

          {/* FILTER TABS */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 40, flexWrap: 'wrap' }}>
            {['All', 'Degree', 'Diploma', 'Certificate'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="btn"
                style={{
                  background: filter === f ? '#1e3c72' : 'white',
                  color: filter === f ? 'white' : '#1e3c72',
                  border: '2px solid #1e3c72',
                  transition: 'all 0.3s',
                }}>
                {f === 'All' ? 'All Programs' : `${f} Programs`}
              </button>
            ))}
          </div>

          <div className="programs-grid">
            {filtered.map((p, i) => (
              <div key={p.title} className="program-card">
                <div className="program-header">
                  <div className="program-type">{p.type}</div>
                  <div className="program-title">{p.title}</div>
                  <div className="program-rating" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span><i className="fas fa-star"></i> Quality Education ({p.rating})</span>
                    <span className="enrolled-badge" style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                      <i className="fas fa-user-graduate" style={{ marginRight: '4px' }}></i>
                      {enrollment[p.title] || 0} Enrolled
                    </span>
                  </div>
                </div>
                <div className="program-body">
                  <p className="program-description">{p.desc}</p>
                  <div className="program-duration"><i className="fas fa-clock"></i> Duration: {p.duration}</div>

                  {/* EXPAND */}
                  {expanded === i && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ marginBottom: 12 }}>
                        <strong style={{ color: '#1e3c72', fontSize: 13 }}>Key Modules:</strong>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                          {p.modules.map((m, mi) => (
                            <span key={mi} style={{ background: 'rgba(42,82,152,0.1)', color: '#2a5298', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>{m}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <strong style={{ color: '#1e3c72', fontSize: 13 }}>Career Paths:</strong>
                        <ul style={{ marginTop: 8, paddingLeft: 0, listStyle: 'none' }}>
                          {p.careers.map((c, ci) => (
                            <li key={ci} style={{ fontSize: 13, color: '#555', padding: '3px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                              <i className="fas fa-arrow-right" style={{ color: '#2a5298', fontSize: 10 }}></i> {c}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <Link to="/admissions#apply" className="program-cta">Join Us</Link>
                    <button
                      onClick={() => setExpanded(expanded === i ? null : i)}
                      style={{ background: 'none', border: 'none', color: '#2a5298', cursor: 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
                      {expanded === i ? 'Less' : 'More'} <i className={`fas fa-chevron-${expanded === i ? 'up' : 'down'}`}></i>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SCHOLARSHIP BANNER */}
      <section className="section section-gold">
        <div className="scholarship-content">
          <h2 className="scholarship-title">50–100% Scholarship Coverage</h2>
          <p style={{ fontSize: 16, color: '#1e3c72', marginBottom: 28 }}>Transform Your Future with Comprehensive Financial Support for Your Studies</p>
          <div style={{ display: 'flex', gap: 15, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/admissions#apply" className="btn btn-secondary">Apply Now</Link>
            <Link to="/admissions" className="btn btn-secondary">Scholarship Info</Link>
          </div>
        </div>
      </section>

      {/* WHY STUDY HERE */}
      <section className="section">
        <div className="container">
          <h2 className="section-title">Why Study at Fairview University College?</h2>
          <p className="section-subtitle">We provide a transformative educational experience that prepares you for a successful career.</p>
          <div className="features-grid">
            {[
              { icon: 'fa-certificate', title: 'Accredited Programs', desc: 'All programs are fully accredited by national regulatory bodies ensuring your qualification is recognised.' },
              { icon: 'fa-user-md', title: 'Expert Faculty', desc: 'Learn from industry veterans and experienced professionals with decades of hands-on experience.' },
              { icon: 'fa-flask', title: 'Practical Training', desc: 'Hands-on clinical and practical training at partner hospitals and modern on-campus laboratories.' },
              { icon: 'fa-globe', title: 'Global Standards', desc: 'Curriculum designed to meet international standards ensuring graduates are competitive globally.' },
            ].map((f) => (
              <div key={f.title} className="feature-card">
                <div className="feature-icon"><i className={`fas ${f.icon}`}></i></div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section section-alt">
        <div className="container">
          <div className="cta-box">
            <h2>Start Your Journey Today</h2>
            <p>Ready to take the next step? Apply now to secure your place in one of our world-class programs.</p>
            <div className="cta-buttons">
              <Link to="/admissions#apply" className="btn btn-primary">
                <i className="fas fa-file-alt"></i> Apply Now
              </Link>
              <a href="tel:+260977787114" className="btn btn-secondary">
                <i className="fas fa-phone"></i> Call Us
              </a>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Programs;
