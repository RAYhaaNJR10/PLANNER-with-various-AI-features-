import { useState, useEffect } from 'react';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    addDays,
    addMonths,
    subMonths,
    isSameMonth,
    isToday,
} from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { FiChevronLeft, FiChevronRight, FiCloud, FiX } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { getPendingTasks, subscribeToAllTasks } from '../services/taskService';
import { subscribeToLabels } from '../services/labelService';
import { exportTasksToGoogleCalendar } from '../services/calendarService';
import './Calendar.css';

const Calendar = () => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const navigate = useNavigate();
    const { user, calendarToken } = useAuth();
    const [syncing, setSyncing] = useState(false);

    const [tasks, setTasks] = useState([]);
    const [labels, setLabels] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedDayTasks, setSelectedDayTasks] = useState([]);

    useEffect(() => {
        if (!user) return;
        const unsub = subscribeToAllTasks(user.uid, setTasks);
        return () => unsub();
    }, [user]);

    useEffect(() => {
        if (!user) return;
        const unsub = subscribeToLabels(user.uid, setLabels);
        return () => unsub();
    }, [user]);

    const getLabel = (labelId) => labels.find(l => l.id === labelId);

    const handleSync = async () => {
        if (!calendarToken) {
            alert('Please sign out and sign back in to grant Google Calendar permissions.');
            return;
        }
        setSyncing(true);
        try {
            const tasks = await getPendingTasks(user.uid);
            if (tasks.length === 0) {
                alert('No pending tasks to sync!');
                return;
            }
            const { success, failed } = await exportTasksToGoogleCalendar(tasks, calendarToken);
            alert(`✅ Synced ${success} tasks to Google Calendar! ${failed > 0 ? `(${failed} failed)` : ''}`);
        } catch (e) {
            alert(e.message);
        } finally {
            setSyncing(false);
        }
    };

    const handleDateClick = (day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayTasks = tasks.filter(t => t.date === dateStr);
        setSelectedDate(day);
        setSelectedDayTasks(dayTasks);
    };

    const renderHeader = () => (
        <div className="cal-header">
            <button className="cal-nav-btn" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <FiChevronLeft />
            </button>
            <h2 className="cal-month-title">{format(currentMonth, 'MMMM yyyy')}</h2>
            <button className="cal-nav-btn" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <FiChevronRight />
            </button>
        </div>
    );

    const renderDays = () => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return (
            <div className="cal-weekdays">
                {days.map((d) => (
                    <div key={d} className="cal-weekday">{d}</div>
                ))}
            </div>
        );
    };

    const renderCells = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd);

        const rows = [];
        let days = [];
        let day = startDate;

        while (day <= endDate) {
            for (let i = 0; i < 7; i++) {
                const cloneDay = day;
                const dateStr = format(cloneDay, 'yyyy-MM-dd');
                const isCurrentMonth = isSameMonth(day, monthStart);
                const today = isToday(day);

                const dayTasks = tasks.filter(t => t.date === dateStr);
                const visibleTasks = dayTasks.slice(0, 2);
                const hiddenCount = dayTasks.length - 2;

                days.push(
                    <div
                        key={day.toISOString()}
                        className={`cal-cell ${!isCurrentMonth ? 'cal-cell--disabled' : ''} ${today ? 'cal-cell--today' : ''}`}
                        onClick={() => isCurrentMonth && handleDateClick(cloneDay)}
                    >
                        <span className="cal-cell-number">{format(day, 'd')}</span>
                        {isCurrentMonth && (
                            <div className="cal-cell-tasks">
                                {visibleTasks.map(t => {
                                    const primaryLabelId = t.labelIds?.[0] || t.labelId;
                                    const label = getLabel(primaryLabelId);
                                    const color = label ? label.color : '#888';
                                    return (
                                        <div key={t.id} className={`cal-chip ${t.completed ? 'cal-chip--done' : ''}`} style={{ backgroundColor: color + '40', color: color, borderColor: color }}>
                                            {t.title}
                                        </div>
                                    );
                                })}
                                {hiddenCount > 0 && (
                                    <div className="cal-chip-more">+{hiddenCount} more</div>
                                )}
                            </div>
                        )}
                    </div>
                );
                day = addDays(day, 1);
            }
            rows.push(
                <div key={day.toISOString()} className="cal-row">
                    {days}
                </div>
            );
            days = [];
        }
        return <div className="cal-body">{rows}</div>;
    };

    return (
        <div className="calendar-page">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="page-title">📅 Calendar</h1>
                    <p className="page-subtitle">Click a date to view or add tasks</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={handleSync}
                    disabled={syncing}
                    title={!calendarToken ? "Sign out and sign in again to enable Google Calendar Sync" : "Export your pending tasks to Google Calendar"}
                >
                    <FiCloud /> {syncing ? 'Syncing...' : 'Sync to GCal'}
                </button>
            </div>
            <div className="cal-container">
                {renderHeader()}
                {renderDays()}
                {renderCells()}
            </div>

            {selectedDate && (
                <div className="modal-overlay" onClick={() => setSelectedDate(null)}>
                    <div className="modal-card code-modal" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{format(selectedDate, 'EEEE, MMMM do')}</h2>
                            <button className="modal-close" onClick={() => setSelectedDate(null)}>
                                <FiX />
                            </button>
                        </div>
                        <div className="cal-popup-content">
                            {selectedDayTasks.length === 0 ? (
                                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', margin: '20px 0' }}>No tasks scheduled for this day.</p>
                            ) : (
                                <div className="cal-popup-tasks">
                                    {selectedDayTasks.map(t => {
                                        const primaryLabelId = t.labelIds?.[0] || t.labelId;
                                        const label = getLabel(primaryLabelId);
                                        const color = label ? label.color : '#888';
                                        return (
                                            <div key={t.id} className="cal-popup-task">
                                                <div className="cal-popup-task-color" style={{ backgroundColor: color }}></div>
                                                <span className={`cal-popup-task-title ${t.completed ? 'completed' : ''}`}>{t.title}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            <button
                                className="btn btn-primary"
                                style={{ width: '100%', marginTop: '20px' }}
                                onClick={() => navigate(`/?date=${format(selectedDate, 'yyyy-MM-dd')}`)}
                            >
                                Manage Tasks
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Calendar;
