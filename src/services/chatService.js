import { db } from '../firebase';
import {
    collection,
    addDoc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp
} from 'firebase/firestore';

const getMessagesRef = (groupId) => collection(db, 'groups', groupId, 'messages');

export const sendMessage = async (groupId, user, text) => {
    const ref = getMessagesRef(groupId);
    return addDoc(ref, {
        text: text.trim(),
        uid: user.uid,
        displayName: user.displayName || 'Anonymous',
        photoURL: user.photoURL || null,
        timestamp: serverTimestamp()
    });
};

export const subscribeToGroupMessages = (groupId, callback) => {
    const ref = getMessagesRef(groupId);
    const q = query(ref, orderBy('timestamp', 'asc'));
    
    return onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        callback(messages);
    }, (error) => {
        console.error('Error listening to group messages:', error);
    });
};
