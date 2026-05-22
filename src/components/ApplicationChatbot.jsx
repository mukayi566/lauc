import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';

// ── Knowledge base ──────────────────────────────────────────────────────────
const KB = {
  programs: [
    { name: 'Bachelor of Science in Nursing',                level: 'Degree',  years: 4, fee: 15000 },
    { name: 'Bachelor of Science in Clinical Medical Sciences', level: 'Degree', years: 4, fee: 16000 },
    { name: 'Bachelor of Business Administration',           level: 'Degree',  years: 4, fee: 14000 },
    { name: 'Bachelor of Science in Public Health',          level: 'Degree',  years: 4, fee: 15000 },
    { name: 'Diploma in Registered Nursing',                 level: 'Diploma', years: 3, fee: 12000 },
    { name: 'Diploma in Public Health',                      level: 'Diploma', years: 3, fee: 11000 },
    { name: 'Diploma in Environmental Health',               level: 'Diploma', years: 3, fee: 11000 },
    { name: 'Diploma in Social Work',                        level: 'Diploma', years: 3, fee: 10000 },
  ],
  requirements: [
    'Grade 12 Certificate or equivalent (GCSE)',
    'Minimum grade C in core subjects',
    'English & Mathematics required',
    'Birth Certificate or National ID (NRC)',
    'Academic results / transcripts',
    'Two referee letters',
    'Medical clearance',
    'Must be 18 years or older',
  ],
  timeline: [
    { event: 'Applications Open',    date: 'December 1, 2025' },
    { event: 'Application Deadline', date: 'December 31, 2025' },
    { event: 'Selection Interviews', date: 'January 5–15, 2026' },
    { event: 'Results Announced',    date: 'January 20, 2026' },
    { event: 'Registration',         date: 'January 25–31, 2026' },
    { event: 'Classes Commence',     date: 'February 2, 2026' },
  ],
  contact: {
    phone: ['+260977787114', '+260966787114', '+260977210769'],
    email: 'contact@fairviewuniversity.com',
    address: 'Balastone Park, Plot G13/42B873, Lusaka',
  },
};

// ── Rule-based response engine ───────────────────────────────────────────────
function getReply(input) {
  const q = input.toLowerCase().trim();

  // Greetings
  if (/^(hi|hello|hey|good\s*(morning|afternoon|evening)|howdy|sup)\b/.test(q)) {
    return {
      text: "👋 Hello! I'm **FairView Assistant**, your admissions guide. How can I help you today?\n\nYou can ask me about:\n• Programs & fees\n• Admission requirements\n• How to apply\n• Important dates\n• Contact information",
    };
  }

  // Application / how to apply
  if (/(how.*(apply|start|begin|submit)|application (process|steps|guide)|apply (now|online|for))/.test(q)) {
    return {
      text: "📋 **How to Apply — Step by Step**\n\n1. **Check eligibility** — Grade 12 certificate with a minimum grade C in core subjects.\n2. **Choose a program** — Browse our Degree and Diploma offerings.\n3. **Prepare documents** — NRC/Passport scan, academic results, two referee letters.\n4. **Fill the form** — Complete the online application on our Admissions page.\n5. **Upload documents** — Attach your NRC/Passport and academic results.\n6. **Submit** — Hit *Submit Application* and watch your inbox for confirmation!\n\nWould you like to go directly to the application form?",
      action: { label: '📝 Apply Now', to: '/admissions#apply' },
    };
  }

  // Programs / courses
  if (/(program|course|degree|diploma|study|offer|availab|major|field)/.test(q)) {
    const degrees  = KB.programs.filter(p => p.level === 'Degree');
    const diplomas = KB.programs.filter(p => p.level === 'Diploma');
    const degList  = degrees.map(p => `• ${p.name} (${p.years} yrs)`).join('\n');
    const dipList  = diplomas.map(p => `• ${p.name} (${p.years} yrs)`).join('\n');
    return {
      text: `🎓 **Programs Offered at Fairview University College**\n\n**Degree Programs (4 years)**\n${degList}\n\n**Diploma Programs (3 years)**\n${dipList}\n\nWant details on fees for a specific program?`,
    };
  }

  // Fees / tuition / cost
  if (/(fee|tuition|cost|price|pay|afford|how much|zk|zmw)/.test(q)) {
    const rows = KB.programs.map(p => `• ${p.name}: ZMW ${p.fee.toLocaleString()}/yr`).join('\n');
    return {
      text: `💰 **Tuition Fees (2026)**\n\n${rows}\n\n*Fees cover tuition, library, laboratory & technology. Accommodation is separate.*\nScholarships and payment plans are available for qualified students.`,
      action: { label: '📊 See Full Fee Table', to: '/admissions' },
    };
  }

  // Requirements / eligibility / documents
  if (/(require|eligib|document|need|qualif|criteria|nrc|passport|grade 12|gcse|transcript)/.test(q)) {
    const list = KB.requirements.map(r => `• ${r}`).join('\n');
    return {
      text: `📋 **Admission Requirements**\n\n${list}\n\n*International students also need a valid passport, English language test results, and proof of finances.*`,
      action: { label: '📄 View Full Requirements', to: '/admissions#requirements' },
    };
  }

  // Dates / timeline / deadline / intake
  if (/(date|deadline|timeline|intake|when|open|start|close|semester|calendar|schedule)/.test(q)) {
    const tl = KB.timeline.map(t => `• **${t.event}:** ${t.date}`).join('\n');
    return {
      text: `📅 **Admissions Timeline 2026**\n\n${tl}\n\n⚠️ Applications close **December 31, 2025** — don't miss out!`,
    };
  }

  // Nursing
  if (/(nurs)/.test(q)) {
    return {
      text: `🏥 **Nursing Programs at Fairview**\n\n• **Bachelor of Science in Nursing** — 4 years · ZMW 15,000/yr\n• **Diploma in Registered Nursing** — 3 years · ZMW 12,000/yr\n\nBoth programs include clinical placements in accredited hospitals. Minimum Grade 12 with Biology & English at grade C or above is required.`,
      action: { label: '📝 Apply for Nursing', to: '/admissions#apply' },
    };
  }

  // Business / BBA
  if (/(business|bba|administration|management|marketing|finance)/.test(q)) {
    return {
      text: `💼 **Bachelor of Business Administration (BBA)**\n\n• Duration: 4 years\n• Fee: ZMW 14,000/year · Total: ZMW 56,000\n• Core modules: Management, Finance, Marketing, Entrepreneurship\n• Strong industry links with Zambian businesses\n\nReady to apply?`,
      action: { label: '📝 Apply for BBA', to: '/admissions#apply' },
    };
  }

  // Public health
  if (/(public health|environmental health|community health)/.test(q)) {
    return {
      text: `🌍 **Public & Environmental Health Programs**\n\n• **BSc Public Health** (Degree, 4 yrs) — ZMW 15,000/yr\n• **Diploma in Public Health** (3 yrs) — ZMW 11,000/yr\n• **Diploma in Environmental Health** (3 yrs) — ZMW 11,000/yr\n\nThese programs prepare graduates for careers in community health, policy, and environmental management.`,
    };
  }

  // Social work
  if (/(social work|social|welfare|counsell)/.test(q)) {
    return {
      text: `🤝 **Diploma in Social Work**\n\n• Duration: 3 years\n• Fee: ZMW 10,000/year · Total: ZMW 30,000\n• Covers community development, counselling, and welfare policy.\n• Graduates work with NGOs, government agencies, and hospitals.`,
      action: { label: '📝 Apply for Social Work', to: '/admissions#apply' },
    };
  }

  // Scholarship / financial aid
  if (/(scholarship|bursary|financial aid|loan|support|sponsor)/.test(q)) {
    return {
      text: `🏆 **Scholarships & Financial Aid**\n\nFairview University College offers:\n• **Merit scholarships** for outstanding academic performance\n• **Payment plans** — installment options for tuition\n• **Bursaries** for financially disadvantaged students\n\nFor more details, contact our admissions office directly.`,
      action: { label: '📞 Contact Admissions', to: '/#contact' },
    };
  }

  // International students
  if (/(international|foreign|abroad|outside zambia|visa|work permit)/.test(q)) {
    return {
      text: `🌐 **International Students**\n\nWe welcome students from all countries! You will need:\n• Valid Passport\n• English language proficiency test results\n• Proof of financial means\n• Visa sponsorship is available upon admission\n\nContact our admissions team for country-specific requirements.`,
      action: { label: '✉️ Email Admissions', to: '/#contact' },
    };
  }

  // Contact / location / address / phone / email
  if (/(contact|phone|call|email|address|locat|where|find|reach|office|visit)/.test(q)) {
    const phones = KB.contact.phone.map(p => `📞 ${p}`).join('\n');
    return {
      text: `📍 **Contact & Location**\n\n${phones}\n✉️ ${KB.contact.email}\n🏛️ ${KB.contact.address}\n\nOur admissions office is open Monday–Friday, 08:00–17:00.`,
    };
  }

  // Login / account / portal
  if (/(log in|login|sign in|account|portal|access|student portal|dashboard)/.test(q)) {
    return {
      text: `🔐 **Student Portal**\n\nExisting students and applicants can log in to track application status, view results, and access the student dashboard.`,
      action: { label: '🔑 Login to Portal', to: '/login' },
    };
  }

  // About / accreditation
  if (/(about|accredit|recogni|history|who are|mission|vision|overview)/.test(q)) {
    return {
      text: `🎓 **About Fairview University College**\n\nFairview is a registered and accredited institution offering quality higher education in healthcare, business, and humanities.\n\nWe are committed to producing skilled, ethical, and community-centred graduates who make a difference in Zambia and beyond.`,
      action: { label: '🔍 Learn More About Us', to: '/about' },
    };
  }

  // Thank you
  if (/(thank|thanks|thx|appreciate|helpful|great|awesome|perfect)/.test(q)) {
    return {
      text: "😊 You're welcome! Is there anything else I can help you with? I'm here anytime you have questions about applying to Fairview University College.",
    };
  }

  // Goodbye
  if (/(bye|goodbye|see you|later|done|exit|quit|close)/.test(q)) {
    return {
      text: "👋 Goodbye! Best of luck with your application to Fairview University College. Feel free to chat with me anytime. 🎓",
    };
  }

  // Fallback
  return {
    text: "🤔 I'm not quite sure I understood that. Here are some things I can help you with:\n\n• **Programs** — \"What programs do you offer?\"\n• **Fees** — \"How much is the tuition?\"\n• **Requirements** — \"What documents do I need?\"\n• **How to apply** — \"How do I apply?\"\n• **Dates** — \"When does the application close?\"\n• **Contact** — \"How do I contact admissions?\"\n\nJust type your question in plain English!",
  };
}

// ── Quick-reply suggestions ──────────────────────────────────────────────────
const SUGGESTIONS = [
  'How do I apply?',
  'What programs are offered?',
  'What are the fees?',
  'What documents do I need?',
  'Application deadline?',
  'Contact admissions',
];

// ── Chatbot Component ────────────────────────────────────────────────────────
const ApplicationChatbot = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      from: 'bot',
      text: "Hi! I'm **FairView Assistant** your personal admissions guide.\n\nI can help you with programs, fees, requirements, and how to apply. What would you like to know?",
      time: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  // Focus input when chat opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
      setUnread(0);
    }
  }, [open]);

  const sendMessage = (text) => {
    const trimmed = (text || input).trim();
    if (!trimmed) return;

    const userMsg = { id: Date.now(), from: 'user', text: trimmed, time: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setTyping(true);

    // Simulate thinking delay
    setTimeout(() => {
      const reply = getReply(trimmed);
      setMessages(prev => [...prev, { id: Date.now() + 1, from: 'bot', ...reply, time: new Date() }]);
      setTyping(false);
      if (!open) setUnread(n => n + 1);
    }, 700 + Math.random() * 500);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Render markdown-lite (bold, newlines)
  const renderText = (text) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) =>
      part.startsWith('**') && part.endsWith('**')
        ? <strong key={i}>{part.slice(2, -2)}</strong>
        : <span key={i}>{part}</span>
    );
  };

  const formatTime = (d) =>
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <>
      {/* ── Floating toggle button ── */}
      <button
        id="chatbot-toggle"
        className="chatbot-fab"
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close chat assistant' : 'Open admissions chat assistant'}
        title="Chat with our Admissions Assistant"
      >
        {open ? (
          <i className="fas fa-times" />
        ) : (
          <>
            <i className="fas fa-comments" />
            {unread > 0 && <span className="chatbot-badge">{unread}</span>}
          </>
        )}
      </button>

      {/* ── Chat window ── */}
      <div className={`chatbot-window${open ? ' chatbot-open' : ''}`} role="dialog" aria-label="Admissions Chatbot">
        {/* Header */}
        <div className="chatbot-header">
          <div className="chatbot-avatar">
            <i className="fas fa-graduation-cap" />
          </div>
          <div className="chatbot-header-info">
            <span className="chatbot-name">FairView Assistant</span>
            <span className="chatbot-status"><span className="chatbot-dot" />Online · Always here to help</span>
          </div>
          <button className="chatbot-close" onClick={() => setOpen(false)} aria-label="Close chatbot">
            <i className="fas fa-times" />
          </button>
        </div>

        {/* Messages */}
        <div className="chatbot-messages" aria-live="polite">
          {messages.map(msg => (
            <div key={msg.id} className={`chatbot-msg chatbot-msg-${msg.from}`}>
              {msg.from === 'bot' && (
                <div className="chatbot-msg-icon"><i className="fas fa-robot" /></div>
              )}
              <div className="chatbot-bubble">
                <p className="chatbot-bubble-text">
                  {msg.text.split('\n').map((line, i) => (
                    <React.Fragment key={i}>
                      {renderText(line)}
                      {i < msg.text.split('\n').length - 1 && <br />}
                    </React.Fragment>
                  ))}
                </p>
                {msg.action && (
                  <Link
                    to={msg.action.to}
                    className="chatbot-action-btn"
                    onClick={() => setOpen(false)}
                  >
                    {msg.action.label}
                  </Link>
                )}
                <span className="chatbot-time">{formatTime(msg.time)}</span>
              </div>
            </div>
          ))}

          {typing && (
            <div className="chatbot-msg chatbot-msg-bot">
              <div className="chatbot-msg-icon"><i className="fas fa-robot" /></div>
              <div className="chatbot-bubble chatbot-typing">
                <span /><span /><span />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick replies */}
        <div className="chatbot-suggestions">
          {SUGGESTIONS.map(s => (
            <button key={s} className="chatbot-chip" onClick={() => sendMessage(s)}>
              {s}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="chatbot-input-row">
          <input
            ref={inputRef}
            className="chatbot-input"
            type="text"
            placeholder="Ask me anything about applying…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            aria-label="Type your message"
            maxLength={300}
          />
          <button
            className="chatbot-send"
            onClick={() => sendMessage()}
            disabled={!input.trim()}
            aria-label="Send message"
          >
            <i className="fas fa-paper-plane" />
          </button>
        </div>
      </div>
    </>
  );
};

export default ApplicationChatbot;
