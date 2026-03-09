import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, isToday, parseISO } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToTasksByDate, updateTask, deleteTask, subscribeToAssignments } from '../services/taskService';
import { subscribeToLabels } from '../services/labelService';
import { breakdownTask } from '../services/geminiService';
import { awardXP, updateStreak, updateChallengeProgress } from '../services/gamificationService';
import TaskForm from './TaskForm';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FiPlus, FiEdit2, FiTrash2, FiCheck, FiZap, FiLayout, FiList } from 'react-icons/fi';
import './TaskList.css';

const PRIORITY_CONFIG = {
    high: { label: 'High', color: '#E74C3C', emoji: '🔴' },
    medium: { label: 'Med', color: '#F39C12', emoji: '🟡' },
    low: { label: 'Low', color: '#27AE60', emoji: '🟢' },
};

const TaskList = () => {
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const dateParam = searchParams.get('date');
    const selectedDate = dateParam || format(new Date(), 'yyyy-MM-dd');

    const [tasks, setTasks] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [labels, setLabels] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [wandLoading, setWandLoading] = useState(null); // taskId loading
    const [expandedSubtasks, setExpandedSubtasks] = useState({});
    const [newSubtaskInputs, setNewSubtaskInputs] = useState({});
    const [viewMode, setViewMode] = useState('list');
    const [draggingTaskId, setDraggingTaskId] = useState(null);
    const [isAssignmentMode, setIsAssignmentMode] = useState(false);

    useEffect(() => {
        if (!user) return;
        const unsub = subscribeToTasksByDate(user.uid, selectedDate, setTasks);
        return () => unsub();
    }, [user, selectedDate]);

    useEffect(() => {
        if (!user) return;
        const unsub = subscribeToAssignments(user.uid, setAssignments);
        return () => unsub();
    }, [user]);

    useEffect(() => {
        if (!user) return;
        const unsub = subscribeToLabels(user.uid, setLabels);
        return () => unsub();
    }, [user]);

    const handleToggleComplete = async (task, forceComplete = null) => {
        const nowDone = forceComplete !== null ? forceComplete : !task.completed;
        if (nowDone === task.completed) return; // No real change

        // Pass dateStr so recurring tasks know *which* date was checked off
        await updateTask(user.uid, task.id, { completed: nowDone, dateStr: selectedDate });

        if (nowDone) {
            const nowSeconds = Date.now() / 1000;
            const createdSeconds = task.createdAt?.seconds || 0;
            const ageInSeconds = nowSeconds - createdSeconds;

            // Prevent XP abuse by requiring tasks to be at least 2 minutes old
            if (ageInSeconds > 120 || createdSeconds === 0) {
                await awardXP(user.uid, 5); // Base XP for task
            }

            // Check if 3+ tasks done today for streak bonus
            const todayDone = tasks.filter(t => t.completed || t.id === task.id).length;
            if (todayDone >= 3) await updateStreak(user.uid);

            await updateChallengeProgress(user.uid, 'task', 1);
        }
    };

    const handleToggleSubtask = async (task, idx) => {
        const subTasks = [...(task.subTasks || [])];
        subTasks[idx] = { ...subTasks[idx], done: !subTasks[idx].done };
        await updateTask(user.uid, task.id, { subTasks });
        if (subTasks[idx].done) {
            // Was just completed
            await awardXP(user.uid, 5);
        }
    };

    const handleAddSubtask = async (task, e) => {
        e.preventDefault();
        const text = newSubtaskInputs[task.id];
        if (!text || !text.trim()) return;

        const subTasks = [...(task.subTasks || []), { text: text.trim(), done: false }];
        await updateTask(user.uid, task.id, { subTasks });
        setNewSubtaskInputs(prev => ({ ...prev, [task.id]: '' }));
    };

    const handleDelete = async (taskId) => {
        if (confirm('Delete this task?')) await deleteTask(user.uid, taskId);
    };

    const handleEdit = (task) => {
        setEditingTask(task);
        setShowForm(true);
    };

    const handleMagicWand = async (task) => {
        setWandLoading(task.id);
        try {
            const steps = await breakdownTask(task.title, task.description);
            const subTasks = steps.map(s => ({ text: s, done: false }));
            await updateTask(user.uid, task.id, { subTasks });
            setExpandedSubtasks(prev => ({ ...prev, [task.id]: true }));
        } catch (e) {
            alert('AI breakdown failed: ' + e.message);
        } finally {
            setWandLoading(null);
        }
    };

    const handleCloseForm = () => {
        setShowForm(false);
        setEditingTask(null);
        setIsAssignmentMode(false);
    };

    const handleAddAssignment = () => {
        setIsAssignmentMode(true);
        setShowForm(true);
    };

    // --- Drag and Drop Logic ---
    const handleDragStart = (e, taskId) => {
        setDraggingTaskId(taskId);
        e.dataTransfer.effectAllowed = 'move';
        // Need to set data for Firefox to allow drag
        e.dataTransfer.setData('text/plain', taskId);
    };

    const handleDragOver = (e) => {
        e.preventDefault(); // allow dropping
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e, targetStatus) => {
        e.preventDefault();
        if (!draggingTaskId) return;
        const task = tasks.find(t => t.id === draggingTaskId);
        if (task) {
            if (targetStatus === 'done' && !task.completed) {
                handleToggleComplete(task, true);
            } else if (targetStatus === 'todo' && task.completed) {
                handleToggleComplete(task, false);
            }
        }
        setDraggingTaskId(null);
    };

    const handleListDragOver = (e) => {
        if (viewMode !== 'list') return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleListDrop = async (e, targetTaskId) => {
        if (viewMode !== 'list') return;
        e.preventDefault();
        if (!draggingTaskId || draggingTaskId === targetTaskId) return;

        const sourceIndex = tasks.findIndex(t => t.id === draggingTaskId);
        const targetIndex = tasks.findIndex(t => t.id === targetTaskId);
        
        if (sourceIndex === -1 || targetIndex === -1) return;

        const newTasks = [...tasks];
        const [moved] = newTasks.splice(sourceIndex, 1);
        newTasks.splice(targetIndex, 0, moved);
        
        // Optimistic UI
        setTasks(newTasks);

        try {
            await Promise.all(newTasks.map((t, idx) => updateTask(user.uid, t.id, { order: idx })));
        } catch (err) {
            console.error('Failed to save order:', err);
        }
        setDraggingTaskId(null);
    };

    const getLabel = (labelId) => labels.find((l) => l.id === labelId);

    const displayDate = parseISO(selectedDate);
    const dateTitle = isToday(displayDate) ? "Today's Plan" : format(displayDate, 'EEEE, MMMM do');
    const completedCount = tasks.filter((t) => t.completed).length;

    const renderTaskCard = (task) => {
        const taskLabelIds = task.labelIds || (task.labelId ? [task.labelId] : []);
        const taskLabels = taskLabelIds.map(id => getLabel(id)).filter(Boolean);
        const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
        const hasSubtasks = task.subTasks && task.subTasks.length > 0;
        const isExpanded = expandedSubtasks[task.id];

        return (
            <div
                key={task.id}
                className={`task-card ${task.completed ? 'task-card--done' : ''} ${viewMode === 'kanban' ? 'kanban-card' : ''} ${draggingTaskId === task.id ? 'is-dragging' : ''}`}
                draggable={true}
                onDragStart={(e) => handleDragStart(e, task.id)}
                onDragEnd={() => setDraggingTaskId(null)}
                onDragOver={viewMode === 'list' ? handleListDragOver : undefined}
                onDrop={viewMode === 'list' ? (e) => handleListDrop(e, task.id) : undefined}
            >
                <button
                    className={`task-check ${task.completed ? 'task-check--checked' : ''}`}
                    onClick={() => handleToggleComplete(task)}
                >
                    {task.completed && <FiCheck />}
                </button>

                <div className="task-content">
                    <h3 className="task-title">
                        {task.recurrence === 'daily' && <span style={{ marginRight: '6px', fontSize: '0.9em' }}>🔄</span>}
                        {task.title}
                    </h3>
                    {task.description && viewMode === 'list' && (
                        <div className="task-desc task-desc--markdown">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {task.description}
                            </ReactMarkdown>
                        </div>
                    )}
                    <div className="task-meta">
                        <span className="task-priority" style={{ background: priority.color + '20', color: priority.color }}>
                            {priority.emoji} {priority.label}
                        </span>
                        {taskLabels.map(label => (
                            <span key={label.id} className="task-label" style={{ background: label.color + '20', color: label.color }}>
                                {label.icon} {label.name}
                            </span>
                        ))}
                        <button
                            className="subtask-toggle"
                            onClick={() => setExpandedSubtasks(prev => ({ ...prev, [task.id]: !isExpanded }))}
                        >
                            {hasSubtasks ? `${task.subTasks.filter(s => s.done).length}/${task.subTasks.length} ${viewMode === 'kanban' ? '' : 'steps'}` : 'Add Sub-tasks'} {isExpanded ? '▲' : '▼'}
                        </button>
                    </div>

                    {isExpanded && (
                        <div className="subtask-list">
                            {hasSubtasks && task.subTasks.map((st, idx) => (
                                <div key={idx} className={`subtask-item ${st.done ? 'subtask-item--done' : ''}`}>
                                    <button
                                        className={`subtask-check ${st.done ? 'subtask-check--done' : ''}`}
                                        onClick={() => handleToggleSubtask(task, idx)}
                                    >
                                        {st.done && <FiCheck size={10} />}
                                    </button>
                                    <span>{st.text}</span>
                                </div>
                            ))}
                            <form 
                                onSubmit={(e) => handleAddSubtask(task, e)} 
                                style={{ display: 'flex', gap: '8px', marginTop: '4px' }}
                            >
                                <input 
                                    type="text" 
                                    placeholder="Add sub-task..." 
                                    className="subtask-input"
                                    value={newSubtaskInputs[task.id] || ''}
                                    onChange={(e) => setNewSubtaskInputs(prev => ({...prev, [task.id]: e.target.value}))}
                                    style={{ flex: 1, padding: '4px 8px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                                />
                                <button type="submit" style={{ background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '4px', padding: '0 8px', cursor: 'pointer', fontSize: '0.8rem' }}>+</button>
                            </form>
                        </div>
                    )}
                </div>

                <div className="task-actions">
                    <button
                        className="task-action-btn task-wand-btn"
                        onClick={() => handleMagicWand(task)}
                        title="AI Task Breakdown"
                        disabled={wandLoading === task.id}
                    >
                        {wandLoading === task.id ? <span className="wand-spin">⏳</span> : <FiZap />}
                    </button>
                    <button className="task-action-btn" onClick={() => handleEdit(task)}>
                        <FiEdit2 />
                    </button>
                    <button className="task-action-btn task-action-btn--danger" onClick={() => handleDelete(task.id)}>
                        <FiTrash2 />
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="tasklist-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">✨ {dateTitle}</h1>
                    <p className="page-subtitle">
                        {tasks.length === 0 ? 'No tasks yet — add one!' : `${completedCount}/${tasks.length} completed`}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <div className="view-toggle">
                        <button
                            className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                            onClick={() => setViewMode('list')}
                            title="List View"
                        >
                            <FiList />
                        </button>
                        <button
                            className={`view-btn ${viewMode === 'kanban' ? 'active' : ''}`}
                            onClick={() => setViewMode('kanban')}
                            title="Kanban Board"
                        >
                            <FiLayout />
                        </button>
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                        <FiPlus /> Add Task
                    </button>
                </div>
            </div>

            {tasks.length > 0 && viewMode === 'list' && (
                <div className="task-progress-bar">
                    <div className="task-progress-fill" style={{ width: `${(completedCount / tasks.length) * 100}%` }} />
                </div>
            )}

            <div className={`task-list-container ${viewMode === 'kanban' ? 'is-kanban' : ''}`} style={{ display: 'flex', gap: '24px' }}>
                {viewMode === 'list' ? (
                    <>
                        <div className="task-list" style={{ flex: 1 }}>
                            {tasks.map((task) => renderTaskCard(task))}
                            {tasks.length === 0 && (
                                <div className="empty-state">
                                    <span className="empty-emoji">🎯</span>
                                    <h3>No tasks for this day</h3>
                                    <p>Click "Add Task" to plan your day!</p>
                                </div>
                            )}
                        </div>
                        <div className="assignments-sidebar" style={{ width: '300px', borderLeft: '1px solid var(--border)', paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    📚 Assignments
                                </h3>
                                <button className="btn btn-secondary btn-sm" onClick={handleAddAssignment} style={{ fontSize: '0.8rem', padding: '4px 8px' }}>
                                    <FiPlus /> Add
                                </button>
                            </div>
                            {assignments.length === 0 ? (
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No pending assignments. Great job!</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    {[...new Set(assignments.map(a => a.date || 'No Date'))].map(dateGroup => (
                                        <div key={dateGroup}>
                                            <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
                                                {dateGroup === 'No Date' ? dateGroup : format(parseISO(dateGroup), 'MMM do, yyyy')}
                                            </h4>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {assignments.filter(a => (a.date || 'No Date') === dateGroup).map(assignment => (
                                                    <div key={assignment.id} className="assignment-card" style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                                                            <h5 style={{ margin: 0, fontSize: '0.95rem' }}>{assignment.title}</h5>
                                                            <button className={`task-check ${assignment.completed ? 'task-check--checked' : ''}`} onClick={() => handleToggleComplete(assignment, true)} style={{ transform: 'scale(0.8)', margin: 0 }}>
                                                                {assignment.completed && <FiCheck />}
                                                            </button>
                                                        </div>
                                                        {assignment.dueDate && (
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: '600', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                📅 Due: {format(parseISO(assignment.dueDate), 'MMM do')}
                                                            </div>
                                                        )}
                                                        {assignment.description && (
                                                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                                {assignment.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="kanban-board">
                        <div
                            className="kanban-column"
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, 'todo')}
                        >
                            <h3 className="kanban-title">To Do <span className="kanban-badge">{tasks.length - completedCount}</span></h3>
                            <div className="kanban-cards">
                                {tasks.filter(t => !t.completed).map((task) => renderTaskCard(task))}
                            </div>
                        </div>

                        <div
                            className="kanban-column"
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, 'done')}
                        >
                            <h3 className="kanban-title">Done <span className="kanban-badge">{completedCount}</span></h3>
                            <div className="kanban-cards">
                                {tasks.filter(t => t.completed).map((task) => renderTaskCard(task))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {showForm && (
                <TaskForm
                    date={selectedDate}
                    labels={labels}
                    task={editingTask}
                    isAssignmentMode={isAssignmentMode}
                    onClose={handleCloseForm}
                />
            )}
        </div>
    );
};

export default TaskList;
