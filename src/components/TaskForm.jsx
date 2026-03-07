import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { addTask, updateTask } from '../services/taskService';
import { addLabel } from '../services/labelService';
import { FiX, FiPlus } from 'react-icons/fi';
import './TaskForm.css';

const TaskForm = ({ date, labels, task, onClose }) => {
    const { user } = useAuth();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('medium');
    const [labelIds, setLabelIds] = useState([]);
    const [newLabelName, setNewLabelName] = useState('');
    const [newLabelIcon, setNewLabelIcon] = useState('🏷️');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [creatingLabel, setCreatingLabel] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (task) {
            setTitle(task.title || '');
            setDescription(task.description || '');
            setPriority(task.priority || 'medium');

            // Handle backwards compatibility with older single labelId string
            if (task.labelIds) setLabelIds(task.labelIds);
            else if (task.labelId) setLabelIds([task.labelId]);
            else setLabelIds([]);
        }
    }, [task]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim()) return;
        setSaving(true);

        try {
            const taskData = {
                title: title.trim(),
                description: description.trim(),
                priority,
                labelIds,
                date,
            };

            if (task) {
                await updateTask(user.uid, task.id, taskData);
            } else {
                await addTask(user.uid, taskData);
            }
            onClose();
        } catch (err) {
            console.error('Error saving task:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleCreateLabel = async () => {
        if (!newLabelName.trim() || creatingLabel) return;
        setCreatingLabel(true);
        try {
            const colors = ['#6C5CE7', '#00B894', '#E17055', '#FDCB6E', '#0984E3', '#FD79A8'];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            const newLabel = await addLabel(user.uid, {
                name: newLabelName.trim(),
                color: randomColor,
                icon: newLabelIcon
            });
            setLabelIds(prev => [...prev, newLabel.id]);
            setNewLabelName('');
            setNewLabelIcon('🏷️');
            setShowEmojiPicker(false);
        } catch (e) {
            console.error("Error creating label:", e);
        } finally {
            setCreatingLabel(false);
        }
    };

    const emojiOptions = [
        '🏷️', '📚', '💻', '💡', '🔥', '🎯', '⚽', '🏋️', '🧠', '🎨', '🎵',
        '✈️', '🚗', '🏝️', '🏠', '🍕', '☕', '💰', '📉', '📈', '📅', '⏰',
        '⭐', '❤️', '✅', '❌', '⚠️', '🛠️', '🛒', '🎁', '🎓', '🏥', '🐾',
        '🌱', '🌿', '🍎', '🍔', '🎮', '🎲', '🎬', '📸', '📖', '📝', '✉️',
    ];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{task ? 'Edit Task' : 'New Task'}</h2>
                    <button className="modal-close" onClick={onClose}>
                        <FiX />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="task-form">
                    <div className="form-group">
                        <label className="form-label">Title</label>
                        <input
                            type="text"
                            className="form-input"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="What do you need to do?"
                            autoFocus
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">
                            Description
                            <span className="md-hint">supports **bold**, *italic*, - lists, - [ ] checklists</span>
                        </label>
                        <div className="md-toolbar">
                            {[
                                { label: 'B', insert: '**text**', title: 'Bold' },
                                { label: 'I', insert: '*text*', title: 'Italic' },
                                { label: '`', insert: '`code`', title: 'Code' },
                                { label: '•', insert: '- ', title: 'Bullet list' },
                                { label: '1.', insert: '1. ', title: 'Numbered list' },
                                { label: '☑', insert: '- [ ] ', title: 'Checklist item' },
                            ].map(({ label, insert, title }) => (
                                <button
                                    key={label}
                                    type="button"
                                    className="md-toolbar-btn"
                                    title={title}
                                    onClick={() => setDescription(d => d + insert)}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        <textarea
                            className="form-input form-textarea"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Add details... supports **markdown** formatting"
                            rows={4}
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Priority</label>
                            <div className="priority-selector">
                                {['low', 'medium', 'high'].map((p) => (
                                    <button
                                        key={p}
                                        type="button"
                                        className={`priority-btn priority-btn--${p} ${priority === p ? 'priority-btn--active' : ''}`}
                                        onClick={() => setPriority(p)}
                                    >
                                        {p === 'high' ? '🔴' : p === 'medium' ? '🟡' : '🟢'} {p.charAt(0).toUpperCase() + p.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Labels</label>
                        <div className="label-selector">
                            {labels.map((l) => (
                                <button
                                    key={l.id}
                                    type="button"
                                    className={`label-chip ${labelIds.includes(l.id) ? 'label-chip--active' : ''}`}
                                    style={{
                                        '--chip-color': l.color,
                                        background: labelIds.includes(l.id) ? l.color + '30' : undefined,
                                        borderColor: labelIds.includes(l.id) ? l.color : undefined,
                                        color: labelIds.includes(l.id) ? l.color : undefined,
                                    }}
                                    onClick={() => setLabelIds(prev =>
                                        prev.includes(l.id) ? prev.filter(id => id !== l.id) : [...prev, l.id]
                                    )}
                                >
                                    {l.icon} {l.name}
                                </button>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', position: 'relative' }}>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ padding: '6px', fontSize: '1.2rem', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                title="Choose icon"
                            >
                                {newLabelIcon}
                            </button>
                            {showEmojiPicker && (
                                <div style={{
                                    position: 'absolute', top: '100%', left: '0', zIndex: 10,
                                    background: 'var(--card)', border: '1px solid var(--border)',
                                    borderRadius: '8px', padding: '12px', display: 'grid',
                                    gridTemplateColumns: 'repeat(8, 1fr)', gap: '6px',
                                    boxShadow: 'var(--shadow-md)', marginTop: '4px',
                                    width: 'max-content', maxWidth: '300px'
                                }}>
                                    {emojiOptions.map(emoji => (
                                        <button
                                            key={emoji}
                                            type="button"
                                            style={{
                                                background: 'transparent', border: 'none', cursor: 'pointer',
                                                fontSize: '1.2rem', padding: '4px', borderRadius: '4px',
                                                backgroundColor: newLabelIcon === emoji ? 'var(--hover)' : 'transparent'
                                            }}
                                            onClick={() => {
                                                setNewLabelIcon(emoji);
                                                setShowEmojiPicker(false);
                                            }}
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <input
                                type="text"
                                className="form-input"
                                style={{ flex: 1, padding: '6px 12px', fontSize: '0.85rem' }}
                                placeholder="Or create a new label..."
                                value={newLabelName}
                                onChange={(e) => setNewLabelName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleCreateLabel();
                                    }
                                }}
                            />
                            <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ padding: '6px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                onClick={handleCreateLabel}
                                disabled={!newLabelName.trim() || creatingLabel}
                            >
                                {creatingLabel ? '...' : <><FiPlus /> Create</>}
                            </button>
                        </div>
                    </div>

                    <div className="form-actions">
                        <button type="button" className="btn btn-ghost" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={saving || !title.trim()}>
                            {saving ? 'Saving...' : task ? 'Update' : 'Add Task'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TaskForm;
