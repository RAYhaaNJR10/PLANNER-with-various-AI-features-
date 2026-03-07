import { db } from '../firebase';
import {
    doc, getDoc, setDoc, updateDoc, increment
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
    if (!snap.exists()) return { xp: 0, level: 1, streak: 0, highestStreak: 0, streakFreezes: 0, lastStreakDate: null };
    return snap.data();
};

export const awardXP = async (uid, amount) => {
    const ref = doc(db, 'users', uid, 'gamification', 'stats');
    const snap = await getDoc(ref);
    if (!snap.exists()) {
        await setDoc(ref, { xp: amount, level: 1, streak: 0, highestStreak: 0, streakFreezes: 0, lastStreakDate: null });
    } else {
        await updateDoc(ref, { xp: increment(amount) });
    }
};

export const updateStreak = async (uid) => {
    const ref = doc(db, 'users', uid, 'gamification', 'stats');
    const today = new Date().toISOString().split('T')[0];
    const snap = await getDoc(ref);

    if (!snap.exists()) {
        await setDoc(ref, { xp: 0, level: 1, streak: 1, highestStreak: 1, streakFreezes: 0, lastStreakDate: today });
        return;
    }

    const data = snap.data();
    const last = data.lastStreakDate;
    const currentStreak = data.streak || 0;
    const highestStreak = data.highestStreak || currentStreak;
    const streakFreezes = data.streakFreezes || 0;

    if (last === today) return; // already studied today

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().split('T')[0];

    let newStreak = 1;
    let newFreezes = streakFreezes;

    if (last === yStr) {
        // Studied yesterday, increment streak naturally
        newStreak = currentStreak + 1;
    } else if (last && last < yStr) {
        // Missed at least one day
        const lastDateObj = new Date(last);
        const todayObj = new Date(today);
        const diffTime = Math.abs(todayObj - lastDateObj);
        const missedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) - 1;

        if (streakFreezes >= missedDays) {
            // Player has enough freezes to cover all missed days
            newStreak = currentStreak + 1;
            newFreezes -= missedDays;
        } else {
            // Not enough freezes, streak breaks
            newStreak = 1;
        }
    }

    const newHighest = Math.max(highestStreak, newStreak);

    await updateDoc(ref, {
        streak: newStreak,
        highestStreak: newHighest,
        streakFreezes: newFreezes,
        lastStreakDate: today
    });
};

export const addStreakFreeze = async (uid, cost) => {
    // Optional utility to buy a freeze using XP if you implemented a shop
    const ref = doc(db, 'users', uid, 'gamification', 'stats');
    const snap = await getDoc(ref);
    if (snap.exists() && snap.data().xp >= cost) {
        await updateDoc(ref, {
            xp: increment(-cost),
            streakFreezes: increment(1)
        });
        return true;
    }
    return false;
};

export const LEVEL_THRESHOLDS_EXPORT = LEVEL_THRESHOLDS;
