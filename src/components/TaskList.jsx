import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, isToday, parseISO } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToTasksByDate, updateTask, deleteTask } from '../services/taskService';
import { subscribeToLabels } from '../services/labelService';
import { breakdownTask } from '../services/geminiService';
import { awardXP, updateStreak } from '../services/gamificationService';
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
    const [labels, setLabels] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [wandLoading, setWandLoading] = useState(null); // taskId loading
    const [expandedSubtasks, setExpandedSubtasks] = useState({});
    const [viewMode, setViewMode] = useState('list');
    const [draggingTaskId, setDraggingTaskId] = useState(null);

    useEffect(() => {
        if (!user) return;
        const unsub = subscribeToTasksByDate(user.uid, selectedDate, setTasks);
        return () => unsub();
    }, [user, selectedDate]);

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
        }
    };

    const handleToggleSubtask = async (task, idx) => {
        const subTasks = [...(task.subTasks || [])];
        subTasks[idx] = { ...subTasks[idx], done: !subTasks[idx].done };
        await updateTask(user.uid, task.id, { subTasks });
        if (!subTasks[idx].done === false) {
            // Was just completed
            await awardXP(user.uid, 5);
        }
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
                draggable={viewMode === 'kanban'}
                onDragStart={(e) => handleDragStart(e, task.id)}
                onDragEnd={() => setDraggingTaskId(null)}
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
                        {hasSubtasks && (
                            <button
                                className="subtask-toggle"
                                onClick={() => setExpandedSubtasks(prev => ({ ...prev, [task.id]: !isExpanded }))}
                            >
                                {task.subTasks.filter(s => s.done).length}/{task.subTasks.length} {viewMode === 'kanban' ? '' : 'steps'} {isExpanded ? '▲' : '▼'}
                            </button>
                        )}
                    </div>

                    {hasSubtasks && isExpanded && (
                        <div className="subtask-list">
                            {task.subTasks.map((st, idx) => (
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

            <div className={`task-list-container ${viewMode === 'kanban' ? 'is-kanban' : ''}`}>
                {viewMode === 'list' ? (
                    <div className="task-list">
                        {tasks.map((task) => renderTaskCard(task))}
                    </div>
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

            {tasks.length === 0 && (
                <div className="empty-state">
                    <span className="empty-emoji">🎯</span>
                    <h3>No tasks for this day</h3>
                    <p>Click "Add Task" to plan your day!</p>
                </div>
            )}

            {showForm && (
                <TaskForm
                    date={selectedDate}
                    labels={labels}
                    task={editingTask}
                    onClose={handleCloseForm}
                />
            )}
        </div>
    );
};

export default TaskList;
