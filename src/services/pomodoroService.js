import { db } from '../firebase';
import {
    collection, addDoc, query, where, getDocs, serverTimestamp
} from 'firebase/firestore';

export const logPomodoroSession = async (uid, { taskTitle, duration, date }) => {
    try {
        await addDoc(collection(db, 'users', uid, 'pomodoroSessions'), {
            taskTitle: taskTitle || 'Focus Session',
            duration, // minutes
            date,
            createdAt: serverTimestamp(),
        });
    } catch (e) {
        console.error('logPomodoroSession error:', e);
    }
};

export const getSessionsForDate = async (uid, date) => {
    const q = query(
        collection(db, 'users', uid, 'pomodoroSessions'),
        where('date', '==', date)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getTotalMinutesThisWeek = async (uid) => {
    const today = new Date();
    const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        return d.toISOString().split('T')[0];
    });

    let total = 0;
    for (const date of days) {
        const sessions = await getSessionsForDate(uid, date);
        total += sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    }
    return total;
};

export const getPomodoroHistoryForLast30Days = async (uid) => {
    // Generate the last 30 days
    const days = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        days.push(d.toISOString().split('T')[0]);
    }

    const history = [];
    for (const date of days) {
        const sessions = await getSessionsForDate(uid, date);
        const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
        history.push({ date, totalMinutes });
    }

    return history;
};
