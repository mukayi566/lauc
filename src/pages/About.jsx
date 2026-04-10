import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';

const About = () => (
  <Layout>
    {/* HERO */}
    <section className="hero">
      <div className="hero-content">
        <div className="page-breadcrumb"><i className="fas fa-home"></i> Home / About Us</div>
        <h1>About London American University College</h1>
        <p>Excellence in Healthcare Education | Christian Principles | Community Focus</p>
      </div>
    </section>

    {/* MISSION & VISION */}
    <section className="section">
      <div className="container">
        <h2 className="section-title">Our Mission &amp; Vision</h2>
        <p className="section-subtitle">Guiding our commitment to educational excellence</p>
        <div className="mission-vision-grid">
          <div className="mission-vision-card">
            <i className="fas fa-bullseye"></i>
            <h3>Our Mission</h3>
            <p>To be a partner with government in producing holistic education based on Christian principles for service to society.</p>
          </div>
          <div className="mission-vision-card">
            <i className="fas fa-eye"></i>
            <h3>Our Vision</h3>
            <p>To provide unmatched tertiary education to society producing practitioners with a community focus.</p>
          </div>
        </div>
      </div>
    </section>

    {/* WHO WE ARE */}
    <section className="section section-alt">
      <div className="container">
        <h2 className="section-title">Welcome to London American University College</h2>
        <div className="about-two-col" style={{ marginTop: 40 }}>
          <div className="about-text">
            <h2>Who We Are</h2>
            <p>London American University College (formerly UNICOHS) is an institution of higher learning in Lusaka, Zambia, with a mission to provide holistic, Christian-based education and a vision to produce practitioners with a community focus.</p>
            <p>We are registered and accredited by the Higher Education Authority and the Health Professions Council of Zambia, offering programs in Health Sciences, Humanities, Social Sciences, Business Studies, and TEVETA courses.</p>
            <p>Key areas of study include nursing, clinical medicine, environmental health, public health, social work, and various business and TEVETA programs.</p>
            <p style={{ marginTop: 16 }}>We are delighted to have you join our community where excellence, integrity, and faith guide all we do. Together, we strive to shape not only successful professionals but also responsible leaders with strong values.</p>
            <div style={{ marginTop: 24 }}>
              <a href="tel:+260770839120" className="btn btn-primary">
                <i className="fas fa-phone"></i> Call Now: +260770839120
              </a>
            </div>
          </div>
          <div className="about-visual">
            <i className="fas fa-university"></i>
          </div>
        </div>

        {/* STATS */}
        <div className="stats-grid">
          {[
            { num: '28+', label: 'Total Programs' },
            { num: '1,300+', label: 'Our Students' },
            { num: '47+', label: 'Skilled Lecturers' },
            { num: '10+', label: 'Departments' },
          ].map((s, i) => (
            <div key={i} className="stat-box">
              <div className="stat-number">{s.num}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* CORE VALUES */}
    <section className="section">
      <div className="container">
        <h2 className="section-title">Our Core Values</h2>
        <p className="section-subtitle">The principles that guide our institution</p>
        <div className="values-grid">
          {[
            { icon: 'fa-cross', title: 'Christian Foundation', desc: 'We base our education on Christian principles, fostering values of integrity, compassion, and service.' },
            { icon: 'fa-medal', title: 'Excellence', desc: 'We are committed to providing the highest quality education and developing world-class professionals.' },
            { icon: 'fa-users', title: 'Community Focus', desc: 'We train practitioners dedicated to serving their communities and contributing to societal development.' },
            { icon: 'fa-lightbulb', title: 'Innovation', desc: 'We embrace modern teaching methods and cutting-edge technology to enhance learning outcomes.' },
            { icon: 'fa-handshake', title: 'Integrity', desc: 'We uphold the highest standards of academic and professional integrity in all our operations.' },
            { icon: 'fa-book-open', title: 'Holistic Education', desc: 'We develop students mentally, physically, spiritually, and socially for balanced personal growth.' },
          ].map((v, i) => (
            <div key={i} className="value-card">
              <div className="value-icon"><i className={`fas ${v.icon}`}></i></div>
              <h3>{v.title}</h3>
              <p>{v.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* LEADERSHIP */}
    <section className="section section-alt">
      <div className="container">
        <h2 className="section-title">Our Leadership Team</h2>
        <p className="section-subtitle">Dedicated professionals shaping the future of healthcare education</p>
        <div className="leadership-grid">
          {[
            { name: 'Humphrey Monde', title: 'Executive Director', desc: 'Leading our institution with vision and strategic direction to ensure excellence in healthcare education.' },
            { name: 'Dr. Geoffrey Sandala', title: 'Principal', desc: 'Overseeing academic excellence and ensuring students achieve their full potential.' },
            { name: 'Parson Monde', title: 'Director Finance & Administration', desc: 'Managing institutional resources efficiently to support quality education.' },
            { name: 'Chimuka Chijikwa', title: 'Director Business Development', desc: 'Driving institutional growth and expanding our educational offerings.' },
            { name: 'Col. Christopher Liteta', title: 'Dean School of Health Sciences', desc: 'Leading our health sciences programs with expertise and dedication.' },
            { name: 'Mrs. Nchimunya M Monze', title: 'Acting Registrar', desc: 'Managing student records and academic affairs with professionalism.' },
          ].map((l, i) => (
            <div key={i} className="leader-card">
              <div className="leader-image"><i className="fas fa-user-circle"></i></div>
              <div className="leader-info">
                <div className="leader-name">{l.name}</div>
                <div className="leader-title">{l.title}</div>
                <p style={{ color: '#666', fontSize: 13, lineHeight: 1.7 }}>{l.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* ACCREDITATION */}
    <section className="section">
      <div className="container">
        <h2 className="section-title">Accreditation &amp; Recognition</h2>
        <p className="section-subtitle">Recognised by leading national and international bodies</p>
        <div style={{ background: 'white', padding: '36px', borderRadius: 16, boxShadow: '0 5px 20px rgba(0,0,0,0.08)' }}>
          <p style={{ color: '#666', lineHeight: 1.9, marginBottom: 10, fontSize: 15 }}>
            London American University College is registered and accredited by the following bodies, ensuring our programs meet the highest educational standards.
          </p>
          <div className="accreditation-list">
            {[
              { icon: 'fa-certificate', title: 'Higher Education Authority (HEA)', desc: 'Fully accredited institution of higher learning in Zambia.' },
              { icon: 'fa-hospital', title: 'Health Professions Council of Zambia (HPCZ)', desc: 'Accredited for health sciences and nursing programs.' },
              { icon: 'fa-building', title: 'Technical Education, Vocational & Entrepreneurship Training Authority (TEVETA)', desc: 'Approved TEVETA program provider.' },
              { icon: 'fa-check-circle', title: 'Pharmacy &amp; Medicines Regulatory Authority (PMRA)', desc: 'Accredited pharmacy-related programs.' },
            ].map((a, i) => (
              <div key={i} className="accreditation-item">
                <i className={`fas ${a.icon}`}></i>
                <div>
                  <h4>{a.title}</h4>
                  <p>{a.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>

    {/* CTA */}
    <section className="section section-alt">
      <div className="container">
        <div className="cta-box">
          <h2>Ready to Join Our Community?</h2>
          <p>Take the first step toward an extraordinary academic journey at London American University College.</p>
          <div className="cta-buttons">
            <Link to="/admissions#apply" className="btn btn-primary">
              <i className="fas fa-file-alt"></i> Apply Now
            </Link>
            <Link to="/programs" className="btn btn-secondary">
              <i className="fas fa-book"></i> Explore Programs
            </Link>
          </div>
        </div>
      </div>
    </section>
  </Layout>
);

export default About;
