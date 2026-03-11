/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthChange } from '../services/auth';
import { seedDefaultLabels, cleanupDuplicateLabels } from '../services/labelService';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [calendarToken, setCalendarToken] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsub = onAuthChange(async (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser);
                await seedDefaultLabels(firebaseUser.uid);
                await cleanupDuplicateLabels(firebaseUser.uid);
            } else {
                setUser(null);
                setCalendarToken(null);
            }
            setLoading(false);
        });
        return () => unsub();
    }, []);

    // Helper to manually set the token after a fresh login
    const saveCalendarToken = (token) => {
        setCalendarToken(token);
    };

    return (
        <AuthContext.Provider value={{ user, calendarToken, saveCalendarToken, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
