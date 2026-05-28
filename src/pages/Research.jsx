import React, { useState } from 'react';
import Layout from '../components/Layout';

const Research = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeField, setActiveField] = useState('All');

    const fields = ['All', 'Nursing', 'Public Health', 'Clinical Sciences', 'Business administration', 'Pharmacy'];

    const papers = [
        {
            title: 'Modern Nursing Practices in Rural Zambia',
            author: 'Dr. Jane Mwanamwambwa',
            year: '2025',
            field: 'Nursing',
            abstract: 'This research explores the integration of traditional and modern nursing practices in rural healthcare centers in Zambia.',
            downloadUrl: '#'
        },
        {
            title: 'Impact of Digitalization on Small Business Growth',
            author: 'Prof. Simon Kalaba',
            year: '2024',
            field: 'Business administration',
            abstract: 'A comprehensive study on how small-scale enterprises are adopting digital tools for financial management and marketing.',
            downloadUrl: '#'
        },
        {
            title: 'Public Health Strategies Post-Pandemic',
            author: 'Dr. Mwaka Chanda',
            year: '2025',
            field: 'Public Health',
            abstract: 'Analyzing the resilience of community health networks in response to emerging infectious diseases.',
            downloadUrl: '#'
        },
        {
            title: 'Efficacy of Herbal Medicines in Clinical Trials',
            author: 'Lecturer Brian Mulenga',
            year: '2023',
            field: 'Pharmacy',
            abstract: 'Reviewing the clinical outcomes of local herbal remedies when used alongside conventional pharmacotherapy.',
            downloadUrl: '#'
        }
    ];

    const filteredPapers = papers.filter(paper => {
        const matchesSearch = paper.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            paper.author.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesField = activeField === 'All' || paper.field === activeField;
        return matchesSearch && matchesField;
    });

    return (
        <Layout>
            <div className="research-page">
                {/* Hero Section */}
                <div className="research-hero">
                    <div className="container">
                        <h1>Research Repository</h1>
                        <p>Access and share scholarly works from Fairview University College community.</p>
                        <div className="research-search-bar">
                            <i className="fas fa-search"></i>
                            <input
                                type="text"
                                placeholder="Search by title, author, or keywords..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="container section">
                    <div className="research-layout">
                        {/* Sidebar Filters */}
                        <aside className="research-filters">
                            <div className="filter-group">
                                <h3>Fields of Study</h3>
                                <ul>
                                    {fields.map(field => (
                                        <li
                                            key={field}
                                            className={activeField === field ? 'active' : ''}
                                            onClick={() => setActiveField(field)}
                                        >
                                            {field}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="repo-stats">
                                <div className="stat-item">
                                    <span className="stat-label">Total Papers</span>
                                    <span className="stat-value">{papers.length}</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">Active Authors</span>
                                    <span className="stat-value">12</span>
                                </div>
                            </div>

                            <button className="btn btn-primary w-full" style={{ marginTop: '20px' }}>
                                <i className="fas fa-upload"></i> Submit Research
                            </button>
                        </aside>

                        {/* Papers List */}
                        <main className="research-results">
                            <div className="results-header">
                                <h2>{activeField} Papers ({filteredPapers.length})</h2>
                                <div className="sort-options">
                                    <span>Sort by:</span>
                                    <select>
                                        <option>Newest First</option>
                                        <option>Oldest First</option>
                                        <option>Relevance</option>
                                    </select>
                                </div>
                            </div>

                            {filteredPapers.length > 0 ? (
                                <div className="paper-grid">
                                    {filteredPapers.map((paper, index) => (
                                        <div key={index} className="paper-card">
                                            <div className="paper-field-tag">{paper.field}</div>
                                            <h3>{paper.title}</h3>
                                            <div className="paper-meta">
                                                <span><i className="fas fa-user-edit"></i> {paper.author}</span>
                                                <span><i className="fas fa-calendar-alt"></i> {paper.year}</span>
                                            </div>
                                            <p className="paper-abstract">{paper.abstract}</p>
                                            <div className="paper-actions">
                                                <button className="btn btn-outline btn-sm">
                                                    <i className="fas fa-eye"></i> View Abstract
                                                </button>
                                                <button className="btn btn-primary btn-sm">
                                                    <i className="fas fa-download"></i> Download PDF
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="no-results">
                                    <i className="fas fa-book-open"></i>
                                    <h3>No research papers found</h3>
                                    <p>Try adjusting your filters or search terms.</p>
                                </div>
                            )}
                        </main>
                    </div>
                </div>
            </div>

            <style>{`
                .research-hero {
                    background: linear-gradient(rgba(30, 60, 114, 0.9), rgba(42, 82, 152, 0.9)), url('https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&q=80');
                    background-size: cover;
                    background-position: center;
                    color: white;
                    padding: 100px 0;
                    text-align: center;
                }
                .research-hero h1 { font-size: 3.5rem; margin-bottom: 20px; font-weight: 800; }
                .research-hero p { font-size: 1.3rem; opacity: 0.9; margin-bottom: 40px; }
                
                .research-search-bar {
                    max-width: 800px;
                    margin: 0 auto;
                    position: relative;
                }
                .research-search-bar i {
                    position: absolute;
                    left: 25px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #2a5298;
                    font-size: 1.2rem;
                }
                .research-search-bar input {
                    width: 100%;
                    padding: 22px 25px 22px 65px;
                    border-radius: 50px;
                    border: none;
                    font-size: 1.1rem;
                    box-shadow: 0 15px 35px rgba(0,0,0,0.2);
                    outline: none;
                }

                .research-layout {
                    display: grid;
                    grid-template-columns: 280px 1fr;
                    gap: 50px;
                    margin: 20px 0;
                }

                .filter-group h3 { 
                    font-size: 1.2rem; 
                    margin-bottom: 20px; 
                    color: #1e3c72; 
                    font-weight: 700;
                    border-bottom: 2px solid #eef2f6;
                    padding-bottom: 10px;
                }
                .filter-group ul { list-style: none; padding: 0; }
                .filter-group li {
                    padding: 12px 15px;
                    margin-bottom: 6px;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    color: #555;
                    font-weight: 500;
                }
                .filter-group li:hover { background: #f0f7ff; color: #1e3c72; transform: translateX(5px); }
                .filter-group li.active { background: #1e3c72; color: white; }

                .repo-stats {
                    background: #f8fafc;
                    padding: 25px;
                    border-radius: 15px;
                    margin-top: 30px;
                }
                .stat-item {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 15px;
                }
                .stat-item:last-child { margin-bottom: 0; }
                .stat-label { color: #64748b; font-size: 0.9rem; }
                .stat-value { font-weight: 700; color: #1e3c72; font-size: 1.1rem; }

                .results-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 30px;
                }
                .results-header h2 { font-size: 1.8rem; font-weight: 700; color: #334155; }
                .sort-options { display: flex; align-items: center; gap: 10px; color: #64748b; }
                .sort-options select {
                    padding: 8px 15px;
                    border-radius: 8px;
                    border: 1px solid #e2e8f0;
                    outline: none;
                }

                .paper-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 25px;
                }
                .paper-card {
                    background: white;
                    padding: 30px;
                    border-radius: 16px;
                    border: 1px solid #eef2f6;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                    transition: all 0.3s ease;
                }
                .paper-card:hover {
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
                    border-color: #dbeafe;
                }

                .paper-field-tag {
                    display: inline-block;
                    padding: 4px 12px;
                    background: #f1f5f9;
                    color: #475569;
                    border-radius: 6px;
                    font-size: 0.75rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    margin-bottom: 15px;
                }
                .paper-card h3 { font-size: 1.4rem; margin-bottom: 12px; color: #1e293b; font-weight: 700; }
                .paper-meta { display: flex; gap: 20px; color: #64748b; font-size: 0.9rem; margin-bottom: 20px; }
                .paper-meta span i { margin-right: 6px; color: #2a5298; }
                .paper-abstract {
                    color: #475569;
                    line-height: 1.6;
                    margin-bottom: 25px;
                    display: -webkit-box;
                    -webkit-line-clamp: 3;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                .paper-actions { display: flex; gap: 15px; }

                .no-results {
                    text-align: center;
                    padding: 80px 0;
                    color: #94a3b8;
                }
                .no-results i { font-size: 4rem; margin-bottom: 20px; }

                @media (max-width: 768px) {
                    .research-layout { grid-template-columns: 1fr; }
                    .research-hero h1 { font-size: 2.5rem; }
                }
            `}</style>
        </Layout>
    );
};

export default Research;
