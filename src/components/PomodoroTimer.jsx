import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { logPomodoroSession } from '../services/pomodoroService';
import { awardXP, updateStreak, updateChallengeProgress } from '../services/gamificationService';
import { updatePresence } from '../services/presenceService';
import { FiPlay, FiPause, FiRotateCcw, FiMinus, FiMaximize2, FiMinimize2, FiMusic, FiSkipForward, FiRepeat, FiVolume2, FiVolumeX, FiMove, FiChevronDown, FiChevronUp, FiSquare } from 'react-icons/fi';
import './PomodoroTimer.css';

const MODES = [
    { label: '🍅 Focus', duration: 25 },
    { label: '☕ Short Break', duration: 5 },
    { label: '🌙 Long Break', duration: 15 },
    { label: '⚙️ Custom', duration: 25, isCustom: true },
];

const PomodoroTimer = () => {
    const { user } = useAuth();
    const [modeIdx, setModeIdx] = useState(0);
    const [customDuration, setCustomDuration] = useState(25);
    const [seconds, setSeconds] = useState(MODES[0].duration * 60);
    const [running, setRunning] = useState(false);
    const [minimized, setMinimized] = useState(true);
    const [isZenMode, setIsZenMode] = useState(false);
    const [isHardcore, setIsHardcore] = useState(false);
    const [hardcoreWarning, setHardcoreWarning] = useState(false);
    const [hardcoreCountdown, setHardcoreCountdown] = useState(10);
    const [label, setLabel] = useState('');
    const intervalRef = useRef(null);
    const startRef = useRef(null);
    const warningIntervalRef = useRef(null);

    // Audio Playlist State
    const [playlist, setPlaylist] = useState([
        { id: '1', title: 'LoFi Beats 1', src: '/audio/LoFi1.mp3' },
        { id: '2', title: 'LoFi Beats 2', src: '/audio/LoFi2.mp3' },
        { id: '3', title: 'LoFi Beats 3', src: '/audio/LoFi3.mp3' },
        { id: '4', title: 'Nature', src: '/audio/Nature.mp3' },
        { id: '5', title: 'Rain & Thunder', src: '/audio/Rain and Thunderstorm.mp3' },
    ]);
    const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
    const [isAudioPlaying, setIsAudioPlaying] = useState(false);
    const [repeatMode, setRepeatMode] = useState(false);
    const [showPlaylist, setShowPlaylist] = useState(false);
    const audioRef = useRef(null);

    // Native Drag and Drop refs
    const dragItem = useRef();
    const dragOverItem = useRef();

    const mode = MODES[modeIdx];
    const currentDuration = mode.isCustom ? customDuration : mode.duration;
    const total = currentDuration * 60;
    const progress = ((total - seconds) / total) * 100;

    const handleSessionComplete = useCallback(async () => {
        if (!user || (!mode.label.includes('Focus') && !mode.isCustom)) return;
        const today = new Date().toISOString().split('T')[0];
        
        // Double XP for hardcore mode!
        const xpToAward = isHardcore ? currentDuration * 2 : currentDuration;
        
        await logPomodoroSession(user.uid, {
            taskTitle: label || (mode.isCustom ? 'Custom Session' : 'Focus Session'),
            duration: currentDuration,
            date: today,
            isHardcore: isHardcore
        });
        await awardXP(user.uid, xpToAward);
        await updateStreak(user.uid);
        await updateChallengeProgress(user.uid, 'pomodoro', 1);
        
        if (isHardcore) {
            alert(`Hardcore Session Complete! You earned double XP (${xpToAward} XP) 👑`);
        }
    }, [user, modeIdx, label, currentDuration, mode, isHardcore]);

    // Hardcore Mode Blur Detection
    useEffect(() => {
        if (!running || !isHardcore) {
            setHardcoreWarning(false);
            clearInterval(warningIntervalRef.current);
            return;
        }

        const handleBlur = () => {
            // User left the tab/window!
            if (minimized) return; // Be forgiving if they specifically minimized the widget
            setHardcoreWarning(true);
            setHardcoreCountdown(10);
            
            clearInterval(warningIntervalRef.current);
            warningIntervalRef.current = setInterval(() => {
                setHardcoreCountdown(prev => {
                    if (prev <= 1) {
                        // Hardcore FAILURE!
                        clearInterval(warningIntervalRef.current);
                        clearInterval(intervalRef.current);
                        setRunning(false);
                        setIsAudioPlaying(false);
                        setHardcoreWarning(false);
                        setSeconds(currentDuration * 60); // Reset timer
                        alert("Hardcore Session Failed! You left the tab for too long. No XP awarded. 💀");
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        };

        const handleFocus = () => {
            // User returned!
            setHardcoreWarning(false);
            clearInterval(warningIntervalRef.current);
        };

        // Listen for standard visibility change (tab switching) or window blur (minimizing browser/clicking other monitor)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) handleBlur();
            else handleFocus();
        });
        window.addEventListener('blur', handleBlur);
        window.addEventListener('focus', handleFocus);

        return () => {
            clearInterval(warningIntervalRef.current);
            document.removeEventListener('visibilitychange', handleBlur);
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('focus', handleFocus);
        };
    }, [running, isHardcore, minimized, currentDuration]);

    useEffect(() => {
        // Tab Title Sync
        if (running) {
            document.title = `(${fmt(seconds)}) ${mode.label.replace(/[^A-Za-z ]/g, '').trim()} - Planner`;
            if (user) updatePresence(user.uid, true, mode.label, label);
        } else {
            document.title = 'Planner';
            if (user) updatePresence(user.uid, false);
        }

        if (running) {
            startRef.current = Date.now();
            setIsAudioPlaying(true); // Automatically play audio when timer starts
            intervalRef.current = setInterval(() => {
                setSeconds(s => {
                    if (s <= 1) {
                        clearInterval(intervalRef.current);
                        setRunning(false);
                        setIsAudioPlaying(false); // Pause audio when timer ends
                        handleSessionComplete();
                        document.title = 'Planner'; // Revert on complete
                        if (user) updatePresence(user.uid, false);
                        return 0;
                    }
                    return s - 1;
                });
            }, 1000);
        } else {
            clearInterval(intervalRef.current);
            setIsAudioPlaying(false); // Pause audio when timer pauses
        }
        return () => {
            clearInterval(intervalRef.current);
            document.title = 'Planner';
            if (user) updatePresence(user.uid, false).catch(e => console.error(e));
        };
    }, [running, handleSessionComplete, seconds, mode.label, user, label]);

    // Audio Sync Effect
    useEffect(() => {
        if (audioRef.current) {
            if (isAudioPlaying) {
                audioRef.current.play().catch(e => console.error("Audio playback prevented:", e));
            } else {
                audioRef.current.pause();
            }
        }
    }, [isAudioPlaying, currentTrackIndex]);

    const nextTrack = () => {
        setCurrentTrackIndex((prev) => (prev + 1) % playlist.length);
        setIsAudioPlaying(true);
    };

    const handleTrackEnded = () => {
        if (repeatMode) {
            if (audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play().catch(e => console.error(e));
            }
        } else {
            nextTrack();
        }
    };

    const dragStart = (e, position) => {
        dragItem.current = position;
    };

    const dragEnter = (e, position) => {
        dragOverItem.current = position;
        e.preventDefault();
    };

    const drop = (e) => {
        const copyList = [...playlist];
        const dragItemContent = copyList[dragItem.current];
        copyList.splice(dragItem.current, 1);
        copyList.splice(dragOverItem.current, 0, dragItemContent);

        const currentPlayingId = playlist[currentTrackIndex].id;
        const newIndex = copyList.findIndex(t => t.id === currentPlayingId);

        dragItem.current = null;
        dragOverItem.current = null;
        setPlaylist(copyList);
        setCurrentTrackIndex(newIndex);
    };

    const switchMode = (idx) => {
        clearInterval(intervalRef.current);
        setRunning(false);
        setModeIdx(idx);
        const nextMode = MODES[idx];
        setSeconds((nextMode.isCustom ? customDuration : nextMode.duration) * 60);
    };

    const handleCustomChange = (e) => {
        let val = parseInt(e.target.value) || 1;
        if (val < 1) val = 1;
        if (val > 120) val = 120;
        setCustomDuration(val);
        if (!running) {
            setSeconds(val * 60);
        }
    };

    const reset = async () => {
        clearInterval(intervalRef.current);
        setRunning(false);
        setIsAudioPlaying(false);

        // We use a React state updater to get the *latest* guaranteed seconds value
        setSeconds((currentSeconds) => {
            const currentTotal = currentDuration * 60;
            const elapsedSeconds = currentTotal - currentSeconds;
            const elapsedMinutes = Math.floor(elapsedSeconds / 60);

            if (user && elapsedMinutes > 0 && (mode.label.includes('Focus') || mode.isCustom)) {
                const today = new Date().toISOString().split('T')[0];
                logPomodoroSession(user.uid, {
                    taskTitle: label ? `${label} (Partial)` : (mode.isCustom ? 'Custom Session (Partial)' : 'Focus Session (Partial)'),
                    duration: elapsedMinutes,
                    date: today,
                }).then(() => {
                    awardXP(user.uid, elapsedMinutes);
                    updateStreak(user.uid);
                });
            }

            return currentDuration * 60; // Return the reset value
        });
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
        <>
            {/* Hardcore Warning Overlay */}
            {hardcoreWarning && isHardcore && (
                <div className="hardcore-overlay">
                    <h1>⚠️ GET BACK TO WORK! ⚠️</h1>
                    <p>Hardcore mode detects you left the window.</p>
                    <div className="hardcore-countdown">{hardcoreCountdown}s</div>
                    <p>Return to the app or your session will fail!</p>
                </div>
            )}
            
            <div className={`pomo-widget ${isZenMode ? 'zen-mode-active' : ''} ${isHardcore && running ? 'pomo-hardcore' : ''}`}>
            <div className="pomo-header">
                <span className="pomo-title">🍅 Pomodoro</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="pomo-icon-btn" onClick={() => setIsZenMode(!isZenMode)} title={isZenMode ? "Exit Zen Mode" : "Enter Zen Mode"}>
                        {isZenMode ? <FiMinimize2 /> : <FiMaximize2 />}
                    </button>
                    <button className="pomo-icon-btn" onClick={() => { setMinimized(true); setIsZenMode(false); }} title="Minimize"><FiMinus /></button>
                </div>
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

            <div className="pomo-hardcore-toggle" style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: isHardcore ? 'var(--error)' : 'var(--text-secondary)' }}>
                    💀 Hardcore Mode (2x XP)
                </span>
                <label className="theme-switch" style={{ margin: 0 }}>
                    <input type="checkbox" checked={isHardcore} onChange={(e) => setIsHardcore(e.target.checked)} disabled={running} />
                    <span className="slider round"></span>
                </label>
            </div>

            {mode.isCustom && (
                <div style={{ display: 'flex', justifyContent: 'center', margin: '-8px 0 12px 0', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Minutes:</span>
                    <input
                        type="number"
                        min="1"
                        max="120"
                        value={customDuration}
                        onChange={handleCustomChange}
                        disabled={running}
                        style={{
                            width: '50px',
                            textAlign: 'center',
                            padding: '2px 4px',
                            borderRadius: '6px',
                            border: '1px solid var(--border)',
                            background: 'var(--bg)',
                            color: 'var(--text)',
                            fontSize: '0.85rem',
                            outline: 'none'
                        }}
                    />
                </div>
            )}

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
                <button className="pomo-icon-btn" onClick={reset} title="Stop Timer & Log Partial Time"><FiSquare /></button>
                <button className="pomo-play-btn" onClick={() => setRunning(r => !r)}>
                    {running ? <FiPause size={22} /> : <FiPlay size={22} />}
                </button>
                <button className={`pomo-icon-btn ${isAudioPlaying ? 'active-audio' : ''}`} onClick={() => setIsAudioPlaying(!isAudioPlaying)}>
                    {isAudioPlaying ? <FiVolume2 /> : <FiVolumeX />}
                </button>
            </div>

            <div className="pomo-audio-section">
                <div className="pomo-audio-header" onClick={() => setShowPlaylist(!showPlaylist)}>
                    <div className="pomo-audio-now-playing">
                        <FiMusic className={isAudioPlaying ? 'spinning-icon' : ''} />
                        <span>{playlist[currentTrackIndex]?.title || 'No Audio'}</span>
                    </div>
                    {showPlaylist ? <FiChevronUp /> : <FiChevronDown />}
                </div>

                {showPlaylist && (
                    <div className="pomo-playlist">
                        <div className="pomo-playlist-controls">
                            <button className={`pomo-playlist-btn ${repeatMode ? 'active' : ''}`} onClick={() => setRepeatMode(!repeatMode)} title="Repeat Track">
                                <FiRepeat />
                            </button>
                            <button className="pomo-playlist-btn" onClick={nextTrack} title="Next Track">
                                <FiSkipForward />
                            </button>
                        </div>

                        <div className="pomo-playlist-tracks">
                            {playlist.map((track, index) => (
                                <div
                                    key={track.id}
                                    className={`pomo-track-item ${index === currentTrackIndex ? 'playing' : ''}`}
                                    draggable
                                    onDragStart={(e) => dragStart(e, index)}
                                    onDragEnter={(e) => dragEnter(e, index)}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={drop}
                                >
                                    <div className="pomo-track-drag"><FiMove size={12} /></div>
                                    <span className="pomo-track-title" onClick={() => {
                                        setCurrentTrackIndex(index);
                                        setIsAudioPlaying(true);
                                    }}>{track.title}</span>
                                    {index === currentTrackIndex && isAudioPlaying && <FiVolume2 size={12} className="pomo-track-playing-icon" />}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Hidden Audio Element */}
            <audio
                ref={audioRef}
                src={playlist[currentTrackIndex]?.src}
                onEnded={handleTrackEnded}
            />
        </div>
        </>
    );
};

export default PomodoroTimer;
