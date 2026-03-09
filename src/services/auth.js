import { signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut, onAuthStateChanged, reauthenticateWithPopup } from 'firebase/auth';
import { auth } from '../firebase';

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/calendar.events');

export const signInWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const token = credential.accessToken;

        // Return both user and the access token
        return { user: result.user, token };
    } catch (error) {
        console.error('Google sign-in failed:', error);
        throw error;
    }
};

export const getCalendarAccessToken = async () => {
    try {
        // Calling signInWithPopup again while logged in re-authenticates the user
        // and returns a fresh credential, including the specific scopes we requested.
        googleProvider.setCustomParameters({ prompt: 'consent' });
        let result;
        if (auth.currentUser) {
            result = await reauthenticateWithPopup(auth.currentUser, googleProvider);
        } else {
            result = await signInWithPopup(auth, googleProvider);
        }
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (!credential || !credential.accessToken) {
            throw new Error('Google did not return an access token. Please check your permissions.');
        }
        return credential.accessToken;
    } catch (error) {
        console.error('Failed to get new calendar token:', error);
        throw error;
    }
};

export const signOut = async () => {
    try {
        await firebaseSignOut(auth);
    } catch (error) {
        console.error('Sign-out failed:', error);
        throw error;
    }
};

export const onAuthChange = (callback) => {
    return onAuthStateChanged(auth, callback);
};

export const getCurrentUser = () => auth.currentUser;
