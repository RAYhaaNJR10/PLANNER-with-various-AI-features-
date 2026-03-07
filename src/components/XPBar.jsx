import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getGamification, getLevel, getXPForNextLevel, getXPForCurrentLevel } from '../services/gamificationService';
import './XPBar.css';

const XPBar = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({ xp: 0, level: 1, streak: 0, highestStreak: 0, streakFreezes: 0 });
    const [showStreakDetails, setShowStreakDetails] = useState(false);

    useEffect(() => {
        if (!user) return;
        const load = async () => {
            const data = await getGamification(user.uid);
            setStats(data);
        };
        load();
        // Refresh every 30s
        const interval = setInterval(load, 30000);
        return () => clearInterval(interval);
    }, [user]);

    const level = getLevel(stats.xp);
    const xpCurrent = getXPForCurrentLevel(level);
    const xpNext = getXPForNextLevel(level);
    const xpInLevel = stats.xp - xpCurrent;
    const xpNeeded = xpNext - xpCurrent;
    const pct = Math.min(100, Math.round((xpInLevel / xpNeeded) * 100));

    return (
        <div className="xp-bar-wrap">
            <div className="xp-bar-header">
                <span className="xp-level">Lv.{level}</span>
                <div style={{ position: 'relative' }}>
                    <span
                        className="xp-streak"
                        onClick={() => setShowStreakDetails(!showStreakDetails)}
                        style={{ cursor: 'pointer', transition: 'transform 0.2s', display: 'inline-block' }}
                        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        🔥 {stats.streak || 0}
                    </span>

                    {showStreakDetails && (
                        <div className="streak-popover">
                            <div className="streak-popover-header">
                                <h4>🔥 Streak Details</h4>
                                <button className="streak-popover-close" onClick={() => setShowStreakDetails(false)}>✕</button>
                            </div>
                            <div className="streak-popover-stats">
                                <div className="streak-stat">
                                    <span className="streak-stat-label">Current Streak</span>
                                    <span className="streak-stat-value">{stats.streak || 0} days</span>
                                </div>
                                <div className="streak-stat">
                                    <span className="streak-stat-label">Highest Streak</span>
                                    <span className="streak-stat-value">{stats.highestStreak || 0} days</span>
                                </div>
                                <div className="streak-stat">
                                    <span className="streak-stat-label">Streak Freezes ❄️</span>
                                    <span className="streak-stat-value">{stats.streakFreezes || 0}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div className="xp-bar-track">
                <div className="xp-bar-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="xp-bar-label">{stats.xp} XP · {xpNext - stats.xp} to Lv.{level + 1}</div>
        </div>
    );
};

export default XPBar;
