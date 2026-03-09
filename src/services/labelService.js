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

const getLabelsRef = (userId) =>
    collection(db, 'users', userId, 'labels');

const DEFAULT_LABELS = [
    { name: 'Syllabus', color: '#6C5CE7', icon: '📚' },
    { name: 'Outside Syllabus', color: '#00B894', icon: '🌍' },
    { name: 'Football', color: '#E17055', icon: '⚽' },
    { name: 'Editing', color: '#FDCB6E', icon: '🎬' }, // Changed to Clapboard for better distinction
    { name: 'Doomscroll', color: '#D63031', icon: '📱' },
    { name: 'Python', color: '#3776AB', icon: '🐍' },
    { name: 'JavaScript', color: '#F7DF1E', icon: '🟨' },
    { name: 'Java', color: '#ED8B00', icon: '☕' },
    { name: 'C++', color: '#00599C', icon: '⚙️' },
    { name: 'HTML/CSS', color: '#E44D26', icon: '🌐' },
    { name: 'React', color: '#00D8FF', icon: '⚛️' },
    { name: 'VIBE CODING', color: '#A29BFE', icon: '✨' },
];

export const seedDefaultLabels = async (userId) => {
    const ref = getLabelsRef(userId);
    const snap = await getDocs(ref);
    
    const existingLabels = snap.docs.map(doc => doc.data().name);
    
    // Only add defaults that don't already exist by name
    const missingDefaults = DEFAULT_LABELS.filter(
        defaultLabel => !existingLabels.includes(defaultLabel.name)
    );

    if (missingDefaults.length > 0) {
        const promises = missingDefaults.map((label) =>
            addDoc(ref, { ...label, createdAt: serverTimestamp() })
        );
        await Promise.all(promises);
    }
};

export const addLabel = async (userId, label) => {
    const ref = getLabelsRef(userId);
    return addDoc(ref, { ...label, createdAt: serverTimestamp() });
};

export const updateLabel = async (userId, labelId, updates) => {
    const ref = doc(db, 'users', userId, 'labels', labelId);
    return updateDoc(ref, updates);
};

export const deleteLabel = async (userId, labelId) => {
    const ref = doc(db, 'users', userId, 'labels', labelId);
    return deleteDoc(ref);
};

export const subscribeToLabels = (userId, callback) => {
    const ref = getLabelsRef(userId);
    return onSnapshot(ref, (snapshot) => {
        const labels = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        callback(labels);
    });
};
