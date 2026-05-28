import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

const Home = () => {
  const { currentUser, userRole } = useAuth();
  const [enrollment, setEnrollment] = useState({});
  const [currentSlide, setCurrentSlide] = useState(0);

  const getDashboardLink = () => {
    if (userRole === 'admin') return '/admin-dashboard';
    if (userRole === 'staff') return '/staff-dashboard';
    if (userRole === 'registrar') return '/registrar-dashboard';
    return '/student-dashboard';
  };

  const loginLink = currentUser ? getDashboardLink() : '/login';
  const loginText = currentUser ? 'My Dashboard' : 'Login';
  const portalText = currentUser ? 'My Dashboard' : 'Student Portal';

  const slides = [
    {
      image: '/hero-image1.png',
      title: 'Welcome to Fairview University College',
      subtitle: 'Excellence in Healthcare Education | Christian Principles | Community Focus',
      btn1Text: 'Apply Now',
      btn1Link: '/admissions#apply',
      btn1Icon: 'fa-file-alt',
      btn2Text: loginText,
      btn2Link: loginLink,
      btn2Icon: currentUser ? 'fa-th-large' : 'fa-sign-in-alt',
      btn2Class: 'btn-secondary'
    },
    {
      image: '/hero-image2.jpg',
      title: 'Shaping Future Healthcare Leaders',
      subtitle: 'Accredited Nursing, Public Health and Clinical Sciences programmes designed for professional success.',
      btn1Text: 'Our Programs',
      btn1Link: '/programs',
      btn1Icon: 'fa-graduation-cap',
      btn2Text: 'Apply Now',
      btn2Link: '/admissions#apply',
      btn2Icon: 'fa-file-alt',
      btn2Class: 'btn-outline'
    },
    {
      image: '/hero-image3.png',
      title: 'World Class Academic Resources',
      subtitle: 'A vibrant learning community supported by state-of-the-art library facilities and highly qualified lecturers.',
      btn1Text: 'Explore Programs',
      btn1Link: '/programs',
      btn1Icon: 'fa-book-open',
      btn2Text: 'Contact Us',
      btn2Link: 'tel:+260770839120',
      btn2Icon: 'fa-phone',
      btn2Class: 'btn-secondary'
    },
    {
      image: '/hero-image4.png',
      title: 'Advanced Practical Simulation Labs',
      subtitle: 'Hands-on clinical training, high-tech patient simulators, and safe campus accommodation to elevate your studies.',
      btn1Text: 'Apply Now',
      btn1Link: '/admissions#apply',
      btn1Icon: 'fa-file-alt',
      btn2Text: portalText,
      btn2Link: loginLink,
      btn2Icon: currentUser ? 'fa-th-large' : 'fa-user-lock',
      btn2Class: 'btn-outline'
    }
  ];

  // Auto transition slides
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

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

  return (
    <Layout>
      {/* HERO */}
      <section className="hero" id="home">
        {/* Slide Backgrounds */}
        <div className="hero-slides">
          {slides.map((slide, index) => (
            <div
              key={index}
              className={`hero-slide-bg ${index === currentSlide ? 'active' : ''}`}
              style={{ backgroundImage: `url(${slide.image})` }}
            />
          ))}
        </div>

        {/* Slide Content */}
        <div className="hero-container container">
          {slides.map((slide, index) => (
            <div
              key={index}
              className={`hero-slide-content ${index === currentSlide ? 'active' : ''}`}
            >
              <div className="hero-content">
                <h1>{slide.title}</h1>
                <p>{slide.subtitle}</p>
                <div className="hero-buttons">
                  {slide.btn1Link.startsWith('http') || slide.btn1Link.startsWith('tel') ? (
                    <a href={slide.btn1Link} className="btn btn-primary">
                      <i className={`fas ${slide.btn1Icon}`}></i> {slide.btn1Text}
                    </a>
                  ) : (
                    <Link to={slide.btn1Link} className="btn btn-primary">
                      <i className={`fas ${slide.btn1Icon}`}></i> {slide.btn1Text}
                    </Link>
                  )}

                  {slide.btn2Link.startsWith('http') || slide.btn2Link.startsWith('tel') ? (
                    <a href={slide.btn2Link} className={`btn ${slide.btn2Class || 'btn-secondary'}`}>
                      <i className={`fas ${slide.btn2Icon}`}></i> {slide.btn2Text}
                    </a>
                  ) : (
                    <Link to={slide.btn2Link} className={`btn ${slide.btn2Class || 'btn-secondary'}`}>
                      <i className={`fas ${slide.btn2Icon}`}></i> {slide.btn2Text}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Slide Controls */}
        <button className="hero-control prev" onClick={prevSlide} aria-label="Previous slide">
          <i className="fas fa-chevron-left"></i>
        </button>
        <button className="hero-control next" onClick={nextSlide} aria-label="Next slide">
          <i className="fas fa-chevron-right"></i>
        </button>

        {/* Dots */}
        <div className="hero-dots">
          {slides.map((_, index) => (
            <button
              key={index}
              className={`hero-dot ${index === currentSlide ? 'active' : ''}`}
              onClick={() => setCurrentSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Seamless Curved Wave Divider */}
        <div className="hero-divider">
          <svg viewBox="0 0 1440 120" preserveAspectRatio="none">
            <path d="M0,96L120,101.3C240,107,480,117,720,117.3C960,117,1200,107,1320,101.3L1440,96L1440,120L1320,120C1200,120,960,120,720,120C480,120,240,120,120,120L0,120Z" fill="#ffffff"></path>
          </svg>
        </div>
      </section>

      {/* FEATURES */}
      <section className="section">
        <div className="container">
          <div className="features-grid">
            {[
              { icon: 'fa-medal', title: 'Scholarship Facility', desc: 'We offer scholarship opportunities to support deserving students and make quality education accessible.' },
              { icon: 'fa-chalkboard-user', title: 'Skilled Lecturers', desc: 'Learn from experienced and dedicated lecturers with industry expertise and academic excellence.' },
              { icon: 'fa-book', title: 'Book Library Facility', desc: 'Access a well-stocked library for your academic growth with extensive resources and modern facilities.' },
              { icon: 'fa-tag', title: 'Affordable Price', desc: 'Quality education at an affordable cost for all our programmes without compromising excellence.' },
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

      {/* ABOUT SECTION */}
      <section className="section section-alt" id="about">
        <div className="container">
          <div className="about-two-col">
            <div className="about-text">
              <h2>About Fairview University College</h2>
              <p>Fairview University College is a registered and accredited institution, focused on providing higher education in health, business, humanities, and TEVETA programs. The Institution is located in Barlastone, Lusaka, Zambia.</p>
              <div style={{ background: 'white', padding: '18px 22px', borderRadius: 10, marginBottom: 14, borderLeft: '4px solid #2a5298' }}>
                <h4 style={{ color: '#2a5298', marginBottom: 6, fontWeight: 700 }}><i className="fas fa-bullseye" style={{ marginRight: 8 }}></i>Our Mission</h4>
                <p style={{ color: '#666', fontSize: 14 }}>TO EDUCATE, EMPOWER AND ESTABLISH THE YOUTHS</p>
              </div>
              <div style={{ background: 'white', padding: '18px 22px', borderRadius: 10, marginBottom: 22, borderLeft: '4px solid #2a5298' }}>
                <h4 style={{ color: '#2a5298', marginBottom: 6, fontWeight: 700 }}><i className="fas fa-eye" style={{ marginRight: 8 }}></i>Our Vision</h4>
                <p style={{ color: '#666', fontSize: 14 }}>EDUCATING AND IMPARTING KNOWLEDGE WITH EXCELLENCE</p>
              </div>
              <a href="tel:+260770839120" className="btn btn-primary">
                <i className="fas fa-phone"></i> Call Now
              </a>
            </div>

            <div>
              <div className="stats-grid" style={{ marginTop: 0 }}>
                {[
                  { num: '28+', label: 'Total Programs' },
                  { num: Object.values(enrollment).reduce((a, b) => a + b, 0) || '1,300+', label: 'Our Students' },
                  { num: '47+', label: 'Skilled Lecturers' },
                  { num: '10+', label: 'Departments' },
                ].map((s) => (
                  <div key={s.label} className="stat-box">
                    <div className="stat-number">{s.num}</div>
                    <div className="stat-label">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PROGRAMS */}
      <section className="section" id="programs">
        <div className="container">
          <h2 className="section-title">Our Available Programs</h2>
          <p className="section-subtitle">Our programs are designed to equip students with skills, knowledge, and values needed for success</p>
          <div className="programs-grid">
            {[
              { type: 'Degree Programme', title: 'Bachelor of Science in Nursing', rating: '4.8', duration: '4 years', desc: 'Prepares students with scientific and practical knowledge in nursing and midwifery.' },
              { type: 'Degree Programme', title: 'Bachelor of Science in Clinical Medical Sciences', rating: '4.7', duration: '4 years', desc: 'Equips learners with clinical and diagnostic medical skills.' },
              { type: 'Degree Programme', title: 'Bachelor of Business Administration', rating: '4.7', duration: '4 years', desc: 'Prepares students for business leadership and entrepreneurship.' },
              { type: 'Degree Programme', title: 'Bachelor of Science in Public Health', rating: '4.8', duration: '4 years', desc: 'Promotes population health and disease prevention strategies.' },
              { type: 'Diploma Programme', title: 'Diploma in Registered Nursing', rating: '4.6', duration: '3 years', desc: 'Prepares nurses for professional practice in hospitals and communities.' },
              { type: 'Diploma Programme', title: 'Diploma in Public Health', rating: '4.6', duration: '3 years', desc: 'Focuses on community health and disease prevention.' },
            ].map((p) => (
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
                  <Link to="/admissions#apply" className="program-cta">Join Us</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SCHOLARSHIP */}
      <section className="section section-gold">
        <div className="scholarship-content">
          <h2 className="scholarship-title">50–100% Scholarship Coverage</h2>
          <p style={{ fontSize: 16, color: '#1e3c72', marginBottom: 14 }}>Transform Your Future with Comprehensive Financial Support</p>
          <div className="scholarship-grid">
            {[
              { icon: 'fa-award', title: 'Up to 100% Tuition Coverage', sub: 'For exceptional students' },
              { icon: 'fa-chart-line', title: 'Merit-Based Awards', sub: '50–75% scholarships' },
              { icon: 'fa-hand-holding-heart', title: 'Need-Based Support', sub: 'Financial assistance' },
              { icon: 'fa-trophy', title: 'Sports & Arts Excellence', sub: 'Talent recognition' },
            ].map((s) => (
              <div key={s.title} className="scholarship-item">
                <i className={`fas ${s.icon}`}></i>
                <div>{s.title}</div>
                <small>{s.sub}</small>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 36 }}>
            <p style={{ color: '#1e3c72', fontWeight: 600, marginBottom: 14 }}>Application Deadline: December 31, 2026</p>
            <div style={{ display: 'flex', gap: 15, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/admissions#apply" className="btn btn-secondary">Apply Now</Link>
              <Link to="/admissions" className="btn btn-secondary">Learn More</Link>
            </div>
          </div>
        </div>
      </section>

      {/* FACILITIES */}
      <section className="section">
        <div className="container">
          <h2 className="section-title">Our Facilities</h2>
          <p className="section-subtitle">Discover world-class facilities at Fairview University</p>
          <div className="facilities-grid">
            {[
              { icon: 'fa-bed', title: 'Modern Accommodation', desc: 'Safe, fully equipped hostels with 24/7 security and student lounges.' },
              { icon: 'fa-chalkboard', title: 'Modern Classrooms', desc: 'Innovative classrooms with smart boards, collaborative seating, and advanced learning technology.' },
              { icon: 'fa-laptop', title: 'Computer Labs', desc: 'Modern labs with high-speed internet, latest software, and hands-on technology access.' },
              { icon: 'fa-hospital', title: 'Hospital on Campus', desc: 'A fully equipped hospital facility for immediate healthcare access and clinical training.' },
              { icon: 'fa-book-open', title: 'Book Library', desc: 'Well-stocked library with extensive resources for academic growth and research.' },
              { icon: 'fa-utensils', title: 'Dining Facilities', desc: 'Modern cafeteria with nutritious meals and comfortable dining spaces.' },
            ].map((f) => (
              <div key={f.title} className="facility-card">
                <div className="facility-image"><i className={`fas ${f.icon}`}></i></div>
                <div className="facility-info">
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LEADERSHIP */}
      <section className="section section-alt">
        <div className="container">
          <h2 className="section-title">Our Leadership Team</h2>
          <p className="section-subtitle">Meet the visionary leaders shaping the future of healthcare education</p>
          <div className="leadership-grid">
            {[
              { name: 'Dr. Humphrey Monde', title: 'Executive Director', msg: '"Welcome to Fairview University, where excellence meets opportunity. We are committed to transforming lives through innovative healthcare education."' },
              { name: 'Dr. Geoffrey Sandala', title: 'Principal', msg: '"Join our vibrant community of future healthcare leaders. We are dedicated to your success through innovative teaching methodologies and hands-on experience."' },
              { name: 'Parson Monde', title: 'Director Finance & Administration', msg: '"Our commitment is to provide quality education at affordable prices, ensuring every deserving student can access world-class healthcare education."' },
            ].map((l) => (
              <div key={l.name} className="leader-card">
                <div className="leader-image"><i className="fas fa-user-circle"></i></div>
                <div className="leader-info">
                  <div className="leader-name">{l.name}</div>
                  <div className="leader-title">{l.title}</div>
                  <div className="leader-message">{l.msg}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BLOG */}
      <section className="section">
        <div className="container">
          <h2 className="section-title">Latest News &amp; Blog</h2>
          <p className="section-subtitle">Stay updated with the latest news and stories from Fairview University</p>
          <div className="blog-grid">
            {[
              { date: 'January 06, 2026', title: 'Congratulations to Mary Sinvula, the new Principal of Fairview University!', excerpt: 'We are delighted to announce the appointment of Mary Sinvula as the new Principal...' },
              { date: 'January 2026 Intake', title: 'We Are Still Enrolling for January 2026 Intake', excerpt: 'Excellent news! We have available spaces for the January 2026 intake across all programs...' },
              { date: 'October 17, 2025', title: 'Fairview University Celebrates Its 10th Graduation Ceremony', excerpt: 'A momentous celebration as Fairview University held its 10th graduation ceremony...' },
            ].map((b) => (
              <div key={b.title} className="blog-card">
                <div className="blog-image"></div>
                <div className="blog-content">
                  <div className="blog-date"><i className="fas fa-calendar"></i> {b.date}</div>
                  <div className="blog-title">{b.title}</div>
                  <div className="blog-excerpt">{b.excerpt}</div>
                  <a href="#" className="read-more">Read More →</a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="section section-gold">
        <div className="scholarship-content">
          <h2 className="scholarship-title">Ready to Transform Your Future?</h2>
          <p style={{ fontSize: 16, color: '#333', marginBottom: 28 }}>Join Fairview University College and become part of a vibrant academic community dedicated to your success.</p>
          <div style={{ display: 'flex', gap: 15, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to={loginLink} className="btn" style={{ background: '#1e3c72', color: 'white' }}>
              <i className={`fas ${currentUser ? 'fa-th-large' : 'fa-sign-in-alt'}`}></i> {loginText}
            </Link>
            <Link to="/admissions#apply" className="btn btn-secondary">
              <i className="fas fa-file-alt"></i> Apply Now
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}

export default Home;
