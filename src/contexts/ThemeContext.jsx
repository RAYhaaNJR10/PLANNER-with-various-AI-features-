/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(() => {
        const saved = localStorage.getItem('planner-theme');
        return saved || 'light';
    });

    const [accentColor, setAccentColor] = useState(() => {
        return localStorage.getItem('planner-accent') || '#00B894';
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('planner-theme', theme);
    }, [theme]);

    useEffect(() => {
        document.documentElement.style.setProperty('--accent', accentColor);
        // Make a slightly transparent version for backgrounds
        document.documentElement.style.setProperty('--accent-bg', accentColor + '15');
        document.documentElement.style.setProperty('--accent-shadow', accentColor + '40');
        localStorage.setItem('planner-accent', accentColor);
    }, [accentColor]);

    const toggleTheme = () => setTheme((prev) => prev === 'light' ? 'dark' : 'light');

    // Backward compatibility for components checking isDark
    const isDark = theme !== 'light';

    return (
        <ThemeContext.Provider value={{ theme, setTheme, isDark, toggleTheme, accentColor, setAccentColor }}>
            {children}
        </ThemeContext.Provider>
    );
};
