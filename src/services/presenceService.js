import { db } from '../firebase';
import {
    doc,
    setDoc,
    onSnapshot,
    serverTimestamp,
    collection,
    query,
    where,
    addDoc,
    orderBy,
    limit,
    deleteDoc
} from 'firebase/firestore';

// Call this from PomodoroTimer whenever it starts, stops, changes subject, etc.
export const updatePresence = async (userId, isStudying, subjectName = null, taskId = null) => {
    if (!userId) return;
    const ref = doc(db, 'presence', userId);

    // We use setDoc with merge: true so if the doc doesn't exist, it is created.
    return setDoc(ref, {
        isStudying,
        subjectName,
        taskId,
        lastUpdated: serverTimestamp()
    }, { merge: true });
};

// Call this from Leaderboard.js to watch a specific list of user IDs
export const subscribeToGroupPresence = (memberIds, callback) => {
    if (!memberIds || memberIds.length === 0) {
        callback({});
        return () => { };
    }

    // Since 'in' queries are limited to 10 items, we handle it natively or chunk it if needed
    // For small study groups (typically < 10), this works beautifully.
    // If groups expand > 10, batch multiple listeners.
    const refs = collection(db, 'presence');
    const chunks = [];
    for (let i = 0; i < memberIds.length; i += 10) {
        chunks.push(memberIds.slice(i, i + 10));
    }

    const unsubs = [];
    let presenceMap = {};

    chunks.forEach(chunk => {
        const q = query(refs, where('__name__', 'in', chunk));
        const unsub = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                const data = change.doc.data();
                const userId = change.doc.id;

                // Only consider them "present" if they updated in the last 2 hours
                // (in case they closed tab without broadcasting isStudying = false)
                const now = new Date();
                const lastUpdated = data.lastUpdated?.toDate() || new Date(0);
                const diffHours = (now - lastUpdated) / (1000 * 60 * 60);

                if (diffHours > 2) {
                    presenceMap[userId] = { isStudying: false };
                } else {
                    presenceMap[userId] = data;
                }
            });
            callback({ ...presenceMap });
        });
        unsubs.push(unsub);
    });

    return () => {
        unsubs.forEach(fn => fn());
    };
};

// Social Nudging
export const sendNudge = async (recipientId, senderName) => {
    if (!recipientId || !senderName) return;
    const nudgesRef = collection(db, 'users', recipientId, 'nudges');
    
    // Create a temporary document in their nudges subcollection
    return addDoc(nudgesRef, {
        senderName,
        timestamp: serverTimestamp()
    });
};

export const subscribeToNudges = (userId, onNudgeReceived) => {
    if (!userId) {
        return () => {};
    }

    const nudgesRef = collection(db, 'users', userId, 'nudges');
    // Only listen for nudges created recently to avoid spam on login
    const recentQuery = query(nudgesRef, orderBy('timestamp', 'desc'), limit(1));

    let isInitialLoad = true;

    return onSnapshot(recentQuery, (snapshot) => {
        if (isInitialLoad) {
            isInitialLoad = false;
            return; // Ignore existing ones on mount
        }

        snapshot.docChanges().forEach(async (change) => {
            if (change.type === 'added') {
                const data = change.doc.data();
                if (data.senderName) {
                    onNudgeReceived(data.senderName);
                }
                // Cleanup: Delete the nudge doc immediately after receiving it
                // so the subcollection doesn't get flooded over time
                await deleteDoc(change.doc.ref);
            }
        });
    });
};
