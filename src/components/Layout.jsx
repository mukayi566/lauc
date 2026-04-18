import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import logo from '../assets/logo.png';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const { currentUser, userRole, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  const getDashboardLink = () => {
    if (userRole === 'admin') return '/admin-dashboard';
    if (userRole === 'staff') return '/staff-dashboard';
    return '/student-dashboard';
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar" style={{
      background: scrolled ? 'rgba(15, 30, 75, 0.92)' : 'rgba(20, 40, 90, 0.55)',
      boxShadow: scrolled ? '0 4px 24px rgba(0,0,0,0.25)' : 'none',
    }}>
      <div className="nav-container">
        <Link to="/" className="nav-brand">
          <img src={logo} alt="LAUC Logo" className="nav-logo" />
          <span className="nav-text">London American University College</span>
        </Link>

        <div className={`nav-links${menuOpen ? ' open' : ''}`}>
          <Link to="/" className={isActive('/') ? 'active' : ''} onClick={() => setMenuOpen(false)}>Home</Link>
          <Link to="/about" className={isActive('/about') ? 'active' : ''} onClick={() => setMenuOpen(false)}>About Us</Link>
          <Link to="/programs" className={isActive('/programs') ? 'active' : ''} onClick={() => setMenuOpen(false)}>Programs</Link>
          <Link to="/admissions" className={isActive('/admissions') ? 'active' : ''} onClick={() => setMenuOpen(false)}>Admissions</Link>
          
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
            ) : (
              <Link to="/login" className="btn btn-secondary" onClick={() => setMenuOpen(false)} style={{ justifyContent: 'center' }}>
                <i className="fas fa-sign-in-alt"></i> Login
              </Link>
            )}
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
              <button onClick={signOut} className="btn btn-outline-light" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: 'white', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="fas fa-sign-out-alt"></i> Logout
              </button>
            </>
          ) : (
            <Link to="/login" className="btn btn-secondary">
              <i className="fas fa-sign-in-alt"></i> Login
            </Link>
          )}
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

const Footer = () => (
  <footer className="footer" id="contact">
    <div className="footer-content">
      <div className="footer-section">
        <h3><i className="fas fa-graduation-cap" style={{ marginRight: 8 }}></i>London American University College</h3>
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
        <Link to="/about">About Us</Link>
        <Link to="/programs">Programs</Link>
        <Link to="/admissions">Admissions</Link>
        <a href="#">FAQ's</a>
      </div>

      <div className="footer-section">
        <h3>Contact Information</h3>
        <div className="footer-contact">
          <div><i className="fas fa-map-marker-alt"></i> Balastone Park, Plot G13/42B873, Lusaka</div>
          <div style={{ marginTop: 8 }}><i className="fas fa-envelope"></i> contact@londonamericanuniversitycollege.com</div>
          <div style={{ marginTop: 8 }}><i className="fas fa-phone"></i> +260977476614</div>
          <div style={{ marginTop: 8 }}><i className="fas fa-phone"></i> +260770839120</div>
        </div>
      </div>

      <div className="footer-section">
        <h3>Newsletter</h3>
        <p style={{ color: '#ccc', marginBottom: 14, fontSize: 13 }}>Subscribe to get latest updates and news</p>
        <form className="newsletter-form" onSubmit={(e) => { e.preventDefault(); alert('Thank you for subscribing!'); }}>
          <input type="email" placeholder="Your Email" />
          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
            Subscribe Now
          </button>
        </form>
      </div>
    </div>

    <div className="footer-bottom">
      <p>© Copyright {new Date().getFullYear()} London American University College. All Rights Reserved.</p>
    </div>
  </footer>
);

const Layout = ({ children }) => (
  <>
    <Navbar />
    <main>{children}</main>
    <Footer />
  </>
);

export default Layout;
