import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';

const portals = [
  {
    role: 'Student',
    icon: 'fa-user-graduate',
    route: '/student-login',
    description: 'Access your results, timetable, academic records, fee statements and more.',
    color: '#1e3c72',
    accent: '#2a5298',
    gradient: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
    badge: 'Student Portal',
    features: ['View Results', 'Timetable', 'Fee Statement', 'Academic Records'],
  },
  {
    role: 'Lecturer',
    icon: 'fa-chalkboard-teacher',
    route: '/staff-login',
    description: 'Upload grades, manage class rosters, and access teaching resources.',
    color: '#065f46',
    accent: '#059669',
    gradient: 'linear-gradient(135deg, #065f46 0%, #059669 100%)',
    badge: 'Staff Portal',
    features: ['Upload Results', 'Manage Classes', 'Student Records', 'Reports'],
  },
  {
    role: 'Admin',
    icon: 'fa-user-shield',
    route: '/admin-login',
    description: 'Full system access — manage students, staff, programs, and finances.',
    color: '#7c2d12',
    accent: '#dc2626',
    gradient: 'linear-gradient(135deg, #7c2d12 0%, #c2410c 100%)',
    badge: 'Admin Portal',
    features: ['System Management', 'User Control', 'Analytics', 'Settings'],
  },
  {
    role: 'Registrar',
    icon: 'fa-id-badge',
    route: '/registrar-login',
    description: 'Academic administration — handle registrations, enrollments, and dockets.',
    color: '#1e40af',
    accent: '#3b82f6',
    gradient: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
    badge: 'Registrar Portal',
    features: ['Student Registration', 'Course Enrollment', 'Exam Dockets', 'Academic Records'],
  },
];

const PortalGateway = () => (
  <Layout>
    {/* Hero Banner */}
    <section
      style={{
        background: 'linear-gradient(135deg, #0d2b5e 0%, #1e3c72 50%, #2a5298 100%)',
        padding: '80px 24px 60px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* decorative circles */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: 320, height: 320, borderRadius: '50%', background: 'rgba(245,158,11,0.08)' }} />
        <div style={{ position: 'absolute', bottom: '-60px', left: '-60px', width: 240, height: 240, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>
          <i className="fas fa-university" style={{ color: '#f59e0b' }}></i>
        </div>
        <h1 style={{ fontSize: 'clamp(28px,4vw,46px)', fontWeight: 800, color: 'white', marginBottom: 14, letterSpacing: '-0.03em' }}>
          Fairview University Portal
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16, maxWidth: 540, margin: '0 auto', lineHeight: 1.75 }}>
          Select your portal below to sign in. Each portal is tailored to your role within the institution.
        </p>
      </div>
    </section>

    {/* Portal Cards */}
    <section style={{ background: '#f8faff', padding: '60px 24px 80px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 28,
        }}>
          {portals.map((p) => (
            <div
              key={p.role}
              style={{
                background: 'white',
                borderRadius: 20,
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(13,43,94,0.10)',
                border: '1px solid rgba(30,60,114,0.07)',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.25s ease, box-shadow 0.25s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-8px)'; e.currentTarget.style.boxShadow = '0 20px 50px rgba(13,43,94,0.16)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(13,43,94,0.10)'; }}
            >
              {/* Card header with gradient */}
              <div style={{ background: p.gradient, padding: '36px 28px 28px', textAlign: 'center' }}>
                <div style={{
                  width: 72, height: 72, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px',
                  fontSize: 30, color: 'white',
                  backdropFilter: 'blur(8px)',
                }}>
                  <i className={`fas ${p.icon}`}></i>
                </div>
                <div style={{
                  display: 'inline-block',
                  background: 'rgba(255,255,255,0.15)',
                  color: 'white',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  padding: '4px 12px',
                  borderRadius: 20,
                  marginBottom: 10,
                }}>
                  {p.badge}
                </div>
                <h2 style={{ color: 'white', fontWeight: 800, fontSize: 22, margin: 0 }}>{p.role} Login</h2>
              </div>

              {/* Card body */}
              <div style={{ padding: '28px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.75, marginBottom: 20 }}>{p.description}</p>

                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {p.features.map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#374151' }}>
                      <span style={{
                        width: 22, height: 22, borderRadius: '50%',
                        background: `${p.color}18`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <i className="fas fa-check" style={{ fontSize: 10, color: p.color }}></i>
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  to={p.route}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    padding: '13px 20px',
                    background: p.gradient,
                    color: 'white',
                    borderRadius: 10,
                    fontWeight: 700,
                    fontSize: 14,
                    textDecoration: 'none',
                    transition: 'all 0.25s',
                    marginTop: 'auto',
                    boxShadow: `0 4px 14px ${p.color}30`,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.1)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <i className="fas fa-sign-in-alt"></i> Enter {p.role} Portal
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, marginTop: 40 }}>
          <i className="fas fa-lock" style={{ marginRight: 6 }}></i>
          All portals are secured with encrypted authentication. Contact{' '}
          <a href="mailto:contact@fairviewuniversity.com" style={{ color: '#2a5298', fontWeight: 600 }}>
            IT Support
          </a>{' '}
          if you have trouble logging in.
        </p>
      </div>
    </section>
  </Layout>
);

export default PortalGateway;
