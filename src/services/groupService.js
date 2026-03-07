import { db } from '../firebase';
import {
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    updateDoc,
    arrayUnion,
    query,
    where,
    serverTimestamp
} from 'firebase/firestore';
import { getTotalMinutesThisWeek } from './pomodoroService';

// Helper to generate a 6-character short code
const generateJoinCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export const createGroup = async (user, groupName) => {
    const code = generateJoinCode();

    // Group Document
    const groupData = {
        name: groupName,
        joinCode: code,
        adminId: user.uid,
        createdAt: serverTimestamp(),
        members: [{
            uid: user.uid,
            displayName: user.displayName || 'Anonymous',
            photoURL: user.photoURL || null
        }]
    };

    const docRef = await addDoc(collection(db, 'groups'), groupData);
    return { id: docRef.id, ...groupData };
};

export const joinGroup = async (user, joinCode) => {
    // Find the group with this code
    const q = query(collection(db, 'groups'), where('joinCode', '==', joinCode));
    const snap = await getDocs(q);

    if (snap.empty) {
        throw new Error('Invalid join code. Group not found.');
    }

    const groupDoc = snap.docs[0];
    const groupData = groupDoc.data();

    // Check if already a member
    const isMember = groupData.members.find(m => m.uid === user.uid);
    if (isMember) {
        return { id: groupDoc.id, ...groupData };
    }

    // Add user to members
    const newMember = {
        uid: user.uid,
        displayName: user.displayName || 'Anonymous',
        photoURL: user.photoURL || null
    };

    await updateDoc(groupDoc.ref, {
        members: arrayUnion(newMember)
    });

    return {
        id: groupDoc.id,
        ...groupData,
        members: [...groupData.members, newMember]
    };
};

export const getUserGroups = async (userId) => {
    // We fetch all groups to simplify, then filter client side (or we can't easily query array-of-objects in Firestore without exact match)
    // Actually, Firestore doesn't support querying `array-contains` on an object property easily.
    // For a small scale app, we'll just fetch all groups and filter. 
    // In production, we'd store an array of member UIDs just for querying.
    const snap = await getDocs(collection(db, 'groups'));
    const groups = [];
    snap.forEach(doc => {
        const data = doc.data();
        if (data.members?.some(m => m.uid === userId)) {
            groups.push({ id: doc.id, ...data });
        }
    });
    return groups;
};

export const getGroupLeaderboard = async (members) => {
    // For each member, fetch their XP from their gamification doc
    const leaderboard = [];

    for (const member of members) {
        try {
            const xpRef = doc(db, 'users', member.uid, 'gamification', 'stats');
            const xpSnap = await getDoc(xpRef);

            let xp = 0;
            let level = 1;

            if (xpSnap.exists()) {
                const data = xpSnap.data();
                xp = data.xp || 0;
                level = data.level || 1;
            }

            // Phase 4: Fetch group-specific metrics (weekly focus minutes)
            let focusMinutes = 0;
            try {
                focusMinutes = await getTotalMinutesThisWeek(member.uid);
            } catch (pomErr) {
                console.error("Failed to fetch focus minutes for", member.uid, pomErr);
            }

            leaderboard.push({
                ...member,
                xp,
                level,
                focusMinutes
            });
        } catch (e) {
            console.error("Failed to fetch XP for", member.uid);
            leaderboard.push({ ...member, xp: 0, level: 1, focusMinutes: 0 });
        }
    }

    // Sort descending by XP
    return leaderboard.sort((a, b) => b.xp - a.xp);
};
