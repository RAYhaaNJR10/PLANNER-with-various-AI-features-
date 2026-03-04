import { db } from '../firebase';
import {
    doc, getDoc, setDoc, increment, updateDoc, serverTimestamp
} from 'firebase/firestore';

const LEVEL_THRESHOLDS = [0, 100, 250, 500, 1000, 2000, 4000, 8000, 16000, 32000];

export const getLevel = (xp) => {
    let level = 1;
    for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
        if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1;
    }
    return level;
};

export const getXPForNextLevel = (level) => LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
export const getXPForCurrentLevel = (level) => LEVEL_THRESHOLDS[level - 1] || 0;

export const getGamification = async (uid) => {
    const ref = doc(db, 'users', uid, 'gamification', 'stats');
    const snap = await getDoc(ref);
    if (!snap.exists()) return { xp: 0, level: 1, streak: 0, lastStreakDate: null };
    return snap.data();
};

export const awardXP = async (uid, amount) => {
    const ref = doc(db, 'users', uid, 'gamification', 'stats');
    const snap = await getDoc(ref);
    if (!snap.exists()) {
        await setDoc(ref, { xp: amount, level: 1, streak: 0, lastStreakDate: null });
    } else {
        await updateDoc(ref, { xp: increment(amount) });
    }
};

export const updateStreak = async (uid) => {
    const ref = doc(db, 'users', uid, 'gamification', 'stats');
    const today = new Date().toISOString().split('T')[0];
    const snap = await getDoc(ref);

    if (!snap.exists()) {
        await setDoc(ref, { xp: 0, level: 1, streak: 1, lastStreakDate: today });
        return;
    }

    const data = snap.data();
    const last = data.lastStreakDate;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().split('T')[0];

    if (last === today) return; // already updated today
    const newStreak = last === yStr ? (data.streak || 0) + 1 : 1;
    await updateDoc(ref, { streak: newStreak, lastStreakDate: today });
};

export const LEVEL_THRESHOLDS_EXPORT = LEVEL_THRESHOLDS;
