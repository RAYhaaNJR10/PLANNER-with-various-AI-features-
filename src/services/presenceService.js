import { db } from '../firebase';
import {
    doc,
    setDoc,
    onSnapshot,
    serverTimestamp,
    collection,
    query,
    where
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
