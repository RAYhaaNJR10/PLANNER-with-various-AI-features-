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
    return updateDoc(ref, updates);
};

export const deleteTask = async (userId, taskId) => {
    const ref = doc(db, 'users', userId, 'tasks', taskId);
    return deleteDoc(ref);
};

export const subscribeToTasksByDate = (userId, dateStr, callback) => {
    const ref = getTasksRef(userId);
    const q = query(ref, where('date', '==', dateStr));
    return onSnapshot(q, (snapshot) => {
        const tasks = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        tasks.sort((a, b) => {
            const aTime = a.createdAt?.seconds || 0;
            const bTime = b.createdAt?.seconds || 0;
            return aTime - bTime;
        });
        callback(tasks);
    }, (error) => {
        console.error('Error listening to tasks:', error);
    });
};
