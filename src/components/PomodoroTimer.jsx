import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { logPomodoroSession } from '../services/pomodoroService';
import { awardXP, updateStreak } from '../services/gamificationService';
import { FiPlay, FiPause, FiRotateCcw, FiMinus, FiMaximize2 } from 'react-icons/fi';
import './PomodoroTimer.css';

const MODES = [
    { label: '🍅 Focus', duration: 25 },
    { label: '☕ Short Break', duration: 5 },
    { label: '🌙 Long Break', duration: 15 },
];

const PomodoroTimer = () => {
    const { user } = useAuth();
    const [modeIdx, setModeIdx] = useState(0);
    const [seconds, setSeconds] = useState(MODES[0].duration * 60);
    const [running, setRunning] = useState(false);
    const [minimized, setMinimized] = useState(true);
    const [label, setLabel] = useState('');
    const intervalRef = useRef(null);
    const startRef = useRef(null);

    const mode = MODES[modeIdx];
    const total = mode.duration * 60;
    const progress = ((total - seconds) / total) * 100;

    useEffect(() => {
        if (running) {
            startRef.current = Date.now();
            intervalRef.current = setInterval(() => {
                setSeconds(s => {
                    if (s <= 1) {
                        clearInterval(intervalRef.current);
                        setRunning(false);
                        handleSessionComplete();
                        return 0;
                    }
                    return s - 1;
                });
            }, 1000);
        } else {
            clearInterval(intervalRef.current);
        }
        return () => clearInterval(intervalRef.current);
    }, [running, modeIdx]);

    const handleSessionComplete = async () => {
        if (!user || modeIdx !== 0) return;
        const today = new Date().toISOString().split('T')[0];
        await logPomodoroSession(user.uid, {
            taskTitle: label || 'Focus Session',
            duration: mode.duration,
            date: today,
        });
        await awardXP(user.uid, 20);
        await updateStreak(user.uid);
    };

    const switchMode = (idx) => {
        clearInterval(intervalRef.current);
        setRunning(false);
        setModeIdx(idx);
        setSeconds(MODES[idx].duration * 60);
    };

    const reset = () => {
        clearInterval(intervalRef.current);
        setRunning(false);
        setSeconds(mode.duration * 60);
    };

    const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

    const circumference = 2 * Math.PI * 45;
    const dashOffset = circumference - (progress / 100) * circumference;

    if (minimized) {
        return (
            <button className="pomo-mini" onClick={() => setMinimized(false)} title="Open Pomodoro Timer">
                🍅 {fmt(seconds)}
            </button>
        );
    }

    return (
        <div className="pomo-widget">
            <div className="pomo-header">
                <span className="pomo-title">🍅 Pomodoro</span>
                <button className="pomo-icon-btn" onClick={() => setMinimized(true)}><FiMinus /></button>
            </div>

            <div className="pomo-mode-tabs">
                {MODES.map((m, i) => (
                    <button
                        key={i}
                        className={`pomo-mode-tab ${modeIdx === i ? 'active' : ''}`}
                        onClick={() => switchMode(i)}
                    >
                        {m.label}
                    </button>
                ))}
            </div>

            <div className="pomo-ring-wrap">
                <svg className="pomo-ring" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="var(--border)" strokeWidth="6" />
                    <circle
                        cx="50" cy="50" r="45" fill="none"
                        stroke="var(--accent)"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={dashOffset}
                        style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', transition: 'stroke-dashoffset 1s linear' }}
                    />
                </svg>
                <span className="pomo-time">{fmt(seconds)}</span>
            </div>

            <input
                className="pomo-label-input"
                placeholder="What are you working on?"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
            />

            <div className="pomo-controls">
                <button className="pomo-icon-btn" onClick={reset}><FiRotateCcw /></button>
                <button className="pomo-play-btn" onClick={() => setRunning(r => !r)}>
                    {running ? <FiPause size={22} /> : <FiPlay size={22} />}
                </button>
            </div>
        </div>
    );
};

export default PomodoroTimer;
