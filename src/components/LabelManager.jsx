import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
    subscribeToLabels,
    addLabel,
    updateLabel,
    deleteLabel,
} from '../services/labelService';
import { FiPlus, FiEdit2, FiTrash2, FiX, FiCheck } from 'react-icons/fi';
import './LabelManager.css';

const COLORS = [
    '#6C5CE7', '#00B894', '#E17055', '#FDCB6E', '#D63031',
    '#3776AB', '#F7DF1E', '#ED8B00', '#00599C', '#E44D26',
    '#0984E3', '#00CEC9', '#A29BFE', '#FD79A8', '#636E72',
    '#2D3436', '#74B9FF', '#55EFC4', '#FF7675', '#DFE6E9',
];

const EMOJI_CATEGORIES = {
    '📚 Study': ['📚', '📖', '📝', '✏️', '📐', '📏', '🧮', '🔬', '🔭', '🧪', '🧬', '📊', '🗂️', '📋', '🎓'],
    '💻 Tech': ['💻', '🖥️', '⌨️', '🖱️', '📱', '🐍', '☕', '⚙️', '🌐', '🤖', '🔌', '💾', '⚛️', '✨', '📡'],
    '🎨 Creative': ['🎨', '✂️', '🎭', '🎬', '📸', '🎤', '🎵', '🎶', '🎹', '🖌️', '🖍️', '📺', '🎧', '🎥', '🎞️'],
    '⚽ Sports': ['⚽', '🏀', '🏈', '🎾', '🏐', '🏓', '🏃', '🚴', '🏊', '🧘', '💪', '🏋️', '🤸', '🏆', '🥇'],
    '😀 Faces': ['😀', '😎', '🤓', '😴', '🤔', '😤', '🥳', '😍', '🫡', '👀', '🧠', '💡', '❤️', '⭐', '🔥'],
    '🍔 Food': ['🍔', '🍕', '🍣', '☕', '🍿', '🍩', '🧁', '🍎', '🥗', '🍳', '🥤', '🧃', '🍫', '🥐', '🍉'],
    '🌍 Nature': ['🌍', '🌞', '🌙', '⛅', '🌊', '🌸', '🌿', '🍀', '🌲', '🦋', '🐝', '🐾', '🌈', '❄️', '🌻'],
    '🎯 Other': ['🎯', '🎮', '🧩', '🎲', '🚀', '✈️', '🏠', '🎁', '🔔', '📌', '🏷️', '💬', '🛒', '📅', '⏰'],
};

const ALL_CATEGORIES = Object.keys(EMOJI_CATEGORIES);

const LabelManager = () => {
    const { user } = useAuth();
    const [labels, setLabels] = useState([]);
    const [showAdd, setShowAdd] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [name, setName] = useState('');
    const [color, setColor] = useState(COLORS[0]);
    const [icon, setIcon] = useState('📚');
    const [emojiCategory, setEmojiCategory] = useState(ALL_CATEGORIES[0]);

    useEffect(() => {
        if (!user) return;
        const unsub = subscribeToLabels(user.uid, setLabels);
        return () => unsub();
    }, [user]);

    const resetForm = () => {
        setName('');
        setColor(COLORS[0]);
        setIcon('📚');
        setShowAdd(false);
        setEditingId(null);
        setEmojiCategory(ALL_CATEGORIES[0]);
    };

    const handleSubmit = async () => {
        if (!name.trim()) return;
        if (editingId) {
            await updateLabel(user.uid, editingId, { name: name.trim(), color, icon });
        } else {
            await addLabel(user.uid, { name: name.trim(), color, icon });
        }
        resetForm();
    };

    const handleEdit = (label) => {
        setName(label.name);
        setColor(label.color);
        setIcon(label.icon);
        setEditingId(label.id);
        setShowAdd(true);
    };

    const handleDelete = async (labelId) => {
        if (confirm('Delete this label?')) {
            await deleteLabel(user.uid, labelId);
        }
    };

    return (
        <div className="labels-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">🏷️ Labels</h1>
                    <p className="page-subtitle">Organize your tasks with custom labels</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
                    <FiPlus /> New Label
                </button>
            </div>

            {showAdd && (
                <div className="label-form-card">
                    <div className="label-form-header">
                        <h3>{editingId ? 'Edit Label' : 'New Label'}</h3>
                        <button className="modal-close" onClick={resetForm}><FiX /></button>
                    </div>
                    <div className="label-form-content">
                        <div className="form-group">
                            <label className="form-label">Name</label>
                            <input
                                type="text"
                                className="form-input"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Label name..."
                                autoFocus
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Icon</label>
                            <div className="emoji-category-tabs">
                                {ALL_CATEGORIES.map((cat) => (
                                    <button
                                        key={cat}
                                        className={`emoji-cat-btn ${emojiCategory === cat ? 'emoji-cat-btn--active' : ''}`}
                                        onClick={() => setEmojiCategory(cat)}
                                    >
                                        {cat.split(' ')[0]}
                                    </button>
                                ))}
                            </div>
                            <div className="emoji-grid">
                                {EMOJI_CATEGORIES[emojiCategory].map((e) => (
                                    <button
                                        key={e}
                                        type="button"
                                        className={`emoji-btn ${icon === e ? 'emoji-btn--active' : ''}`}
                                        onClick={() => setIcon(e)}
                                    >
                                        {e}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Color</label>
                            <div className="color-grid">
                                {COLORS.map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        className={`color-swatch ${color === c ? 'color-swatch--active' : ''}`}
                                        style={{ background: c }}
                                        onClick={() => setColor(c)}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="label-preview">
                            <span className="task-label" style={{ background: color + '20', color }}>
                                {icon} {name || 'Preview'}
                            </span>
                        </div>
                        <div className="form-actions">
                            <button className="btn btn-ghost" onClick={resetForm}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSubmit} disabled={!name.trim()}>
                                <FiCheck /> {editingId ? 'Update' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="labels-grid">
                {labels.map((label) => (
                    <div key={label.id} className="label-card" style={{ borderColor: label.color + '40' }}>
                        <div className="label-card-icon" style={{ background: label.color + '20' }}>
                            <span>{label.icon}</span>
                        </div>
                        <h3 className="label-card-name" style={{ color: label.color }}>{label.name}</h3>
                        <div className="label-card-actions">
                            <button className="task-action-btn" onClick={() => handleEdit(label)}>
                                <FiEdit2 />
                            </button>
                            <button className="task-action-btn task-action-btn--danger" onClick={() => handleDelete(label.id)}>
                                <FiTrash2 />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default LabelManager;
