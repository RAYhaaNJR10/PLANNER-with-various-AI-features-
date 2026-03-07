import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    onSnapshot,
    serverTimestamp,
    getDocs,
} from 'firebase/firestore';
import { db } from '../firebase';

const getTasksRef = (userId) =>
    collection(db, 'users', userId, 'tasks');

export const addTask = async (userId, task) => {
    const ref = getTasksRef(userId);
    return addDoc(ref, {
        ...task,
        completed: false,
        createdAt: serverTimestamp(),
    });
};

export const updateTask = async (userId, taskId, updates) => {
    const ref = doc(db, 'users', userId, 'tasks', taskId);

    // Check if we are checking off a recurring task for a specific date
    if (updates.hasOwnProperty('completed') && updates.dateStr) {
        // We need to fetch the task to see if it's recurring
        const { getDoc } = await import('firebase/firestore');
        const snap = await getDoc(ref);
        const taskData = snap.data();

        if (taskData.recurrence === 'daily') {
            const completedDates = taskData.completedDates || [];
            let newCompletedDates;
            if (updates.completed) {
                newCompletedDates = [...new Set([...completedDates, updates.dateStr])];
            } else {
                newCompletedDates = completedDates.filter(d => d !== updates.dateStr);
            }
            return updateDoc(ref, { completedDates: newCompletedDates });
        }
    }

    // If it's a normal update, just pass it through 
    // (strip the temp dateStr field just in case)
    const finalUpdates = { ...updates };
    delete finalUpdates.dateStr;
    return updateDoc(ref, finalUpdates);
};

export const deleteTask = async (userId, taskId) => {
    const ref = doc(db, 'users', userId, 'tasks', taskId);
    return deleteDoc(ref);
};

export const subscribeToTasksByDate = (userId, dateStr, callback) => {
    const ref = getTasksRef(userId);

    // Firestore lacks an easy OR statement that works securely with indexing here out of the box.
    // So we run two parallel snapshot listeners: one for specific date, one for daily recurrence.
    let dateTasks = [];
    let dailyTasks = [];

    const notify = () => {
        // Merge without duplicates (in case a daily task was ALSO scheduled for today specifically)
        const combined = [...dateTasks];
        dailyTasks.forEach(dt => {
            if (!combined.find(t => t.id === dt.id)) {
                combined.push(dt);
            }
        });

        // Compute dynamic 'completed' state for recurring tasks
        const processed = combined.map(task => {
            if (task.recurrence === 'daily') {
                return {
                    ...task,
                    // If the date is in completedDates, it's checked off today
                    completed: (task.completedDates || []).includes(dateStr)
                };
            }
            return task;
        });

        processed.sort((a, b) => {
            const aTime = a.createdAt?.seconds || 0;
            const bTime = b.createdAt?.seconds || 0;
            return aTime - bTime;
        });
        callback(processed);
    };

    const qDate = query(ref, where('date', '==', dateStr));
    const unsubDate = onSnapshot(qDate, (snapshot) => {
        dateTasks = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        notify();
    }, (err) => console.error("Date tasks error:", err));

    const qDaily = query(ref, where('recurrence', '==', 'daily'));
    const unsubDaily = onSnapshot(qDaily, (snapshot) => {
        dailyTasks = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        // Filter out daily tasks created *after* the viewing date (can't do future daily tasks if created today)
        dailyTasks = dailyTasks.filter(t => {
            if (!t.date) return true;
            return t.date <= dateStr;
        });
        notify();
    }, (err) => console.error("Daily tasks error:", err));

    return () => {
        unsubDate();
        unsubDaily();
    };
};

export const subscribeToAllTasks = (userId, callback) => {
    const ref = getTasksRef(userId);
    return onSnapshot(ref, (snapshot) => {
        const tasks = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        callback(tasks);
    }, (error) => {
        console.error('Error listening to all tasks:', error);
    });
};

export const getPendingTasks = async (userId) => {
    const ref = getTasksRef(userId);
    const q = query(ref, where('completed', '==', false), where('recurrence', 'in', ['none', undefined, null]));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};
