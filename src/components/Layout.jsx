import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import logo from '../assets/logo.png';
import { useAuth } from '../contexts/AuthContext';
import ApplicationChatbot from './ApplicationChatbot';
import toast from 'react-hot-toast';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const Navbar = () => {
  const { currentUser, userRole, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  const getDashboardLink = () => {
    if (userRole === 'admin') return '/admin-dashboard';
    if (userRole === 'staff') return '/staff-dashboard';
    if (userRole === 'registrar') return '/registrar-dashboard';
    if (userRole === 'it') return '/it-dashboard';
    if (userRole === 'finance') return '/finance-dashboard';
    return '/student-dashboard';
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (path) => location.pathname === path;

  // Pages that should have a solid navbar (dark text) by default
  const isSolidPage = ['/elearning', '/login', '/student-login', '/staff-login', '/admin-login', '/registrar-login'].includes(location.pathname);

  return (
    <nav className={`navbar ${scrolled || isSolidPage ? 'navbar-scrolled' : 'navbar-transparent'}`}>
      <div className="nav-container">
        <Link to="/" className="nav-brand">
          <img src={logo} alt="Fairview University Logo" className="nav-logo" />
          <span className="nav-text">Fairview University College</span>
        </Link>
        <div className={`nav-links${menuOpen ? ' open' : ''}`}>
          <Link to="/" className={isActive('/') ? 'active' : ''} onClick={() => setMenuOpen(false)}>Home</Link>
          <div className="nav-item-dropdown">
            <button className="nav-dropdown-toggle">
              About Us <i className="fas fa-chevron-down"></i>
            </button>
            <div className="nav-dropdown-menu">
              <Link to="/about" className="nav-dropdown-item" onClick={() => setMenuOpen(false)}>
                <i className="fas fa-university"></i> About Fairview
              </Link>
              <Link to="/faq" className="nav-dropdown-item" onClick={() => setMenuOpen(false)}>
                <i className="fas fa-question-circle"></i> FAQ's
              </Link>
            </div>
          </div>
          <Link to="/programs" className={isActive('/programs') ? 'active' : ''} onClick={() => setMenuOpen(false)}>Programs</Link>
          <Link to="/admissions" className={isActive('/admissions') ? 'active' : ''} onClick={() => setMenuOpen(false)}>Admissions</Link>
          <Link to="/fees-tuition" className={isActive('/fees-tuition') ? 'active' : ''} onClick={() => setMenuOpen(false)}>Fees & Tuition</Link>
          <div className="nav-item-dropdown">
            <button className="nav-dropdown-toggle">
              eResources <i className="fas fa-chevron-down"></i>
            </button>
            <div className="nav-dropdown-menu">
              <Link to="/elearning" className="nav-dropdown-item" onClick={() => setMenuOpen(false)}>
                <i className="fas fa-laptop-code"></i> E-Learning
              </Link>
              <Link to="/research" className="nav-dropdown-item" onClick={() => setMenuOpen(false)}>
                <i className="fas fa-book-reader"></i> Research Repository
              </Link>
              <Link to="/student-login" className="nav-dropdown-item" onClick={() => setMenuOpen(false)}>
                <i className="fas fa-user-graduate"></i> Student Portal
              </Link>
              <Link to="/privacy-policy" className="nav-dropdown-item" onClick={() => setMenuOpen(false)}>
                <i className="fas fa-shield-alt"></i> Privacy Policy
              </Link>
              <Link to="/terms-conditions" className="nav-dropdown-item" onClick={() => setMenuOpen(false)}>
                <i className="fas fa-file-contract"></i> Terms & Conditions
              </Link>
            </div>
          </div>

          {/* Mobile only buttons */}
          <div className="mobile-only-nav">
            {currentUser ? (
              <>
                <Link to={getDashboardLink()} className="btn btn-secondary" onClick={() => setMenuOpen(false)} style={{ justifyContent: 'center' }}>
                  <i className="fas fa-th-large"></i> Dashboard
                </Link>
                <button onClick={() => { signOut(); setMenuOpen(false); }} className="btn btn-outline-light" style={{ justifyContent: 'center', marginTop: 10 }}>
                  <i className="fas fa-sign-out-alt"></i> Logout
                </button>
              </>
            ) : null}
            <Link to="/admissions#apply" className="btn btn-primary" onClick={() => setMenuOpen(false)} style={{ justifyContent: 'center', marginTop: 10 }}>
              <i className="fas fa-file-alt"></i> Apply Now
            </Link>
          </div>
        </div>

        <div className="nav-buttons">
          {currentUser ? (
            <>
              <Link to={getDashboardLink()} className="btn btn-secondary">
                <i className="fas fa-th-large"></i> Dashboard
              </Link>
              <button onClick={signOut} className="btn btn-outline-light" style={{ background: 'transparent', border: '1.5px solid var(--clr-blue)', color: 'var(--clr-blue)', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="fas fa-sign-out-alt"></i> Logout
              </button>
            </>
          ) : null}
          <Link to="/admissions#apply" className="btn btn-primary">
            <i className="fas fa-file-alt"></i> Apply Now
          </Link>
          <button className="mobile-menu-btn" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            <i className={`fas ${menuOpen ? 'fa-times' : 'fa-bars'}`}></i>
          </button>
        </div>
      </div>
    </nav>
  );
};

const Footer = () => {
  const [email, setEmail] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'newsletter_subscriptions'), {
        email: email.trim(),
        subscribedAt: serverTimestamp(),
        source: 'footer'
      });
      toast.success('Thank you for subscribing to our newsletter!', {
        duration: 4000,
        position: 'bottom-center',
        icon: '✉️',
      });
      setEmail('');
    } catch (err) {
      console.error('Newsletter error:', err);
      toast.error('Subscription failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="footer" id="contact">
      <div className="footer-content">
        <div className="footer-section">
          <h3><i className="fas fa-graduation-cap" style={{ marginRight: 8 }}></i>Fairview University College</h3>
          <p style={{ color: '#ccc', lineHeight: 1.9, fontSize: 13 }}>
            A registered and accredited institution providing quality higher education in healthcare, business, and humanities programs.
          </p>
          <div className="social-links">
            <a href="#" aria-label="Facebook"><i className="fab fa-facebook-f"></i></a>
            <a href="#" aria-label="Twitter"><i className="fab fa-twitter"></i></a>
            <a href="#" aria-label="LinkedIn"><i className="fab fa-linkedin-in"></i></a>
            <a href="#" aria-label="Instagram"><i className="fab fa-instagram"></i></a>
          </div>
        </div>

        <div className="footer-section">
          <h3>Quick Links</h3>
          <Link to="/">Home</Link>
          <Link to="/about">About</Link>
          <Link to="/programs">Programs</Link>
          <Link to="/admissions">Admissions</Link>
          <Link to="/fees-tuition">Fees & Tuition</Link>
        </div>

        <div className="footer-section">
          <h3>eResources</h3>
          <Link to="/elearning">E-Learning</Link>
          <Link to="/research">Research Repository</Link>
          <Link to="/student-login" style={{ color: '#facc15', fontWeight: 600 }}>
            <i className="fas fa-user-lock" style={{ marginRight: 6 }}></i>Student Portal
          </Link>
          <Link to="/faq">FAQ's</Link>
          <Link to="/privacy-policy">Privacy Policy</Link>
          <Link to="/terms-conditions">Terms & Conditions</Link>
        </div>

        <div className="footer-section">
          <h3>Contact Information</h3>
          <div className="footer-contact">
            <div><i className="fas fa-map-marker-alt"></i> Plot 70A/77, off Zambezi Rd, Foxdale, Lusaka</div>
            <div style={{ marginTop: 8 }}><i className="fas fa-building"></i> Lottie House 5th Floor, Cairo Road</div>
            <div style={{ marginTop: 8 }}><i className="fas fa-envelope"></i> fairviewuniversitycollege02@gmail.com</div>
            <div style={{ marginTop: 8 }}><i className="fas fa-phone"></i> +260 977 787 114</div>
            <div style={{ marginTop: 8 }}><i className="fas fa-phone"></i> +260 966 787 114</div>
          </div>
        </div>

        <div className="footer-section">
          <h3>Newsletter</h3>
          <p style={{ color: '#ccc', marginBottom: 14, fontSize: 13 }}>Subscribe to get latest updates and news</p>
          <form className="newsletter-form" onSubmit={handleSubscribe}>
            <input
              type="email"
              placeholder="Your Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
              disabled={loading}
            >
              {loading ? <i className="fas fa-spinner fa-spin"></i> : 'Subscribe Now'}
            </button>
          </form>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© Copyright {new Date().getFullYear()} Fairview University. All Rights Reserved.</p>
      </div>
    </footer>
  );
};

const Layout = ({ children }) => {
  const location = useLocation();
  const isELearningPage = location.pathname === '/elearning';

  return (
    <>
      {!isELearningPage && <Navbar />}
      <main>{children}</main>
      <Footer />
      <ApplicationChatbot />
    </>
  );
};

export default Layout;
