import { db } from '../firebase';
import {
    doc,
    getDoc,
    setDoc
} from 'firebase/firestore';

const generateId = () => Math.random().toString(36).slice(2, 10);

export const shareSubject = async (uid, subjectId, subjectData) => {
    const shareId = generateId();
    const shareRef = doc(db, 'sharedSubjects', shareId);
    await setDoc(shareRef, {
        ...subjectData,
        ownerId: uid,
        sharedAt: new Date().toISOString(),
    });
    return shareId;
};

export const getSharedSubject = async (shareId) => {
    const ref = doc(db, 'sharedSubjects', shareId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data();
};
