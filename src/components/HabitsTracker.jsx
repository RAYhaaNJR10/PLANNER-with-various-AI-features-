import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
    subscribeToHabits, addHabit, deleteHabit,
    recordHabitCompletion, removeHabitCompletion, getWeekCompletions
} from '../services/habitService';
import { awardXP } from '../services/gamificationService';
import { FiPlus, FiTrash2, FiX, FiCheck } from 'react-icons/fi';
import './HabitsTracker.css';

const HABIT_COLORS = ['#6C5CE7', '#00B894', '#E17055', '#FDCB6E', '#0984E3', '#FD79A8'];
const HABIT_EMOJIS = ['💧', '📖', '🏃', '🧘', '🥗', '😴', '💊', '✍️', '🎯', '🧹', '🎵', '☀️'];
const today = new Date().toISOString().split('T')[0];

const getLast7Days = () => Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
});

const HabitCard = ({ habit, uid }) => {
    const [completions, setCompletions] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getWeekCompletions(uid, habit.id).then(c => {
            setCompletions(c);
            setLoading(false);
        });
    }, [habit.id, uid]);

    const toggle = async () => {
        const done = completions[today];
        const updated = { ...completions, [today]: !done };
        setCompletions(updated);
        if (!done) {
            await recordHabitCompletion(uid, habit.id, today);
            await awardXP(uid, 10);
        } else {
            await removeHabitCompletion(uid, habit.id, today);
        }
    };

    const days = getLast7Days();
    const doneToday = completions[today];
    const streak = days.filter(d => completions[d]).length;

    return (
        <div className="habit-card" style={{ borderColor: habit.color + '40' }}>
            <div className="habit-card-left">
                <div className="habit-icon" style={{ background: habit.color + '20' }}>
                    {habit.icon}
                </div>
                <div className="habit-info">
                    <span className="habit-name">{habit.name}</span>
                    <div className="habit-dots">
                        {days.map(d => (
                            <div
                                key={d}
                                className={`habit-dot ${completions[d] ? 'done' : ''}`}
                                style={completions[d] ? { background: habit.color } : {}}
                                title={d}
                            />
                        ))}
                    </div>
                    <span className="habit-streak" style={{ color: habit.color }}>
                        {streak}/7 this week
                    </span>
                </div>
            </div>
            <div className="habit-card-right">
                <button
                    className={`habit-check-btn ${doneToday ? 'checked' : ''}`}
                    style={doneToday ? { background: habit.color, borderColor: habit.color } : {}}
                    onClick={toggle}
                >
                    {doneToday ? <FiCheck size={18} /> : ''}
                </button>
            </div>
        </div>
    );
};

const HabitsTracker = () => {
    const { user } = useAuth();
    const [habits, setHabits] = useState([]);
    const [showAdd, setShowAdd] = useState(false);
    const [name, setName] = useState('');
    const [icon, setIcon] = useState(HABIT_EMOJIS[0]);
    const [color, setColor] = useState(HABIT_COLORS[0]);

    useEffect(() => {
        if (!user) return;
        return subscribeToHabits(user.uid, setHabits);
    }, [user]);

    const handleAdd = async () => {
        if (!name.trim()) return;
        await addHabit(user.uid, { name: name.trim(), icon, color });
        setName(''); setIcon(HABIT_EMOJIS[0]); setColor(HABIT_COLORS[0]); setShowAdd(false);
    };

    const handleDelete = async (id) => {
        if (confirm('Delete this habit?')) await deleteHabit(user.uid, id);
    };

    return (
        <div className="habits-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">🔁 Habits</h1>
                    <p className="page-subtitle">Daily habits — check off each day to build streaks</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
                    <FiPlus /> Add Habit
                </button>
            </div>

            {showAdd && (
                <div className="habit-form-card">
                    <div className="label-form-header">
                        <h3>New Habit</h3>
                        <button className="modal-close" onClick={() => setShowAdd(false)}><FiX /></button>
                    </div>
                    <div className="label-form-content">
                        <div className="form-group">
                            <label className="form-label">Name</label>
                            <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Drink Water" autoFocus />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Icon</label>
                            <div className="emoji-grid">
                                {HABIT_EMOJIS.map(e => (
                                    <button key={e} className={`emoji-btn ${icon === e ? 'emoji-btn--active' : ''}`} onClick={() => setIcon(e)}>{e}</button>
                                ))}
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Color</label>
                            <div className="color-grid">
                                {HABIT_COLORS.map(c => (
                                    <button key={c} className={`color-swatch ${color === c ? 'color-swatch--active' : ''}`} style={{ background: c }} onClick={() => setColor(c)} />
                                ))}
                            </div>
                        </div>
                        <div className="form-actions">
                            <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleAdd} disabled={!name.trim()}><FiCheck /> Create</button>
                        </div>
                    </div>
                </div>
            )}

            {habits.length === 0 && !showAdd ? (
                <div className="empty-state">
                    <span className="empty-icon">🔁</span>
                    <h3>No habits yet</h3>
                    <p>Add daily habits and check them off each day to build streaks!</p>
                </div>
            ) : (
                <div className="habits-list">
                    {habits.map(h => (
                        <div key={h.id} style={{ position: 'relative' }}>
                            <HabitCard habit={h} uid={user.uid} />
                            <button className="habit-delete-btn" onClick={() => handleDelete(h.id)} title="Delete habit">
                                <FiTrash2 size={13} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default HabitsTracker;
