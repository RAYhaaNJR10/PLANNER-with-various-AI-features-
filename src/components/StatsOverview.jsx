import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getSubjectStats } from '../services/subjectService';
import { getTotalMinutesThisWeek, getPomodoroHistoryForLast30Days } from '../services/pomodoroService';
import { getChallengeData, claimChallengeReward } from '../services/gamificationService';
import { FiCamera } from 'react-icons/fi';
import html2canvas from 'html2canvas';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import './StatsOverview.css';

const StatsOverview = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState([]);
    const [focusMinutes, setFocusMinutes] = useState(0);
    const [heatmapData, setHeatmapData] = useState([]);
    const [challenges, setChallenges] = useState(null);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const statsRef = useRef(null);

    useEffect(() => {
        if (!user) return;
        const fetchStats = async () => {
            const data = await getSubjectStats(user.uid);
            const minutes = await getTotalMinutesThisWeek(user.uid);
            const heatmap = await getPomodoroHistoryForLast30Days(user.uid);
            const cData = await getChallengeData(user.uid);

            setStats(data);
            setFocusMinutes(minutes);
            setHeatmapData(heatmap);
            setChallenges(cData);
            setLoading(false);
        };
        fetchStats();
    }, [user]);

    const overallCompleted = stats.reduce((sum, s) => sum + s.completed, 0);
    const overallTotal = stats.reduce((sum, s) => sum + s.total, 0);
    const overallPercentage = overallTotal > 0 ? Math.round((overallCompleted / overallTotal) * 100) : 0;

    const handleExport = async () => {
        if (!statsRef.current) return;
        setExporting(true);
        try {
            // Wait a tick for UI to settle if resolving anything
            await new Promise(r => setTimeout(r, 100));
            const canvas = await html2canvas(statsRef.current, {
                backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#121212',
                scale: 2, // High resolution
                logging: false,
                useCORS: true
            });
            const url = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `LevelUp-Stats-${new Date().toISOString().split('T')[0]}.png`;
            link.href = url;
            link.click();
        } catch (err) {
            console.error('Failed to export image:', err);
            alert('Failed to export progress card.');
        } finally {
            setExporting(false);
        }
    };

    const handleClaim = async (id, xp) => {
        if (!user) return;
        try {
            await claimChallengeReward(user.uid, id, xp);
            setChallenges(prev => ({ ...prev, [`${id}Claimed`]: true }));
            alert(`Reward claimed! +${xp} XP 👑`);
        } catch (e) {
            console.error(e);
            alert('Failed to claim reward.');
        }
    };

    const renderChallengeCard = (title, desc, current, target, id, rewardXP) => {
        if (!challenges) return null;
        const isComplete = (current || 0) >= target;
        const isClaimed = challenges[`${id}Claimed`];
        const progressPct = Math.min(100, Math.round(((current || 0) / target) * 100));

        return (
            <div key={id} className={`stats-challenge-card ${isClaimed ? 'claimed' : (isComplete ? 'complete' : '')}`}>
                <div className="stats-challenge-info">
                    <h3 style={{ fontSize: '1.05rem', margin: '0 0 4px', color: 'var(--text)' }}>{title}</h3>
                    <p style={{ fontSize: '0.85rem', margin: '0 0 12px', color: 'var(--text-secondary)' }}>{desc}</p>
                    <div className="stats-bar-container" style={{ margin: '8px 0' }}>
                        <div className="stats-bar" style={{ height: '6px' }}>
                            <div className="stats-bar-fill" style={{ width: `${progressPct}%`, background: isComplete ? '#10b981' : 'var(--accent)' }} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{current || 0} / {target}</span>
                        <span style={{ color: 'var(--accent)' }}>+{rewardXP} XP</span>
                    </div>
                </div>
                <button 
                    className={`btn ${isClaimed ? 'btn-ghost' : (isComplete ? 'btn-primary' : '')}`}
                    disabled={!isComplete || isClaimed}
                    onClick={() => handleClaim(id, rewardXP)}
                    style={{ width: '100%', marginTop: '12px', padding: '6px', fontSize: '0.9rem', opacity: (!isComplete && !isClaimed) ? 0.5 : 1 }}
                >
                    {isClaimed ? 'Claimed ✓' : (isComplete ? 'Claim Reward!' : 'In Progress')}
                </button>
            </div>
        );
    };

    return (
        <div className="stats-page">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="page-title">📊 Stats</h1>
                    <p className="page-subtitle">Track your overall progress</p>
                </div>
                {!loading && (
                    <button
                        className="btn btn-accent"
                        onClick={handleExport}
                        disabled={exporting}
                    >
                        {exporting ? '📸 Capturing...' : <><FiCamera /> Export Progress</>}
                    </button>
                )}
            </div>

            {loading ? (
                <div className="stats-loading">
                    <div className="spinner" />
                    <p>Loading stats...</p>
                </div>
            ) : (
                <div ref={statsRef} style={{ padding: '20px', background: 'var(--bg)', borderRadius: '16px', margin: '-20px' }}>
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

                    {/* Challenges Section */}
                    {challenges && (
                        <div className="stats-challenges-section" style={{ marginTop: '32px' }}>
                            <h2 className="stats-section-title">🏆 Active Challenges</h2>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                                gap: '16px',
                                marginTop: '16px'
                            }}>
                                {renderChallengeCard('Weekly XP Goal', 'Earn 500 XP this week', challenges.weeklyXP, 500, 'weeklyXP', 200)}
                                {renderChallengeCard('Weekly Focus', 'Complete 10 Pomodoros', challenges.weeklyPomodoros, 10, 'weeklyPomodoros', 150)}
                                {renderChallengeCard('Monthly Hustle', 'Complete 50 Tasks', challenges.monthlyTasks, 50, 'monthlyTasks', 1000)}
                            </div>
                        </div>
                    )}

                    {/* Heatmap Section */}
                    {heatmapData.length > 0 && (
                        <div className="stats-heatmap-section">
                            <h2 className="stats-section-title">Study Heatmap (30 Days)</h2>
                            <div className="heatmap-grid" style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(15, 1fr)',
                                gap: '6px',
                                marginTop: '16px',
                                padding: '24px',
                                background: 'var(--card)',
                                borderRadius: '16px',
                                border: '1px solid var(--border)'
                            }}>
                                {heatmapData.map((day) => {
                                    // Determine color based on minutes
                                    let color = 'var(--bg)';
                                    if (day.totalMinutes > 0) color = 'var(--accent-bg)';
                                    if (day.totalMinutes > 30) color = 'var(--accent)';
                                    if (day.totalMinutes > 90) color = 'var(--primary)';
                                    if (day.totalMinutes > 180) color = '#00B894';

                                    return (
                                        <div
                                            key={day.date}
                                            title={`${day.date}: ${day.totalMinutes} mins`}
                                            style={{
                                                aspectRatio: '1',
                                                background: color,
                                                borderRadius: '4px',
                                                opacity: 1,
                                                border: day.totalMinutes === 0 ? '1px solid var(--border)' : 'none',
                                                transition: 'transform 0.2s ease'
                                            }}
                                            onMouseEnter={(e) => e.target.style.transform = 'scale(1.2)'}
                                            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <h2 className="stats-section-title" style={{ marginTop: '32px' }}>By Subject</h2>

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

                    {stats.length > 0 && (
                        <>
                            <h2 className="stats-section-title" style={{ marginTop: '32px' }}>Visual Analytics</h2>
                            <div className="stats-charts-grid" style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                                gap: '24px',
                                marginTop: '16px'
                            }}>
                                <div className="stats-chart-card" style={{ background: 'var(--card)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                                    <h3 style={{ marginBottom: '16px', color: 'var(--text)', textAlign: 'center' }}>Tasks by Subject</h3>
                                    <div style={{ height: '250px' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={stats}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={80}
                                                    paddingAngle={5}
                                                    dataKey="total"
                                                    nameKey="name"
                                                >
                                                    {stats.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color || 'var(--accent)'} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--text)' }}
                                                    itemStyle={{ color: 'var(--text)' }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="stats-chart-card" style={{ background: 'var(--card)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                                    <h3 style={{ marginBottom: '16px', color: 'var(--text)', textAlign: 'center' }}>Completion Rate</h3>
                                    <div style={{ height: '250px' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={stats.filter(s => s.total > 0)}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                                                <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                                                <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--text)' }}
                                                    cursor={{ fill: 'var(--hover)' }}
                                                />
                                                <Bar dataKey="completed" fill="var(--accent)" radius={[4, 4, 0, 0]} name="Completed" />
                                                <Bar dataKey="total" fill="var(--border)" radius={[4, 4, 0, 0]} name="Total Assigned" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {stats.length === 0 && (
                        <div className="empty-state">
                            <span className="empty-emoji">📊</span>
                            <h3>No subjects to show</h3>
                            <p>Add subjects and tasks to see your visual progress here!</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default StatsOverview;
