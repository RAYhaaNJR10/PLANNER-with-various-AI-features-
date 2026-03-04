import { useState } from 'react';
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
    isSameDay,
    isToday,
} from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import './Calendar.css';

const Calendar = () => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const navigate = useNavigate();

    const handleDateClick = (day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        navigate(`/?date=${dateStr}`);
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
                const isCurrentMonth = isSameMonth(day, monthStart);
                const today = isToday(day);

                days.push(
                    <div
                        key={day.toISOString()}
                        className={`cal-cell ${!isCurrentMonth ? 'cal-cell--disabled' : ''} ${today ? 'cal-cell--today' : ''}`}
                        onClick={() => isCurrentMonth && handleDateClick(cloneDay)}
                    >
                        <span className="cal-cell-number">{format(day, 'd')}</span>
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
            <div className="page-header">
                <h1 className="page-title">📅 Calendar</h1>
                <p className="page-subtitle">Click a date to view or add tasks</p>
            </div>
            <div className="cal-container">
                {renderHeader()}
                {renderDays()}
                {renderCells()}
            </div>
        </div>
    );
};

export default Calendar;
