import { db } from '../firebase';
import {
    collection, addDoc, deleteDoc, doc, onSnapshot,
    setDoc, getDoc, serverTimestamp, query, orderBy
} from 'firebase/firestore';

export const subscribeToHabits = (uid, callback) => {
    const q = query(collection(db, 'users', uid, 'habits'), orderBy('createdAt', 'asc'));
    return onSnapshot(q, (snap) => {
        callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
};

export const addHabit = async (uid, { name, icon, color }) => {
    await addDoc(collection(db, 'users', uid, 'habits'), {
        name,
        icon,
        color,
        createdAt: serverTimestamp(),
    });
};

export const deleteHabit = async (uid, habitId) => {
    await deleteDoc(doc(db, 'users', uid, 'habits', habitId));
};

export const recordHabitCompletion = async (uid, habitId, date) => {
    const ref = doc(db, 'users', uid, 'habits', habitId, 'completions', date);
    await setDoc(ref, { completedAt: serverTimestamp() });
};

export const removeHabitCompletion = async (uid, habitId, date) => {
    const ref = doc(db, 'users', uid, 'habits', habitId, 'completions', date);
    await deleteDoc(ref);
};

export const getHabitCompletionsForDate = async (uid, habitId, date) => {
    const ref = doc(db, 'users', uid, 'habits', habitId, 'completions', date);
    const snap = await getDoc(ref);
    return snap.exists();
};

export const getWeekCompletions = async (uid, habitId) => {
    const today = new Date();
    const results = {};
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const ref = doc(db, 'users', uid, 'habits', habitId, 'completions', dateStr);
        const snap = await getDoc(ref);
        results[dateStr] = snap.exists();
    }
    return results;
};
