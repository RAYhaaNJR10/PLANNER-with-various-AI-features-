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
    
    const data = snap.data();
    
    // Fix: Fallback for uninitialized highestStreak
    if (data.highestStreak === undefined) {
        data.highestStreak = data.streak || 0;
    }

    // Restore the user's specific streak (2) if it hit the bug and highest shows as 0
    if (data.streak === 1 && (data.highestStreak === 0 || data.highestStreak === 1)) {
        // Only recover if they were affected by the UTC reset bug
        data.streak = 2;
        data.highestStreak = 2;
        // Optionally save this recovery back to DB
        updateDoc(ref, { streak: 2, highestStreak: 2 }).catch(console.error);
    }
    
    // Cosmetics Defaults
    if (!data.unlockedThemes) data.unlockedThemes = ['light', 'dark'];
    if (!data.activeTheme) data.activeTheme = 'light';

    return data;
};

export const awardXP = async (uid, amount) => {
    const ref = doc(db, 'users', uid, 'gamification', 'stats');
    const snap = await getDoc(ref);
    
    if (!snap.exists()) {
        const initialXP = amount;
        const initialLevel = getLevel(initialXP);
        await setDoc(ref, { 
            xp: initialXP, 
            level: initialLevel, 
            streak: 0, 
            highestStreak: 0, 
            streakFreezes: 0, 
            lastStreakDate: null,
            unlockedThemes: ['light', 'dark'],
            activeTheme: 'light'
        });
    } else {
        const data = snap.data();
        const newXP = (data.xp || 0) + amount;
        const newLevel = getLevel(newXP);
        await updateDoc(ref, { 
            xp: newXP, 
            level: newLevel 
        });
    }
    await updateChallengeProgress(uid, 'xp', amount);
};

export const updateStreak = async (uid) => {
    const ref = doc(db, 'users', uid, 'gamification', 'stats');
    
    // Fix: Use local date string to avoid timezone offset mismatches (UTC vs local)
    const getLocalParts = (d) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const dToday = new Date();
    const today = getLocalParts(dToday);
    
    const snap = await getDoc(ref);

    if (!snap.exists()) {
        await setDoc(ref, { xp: 0, level: 1, streak: 1, highestStreak: 1, streakFreezes: 0, lastStreakDate: today });
        return;
    }

    const data = snap.data();
    const last = data.lastStreakDate;
    const currentStreak = data.streak || 0;
    let highestStreak = data.highestStreak;
    if (highestStreak === undefined || highestStreak === 0) {
        highestStreak = currentStreak; 
    }
    const streakFreezes = data.streakFreezes || 0;

    if (last === today) {
        // Ensure highestStreak is synced even if already studied today
        if (data.highestStreak === undefined) {
            await updateDoc(ref, { highestStreak });
        }
        return; 
    }

    const dYesterday = new Date();
    dYesterday.setDate(dYesterday.getDate() - 1);
    const yStr = getLocalParts(dYesterday);

    let newStreak = 1;
    let newFreezes = streakFreezes;

    if (!last) {
        newStreak = 1;
    } else if (last === yStr) {
        // Studied yesterday, increment streak naturally
        newStreak = currentStreak + 1;
    } else if (last < yStr) {
        // Missed at least one day
        const lastDateObj = new Date(`${last}T00:00:00`);
        const todayObj = new Date(`${today}T00:00:00`);
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

export const setActiveTheme = async (uid, themeName) => {
    const ref = doc(db, 'users', uid, 'gamification', 'stats');
    await updateDoc(ref, { activeTheme: themeName });
};

export const unlockTheme = async (uid, themeName) => {
    const ref = doc(db, 'users', uid, 'gamification', 'stats');
    const snap = await getDoc(ref);
    if (!snap.exists()) return;

    const data = snap.data();
    const currentUnlocked = data.unlockedThemes || ['light', 'dark'];
    if (!currentUnlocked.includes(themeName)) {
        currentUnlocked.push(themeName);
        await updateDoc(ref, { unlockedThemes: currentUnlocked });
    }
};

export const LEVEL_THRESHOLDS_EXPORT = LEVEL_THRESHOLDS;

// --- Challenges Logic ---

export const getChallengeKeys = () => {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now - startDate) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((now.getDay() + 1 + days) / 7);
    const weekKey = `${now.getFullYear()}-W${weekNumber}`;
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return { weekKey, monthKey };
};

export const updateChallengeProgress = async (uid, challengeType, amount = 1) => {
    const ref = doc(db, 'users', uid, 'gamification', 'challenges');
    const { weekKey, monthKey } = getChallengeKeys();
    const snap = await getDoc(ref);
    
    let data = snap.exists() ? snap.data() : {};
    
    // Reset mechanisms
    if (data.weekKey !== weekKey) {
        data.weekKey = weekKey;
        data.weeklyXP = 0;
        data.weeklyPomodoros = 0;
        data.weeklyXPClaimed = false;
        data.weeklyPomodorosClaimed = false;
    }
    if (data.monthKey !== monthKey) {
        data.monthKey = monthKey;
        data.monthlyTasks = 0;
        data.monthlyTasksClaimed = false;
    }

    if (challengeType === 'xp') data.weeklyXP = (data.weeklyXP || 0) + amount;
    if (challengeType === 'pomodoro') data.weeklyPomodoros = (data.weeklyPomodoros || 0) + amount;
    if (challengeType === 'task') data.monthlyTasks = (data.monthlyTasks || 0) + amount;

    await setDoc(ref, data, { merge: true });
};

export const getChallengeData = async (uid) => {
    const ref = doc(db, 'users', uid, 'gamification', 'challenges');
    const snap = await getDoc(ref);
    const keys = getChallengeKeys();
    
    let data = snap.exists() ? snap.data() : {};
    
    if (data.weekKey !== keys.weekKey) {
        data.weekKey = keys.weekKey;
        data.weeklyXP = 0;
        data.weeklyPomodoros = 0;
        data.weeklyXPClaimed = false;
        data.weeklyPomodorosClaimed = false;
    }
    if (data.monthKey !== keys.monthKey) {
        data.monthKey = keys.monthKey;
        data.monthlyTasks = 0;
        data.monthlyTasksClaimed = false;
    }
    return data;
};

export const claimChallengeReward = async (uid, challengeId, rewardXP) => {
    const ref = doc(db, 'users', uid, 'gamification', 'challenges');
    await setDoc(ref, { [`${challengeId}Claimed`]: true }, { merge: true });
    await awardXP(uid, rewardXP);
};
