import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { addTask, updateTask } from '../services/taskService';
import { FiX } from 'react-icons/fi';
import './TaskForm.css';

const TaskForm = ({ date, labels, task, onClose }) => {
    const { user } = useAuth();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('medium');
    const [labelId, setLabelId] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (task) {
            setTitle(task.title || '');
            setDescription(task.description || '');
            setPriority(task.priority || 'medium');
            setLabelId(task.labelId || '');
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
                labelId: labelId || null,
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
                        <label className="form-label">Label</label>
                        <div className="label-selector">
                            <button
                                type="button"
                                className={`label-chip ${!labelId ? 'label-chip--active' : ''}`}
                                onClick={() => setLabelId('')}
                            >
                                None
                            </button>
                            {labels.map((l) => (
                                <button
                                    key={l.id}
                                    type="button"
                                    className={`label-chip ${labelId === l.id ? 'label-chip--active' : ''}`}
                                    style={{
                                        '--chip-color': l.color,
                                        background: labelId === l.id ? l.color + '30' : undefined,
                                        borderColor: labelId === l.id ? l.color : undefined,
                                        color: labelId === l.id ? l.color : undefined,
                                    }}
                                    onClick={() => setLabelId(l.id)}
                                >
                                    {l.icon} {l.name}
                                </button>
                            ))}
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
