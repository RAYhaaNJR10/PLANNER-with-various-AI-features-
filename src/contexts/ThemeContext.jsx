/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
    const [isDark, setIsDark] = useState(() => {
        const saved = localStorage.getItem('planner-theme');
        return saved ? saved === 'dark' : false;
    });

    const [accentColor, setAccentColor] = useState(() => {
        return localStorage.getItem('planner-accent') || '#00B894';
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        localStorage.setItem('planner-theme', isDark ? 'dark' : 'light');
    }, [isDark]);

    useEffect(() => {
        document.documentElement.style.setProperty('--accent', accentColor);
        // Make a slightly transparent version for backgrounds
        document.documentElement.style.setProperty('--accent-bg', accentColor + '15');
        document.documentElement.style.setProperty('--accent-shadow', accentColor + '40');
        localStorage.setItem('planner-accent', accentColor);
    }, [accentColor]);

    const toggleTheme = () => setIsDark((prev) => !prev);

    return (
        <ThemeContext.Provider value={{ isDark, toggleTheme, accentColor, setAccentColor }}>
            {children}
        </ThemeContext.Provider>
    );
};
