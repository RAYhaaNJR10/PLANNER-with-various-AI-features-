import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getGamification, getLevel, getXPForNextLevel, getXPForCurrentLevel } from '../services/gamificationService';
import './XPBar.css';

const XPBar = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({ xp: 0, level: 1, streak: 0 });

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
                <span className="xp-streak">🔥 {stats.streak || 0}</span>
            </div>
            <div className="xp-bar-track">
                <div className="xp-bar-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="xp-bar-label">{stats.xp} XP · {xpNext - stats.xp} to Lv.{level + 1}</div>
        </div>
    );
};

export default XPBar;
