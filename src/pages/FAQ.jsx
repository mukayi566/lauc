import React, { useState } from 'react';
import Layout from '../components/Layout';

const FAQ = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');

    const categories = ['All', 'Admissions', 'Academic', 'Finance', 'Student Life', 'IT Support'];

    const faqs = [
        {
            category: 'Admissions',
            question: 'How do I apply for a scholarship?',
            answer: 'You can apply for a scholarship during your initial application. Ensure you check the "Scholarship Interest" box and provide the necessary supporting documents for merit or need-based evaluation.'
        },
        {
            category: 'Admissions',
            question: 'What are the minimum entry requirements?',
            answer: 'Entry requirements vary by program. Generally, for degree programs, you need five "O" level credits or better, including English and Mathematics. Specific science credits are required for nursing and medical sciences.'
        },
        {
            category: 'Academic',
            question: 'When do semesters start?',
            answer: 'The academic year at Fairview is divided into two main semesters: the January Intake and the July Intake. Orientation usually happens in the first week of each intake.'
        },
        {
            category: 'Finance',
            question: 'What are the payment options for tuition fees?',
            answer: 'We offer flexible payment plans. Students can pay in full at the start of the semester or opt for an installment plan (50% initial payment, followed by monthly installments).'
        },
        {
            category: 'Student Life',
            question: 'Is accommodation available on campus?',
            answer: 'Yes, we provide modern, safe hostel facilities for both male and female students. Bed spaces are limited and allocated on a first-come, first-served basis.'
        },
        {
            category: 'IT Support',
            question: 'How do I reset my portal password?',
            answer: 'If you are a student or staff member, you can use the "Forgot Password" link on your respective login page. Alternatively, visit the IT Department for a manual reset.'
        },
        {
            category: 'Academic',
            question: 'How can I access my exam docket?',
            answer: 'Exam dockets are generated automatically in the Student Dashboard once your tuition payments are cleared and you are registered for your courses.'
        }
    ];

    const filteredFaqs = faqs.filter(faq => {
        const matchesSearch = faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
            faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = activeCategory === 'All' || faq.category === activeCategory;
        return matchesSearch && matchesCategory;
    });

    const [openIndex, setOpenIndex] = useState(null);

    return (
        <Layout>
            <div className="faq-page">
                {/* Hero Section */}
                <div className="faq-hero">
                    <div className="container">
                        <h1>How can we help you?</h1>
                        <p>Find answers to common questions about Fairview University College.</p>
                        <div className="faq-search-bar">
                            <i className="fas fa-search"></i>
                            <input
                                type="text"
                                placeholder="Search for questions..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="container section">
                    <div className="faq-layout">
                        {/* Sidebar Categories */}
                        <aside className="faq-categories">
                            <h3>Categories</h3>
                            <ul>
                                {categories.map(cat => (
                                    <li
                                        key={cat}
                                        className={activeCategory === cat ? 'active' : ''}
                                        onClick={() => setActiveCategory(cat)}
                                    >
                                        {cat}
                                    </li>
                                ))}
                            </ul>
                        </aside>

                        {/* FAQ List */}
                        <main className="faq-list">
                            {filteredFaqs.length > 0 ? (
                                filteredFaqs.map((faq, index) => (
                                    <div
                                        key={index}
                                        className={`faq-item ${openIndex === index ? 'open' : ''}`}
                                        onClick={() => setOpenIndex(openIndex === index ? null : index)}
                                    >
                                        <div className="faq-question">
                                            <span>{faq.question}</span>
                                            <i className={`fas ${openIndex === index ? 'fa-minus' : 'fa-plus'}`}></i>
                                        </div>
                                        {openIndex === index && (
                                            <div className="faq-answer">
                                                <p>{faq.answer}</p>
                                                <div className="faq-tag">{faq.category}</div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="faq-no-results">
                                    <i className="fas fa-search"></i>
                                    <p>No questions found matching your search.</p>
                                </div>
                            )}
                        </main>
                    </div>
                </div>

                {/* Contact Support Section */}
                <section className="faq-contact section section-alt">
                    <div className="container text-center">
                        <h2>Still have questions?</h2>
                        <p>If you can't find the answer you're looking for, our team is here to help.</p>
                        <div className="faq-contact-cards">
                            <div className="faq-contact-card">
                                <i className="fas fa-envelope"></i>
                                <h3>Email Us</h3>
                                <p>info@fairview.edu</p>
                            </div>
                            <div className="faq-contact-card">
                                <i className="fas fa-phone"></i>
                                <h3>Call Us</h3>
                                <p>+260 770 839 120</p>
                            </div>
                            <div className="faq-contact-card">
                                <i className="fas fa-map-marker-alt"></i>
                                <h3>Visit Us</h3>
                                <p>Barlastone Park, Lusaka</p>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            <style>{`
                .faq-hero {
                    background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
                    color: white;
                    padding: 80px 0;
                    text-align: center;
                }
                .faq-hero h1 { font-size: 3rem; margin-bottom: 20px; }
                .faq-hero p { font-size: 1.2rem; opacity: 0.9; margin-bottom: 40px; }
                
                .faq-search-bar {
                    max-width: 600px;
                    margin: 0 auto;
                    position: relative;
                }
                .faq-search-bar i {
                    position: absolute;
                    left: 20px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #666;
                }
                .faq-search-bar input {
                    width: 100%;
                    padding: 18px 20px 18px 55px;
                    border-radius: 50px;
                    border: none;
                    font-size: 1rem;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                }

                .faq-layout {
                    display: grid;
                    grid-template-columns: 250px 1fr;
                    gap: 40px;
                    margin-top: 40px;
                }

                .faq-categories h3 { margin-bottom: 20px; font-weight: 700; color: #1e3c72; }
                .faq-categories ul { list-style: none; padding: 0; }
                .faq-categories li {
                    padding: 12px 20px;
                    margin-bottom: 8px;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    color: #555;
                }
                .faq-categories li:hover { background: #f0f7ff; color: #1e3c72; }
                .faq-categories li.active { background: #1e3c72; color: white; font-weight: 600; }

                .faq-item {
                    background: white;
                    border-radius: 12px;
                    margin-bottom: 15px;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.05);
                    overflow: hidden;
                    cursor: pointer;
                    transition: transform 0.2s ease;
                    border: 1px solid #eee;
                }
                .faq-item:hover { transform: translateY(-2px); }
                .faq-item.open { border-color: #2a5298; }

                .faq-question {
                    padding: 20px 25px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-weight: 600;
                    color: #333;
                }
                .faq-question i { color: #2a5298; font-size: 0.9rem; }

                .faq-answer {
                    padding: 0 25px 25px;
                    color: #666;
                    line-height: 1.6;
                    animation: fadeIn 0.3s ease;
                }
                .faq-tag {
                    display: inline-block;
                    margin-top: 15px;
                    padding: 4px 12px;
                    background: #e0f2fe;
                    color: #0369a1;
                    border-radius: 4px;
                    font-size: 0.8rem;
                    font-weight: 600;
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-5px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .faq-contact-cards {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 30px;
                    margin-top: 40px;
                }
                .faq-contact-card {
                    background: white;
                    padding: 30px;
                    border-radius: 15px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.05);
                }
                .faq-contact-card i { font-size: 2.5rem; color: #2a5298; margin-bottom: 20px; }
                .faq-contact-card h3 { margin-bottom: 10px; font-weight: 700; }
                .faq-contact-card p { color: #666; font-size: 1.1rem; }

                @media (max-width: 768px) {
                    .faq-layout { grid-template-columns: 1fr; }
                    .faq-contact-cards { grid-template-columns: 1fr; }
                    .faq-hero h1 { font-size: 2rem; }
                }
            `}</style>
        </Layout>
    );
};

export default FAQ;
