import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getSubjectStats } from '../services/subjectService';
import { getTotalMinutesThisWeek } from '../services/pomodoroService';
import './StatsOverview.css';

const StatsOverview = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState([]);
    const [focusMinutes, setFocusMinutes] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        const fetchStats = async () => {
            const data = await getSubjectStats(user.uid);
            const minutes = await getTotalMinutesThisWeek(user.uid);
            setStats(data);
            setFocusMinutes(minutes);
            setLoading(false);
        };
        fetchStats();
    }, [user]);

    const overallCompleted = stats.reduce((sum, s) => sum + s.completed, 0);
    const overallTotal = stats.reduce((sum, s) => sum + s.total, 0);
    const overallPercentage = overallTotal > 0 ? Math.round((overallCompleted / overallTotal) * 100) : 0;

    return (
        <div className="stats-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">📊 Stats</h1>
                    <p className="page-subtitle">Track your overall progress</p>
                </div>
            </div>

            {loading ? (
                <div className="stats-loading">
                    <div className="spinner" />
                    <p>Loading stats...</p>
                </div>
            ) : (
                <>
                    <div className="stats-overview-card">
                        <div className="stats-big-ring">
                            <svg width="120" height="120" viewBox="0 0 120 120">
                                <circle
                                    cx="60" cy="60" r="52"
                                    fill="none"
                                    stroke="var(--border)"
                                    strokeWidth="8"
                                />
                                <circle
                                    cx="60" cy="60" r="52"
                                    fill="none"
                                    stroke="url(#gradient)"
                                    strokeWidth="8"
                                    strokeDasharray={`${(overallPercentage / 100) * 326.7} 326.7`}
                                    strokeLinecap="round"
                                    transform="rotate(-90 60 60)"
                                    style={{ transition: 'stroke-dasharray 0.8s ease' }}
                                />
                                <defs>
                                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#6C5CE7" />
                                        <stop offset="100%" stopColor="#00B894" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <div className="stats-big-ring-text">
                                <span className="stats-big-number">{overallPercentage}%</span>
                                <span className="stats-big-label">Overall</span>
                            </div>
                        </div>
                        <div className="stats-overview-info">
                            <div className="stats-summary-row">
                                <span className="stats-summary-label">Total Topics</span>
                                <span className="stats-summary-value">{overallTotal}</span>
                            </div>
                            <div className="stats-summary-row">
                                <span className="stats-summary-label">Completed</span>
                                <span className="stats-summary-value stats-summary-value--green">{overallCompleted}</span>
                            </div>
                            <div className="stats-summary-row">
                                <span className="stats-summary-label">Remaining</span>
                                <span className="stats-summary-value stats-summary-value--orange">{overallTotal - overallCompleted}</span>
                            </div>
                            <div className="stats-summary-row" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                                <span className="stats-summary-label">🍅 Focus Time (7d)</span>
                                <span className="stats-summary-value" style={{ color: 'var(--accent)' }}>{Math.floor(focusMinutes / 60)}h {focusMinutes % 60}m</span>
                            </div>
                        </div>
                    </div>

                    <h2 className="stats-section-title">By Subject</h2>

                    <div className="stats-subjects-grid">
                        {stats.map((s) => (
                            <div key={s.id} className="stats-subject-card" style={{ borderTopColor: s.color }}>
                                <h3 className="stats-subject-name" style={{ color: s.color }}>{s.name}</h3>
                                <div className="stats-bar-container">
                                    <div className="stats-bar">
                                        <div
                                            className="stats-bar-fill"
                                            style={{ width: `${s.percentage}%`, background: s.color }}
                                        />
                                    </div>
                                    <span className="stats-bar-text">{s.percentage}%</span>
                                </div>
                                <div className="stats-subject-counts">
                                    <span>{s.completed} done</span>
                                    <span>{s.total - s.completed} left</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {stats.length === 0 && (
                        <div className="empty-state">
                            <span className="empty-emoji">📊</span>
                            <h3>No subjects to show</h3>
                            <p>Add subjects and topics to see your progress here!</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default StatsOverview;
