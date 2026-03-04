import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    getDocs,
    onSnapshot,
    serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

const getSubjectsRef = (userId) =>
    collection(db, 'users', userId, 'subjects');

const getTopicsRef = (userId, subjectId) =>
    collection(db, 'users', userId, 'subjects', subjectId, 'topics');

export const addSubject = async (userId, subject) => {
    const ref = getSubjectsRef(userId);
    return addDoc(ref, { ...subject, createdAt: serverTimestamp() });
};

export const updateSubject = async (userId, subjectId, updates) => {
    const ref = doc(db, 'users', userId, 'subjects', subjectId);
    return updateDoc(ref, updates);
};

export const deleteSubject = async (userId, subjectId) => {
    // Delete all topics first
    const topicsRef = getTopicsRef(userId, subjectId);
    const topicsSnap = await getDocs(topicsRef);
    const deletePromises = topicsSnap.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletePromises);
    // Delete subject
    const ref = doc(db, 'users', userId, 'subjects', subjectId);
    return deleteDoc(ref);
};

export const subscribeToSubjects = (userId, callback) => {
    const ref = getSubjectsRef(userId);
    return onSnapshot(ref, (snapshot) => {
        const subjects = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        callback(subjects);
    });
};

// Topics
export const addTopic = async (userId, subjectId, topic) => {
    const ref = getTopicsRef(userId, subjectId);
    return addDoc(ref, {
        ...topic,
        completed: false,
        completedAt: null,
        createdAt: serverTimestamp(),
    });
};

export const updateTopic = async (userId, subjectId, topicId, updates) => {
    const ref = doc(db, 'users', userId, 'subjects', subjectId, 'topics', topicId);
    return updateDoc(ref, updates);
};

export const deleteTopic = async (userId, subjectId, topicId) => {
    const ref = doc(db, 'users', userId, 'subjects', subjectId, 'topics', topicId);
    return deleteDoc(ref);
};

export const toggleTopicCompletion = async (userId, subjectId, topicId, completed) => {
    const ref = doc(db, 'users', userId, 'subjects', subjectId, 'topics', topicId);
    return updateDoc(ref, {
        completed: !completed,
        completedAt: !completed ? serverTimestamp() : null,
    });
};

export const subscribeToTopics = (userId, subjectId, callback) => {
    const ref = getTopicsRef(userId, subjectId);
    return onSnapshot(ref, (snapshot) => {
        const topics = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        callback(topics);
    });
};

export const getSubjectStats = async (userId) => {
    const subjectsRef = getSubjectsRef(userId);
    const subjectsSnap = await getDocs(subjectsRef);
    const stats = [];

    for (const subDoc of subjectsSnap.docs) {
        const topicsRef = getTopicsRef(userId, subDoc.id);
        const topicsSnap = await getDocs(topicsRef);
        const total = topicsSnap.size;
        const completed = topicsSnap.docs.filter((t) => t.data().completed).length;
        stats.push({
            id: subDoc.id,
            name: subDoc.data().name,
            color: subDoc.data().color,
            total,
            completed,
            percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
        });
    }
    return stats;
};
