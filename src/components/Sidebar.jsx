import { NavLink } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { signOut } from '../services/auth';
import XPBar from './XPBar';
import {
    FiSun, FiMoon, FiCalendar, FiCheckSquare,
    FiTag, FiBook, FiBarChart2, FiLogOut, FiRepeat, FiUsers, FiShoppingCart
} from 'react-icons/fi';
import './Sidebar.css';

const Sidebar = () => {
    const { isDark, toggleTheme, accentColor, setAccentColor } = useTheme();
    const { user } = useAuth();

    const links = [
        { to: '/', icon: <FiCheckSquare />, label: "Today's Plan" },
        { to: '/calendar', icon: <FiCalendar />, label: 'Calendar' },
        { to: '/subjects', icon: <FiBook />, label: 'Subjects' },
        { to: '/groups', icon: <FiUsers />, label: 'Study Groups' },
        { to: '/habits', icon: <FiRepeat />, label: 'Habits' },
        { to: '/shop', icon: <FiShoppingCart />, label: 'XP Shop' },
        { to: '/stats', icon: <FiBarChart2 />, label: 'Stats' },
    ];

    const handleSignOut = async () => {
        if (confirm('Sign out?')) await signOut();
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-brand">
                <span className="sidebar-logo">📋</span>
                <h1 className="sidebar-title">Planner</h1>
            </div>

            <nav className="sidebar-nav">
                {links.map((link) => (
                    <NavLink
                        key={link.to}
                        to={link.to}
                        end={link.to === '/'}
                        className={({ isActive }) =>
                            `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`
                        }
                    >
                        <span className="sidebar-link-icon">{link.icon}</span>
                        <span className="sidebar-link-label">{link.label}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="sidebar-footer">
                <XPBar />

                <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
                    {isDark ? <FiSun size={18} /> : <FiMoon size={18} />}
                    <span>{isDark ? 'Light' : 'Dark'}</span>
                </button>

                <div className="accent-picker" style={{ display: 'flex', gap: '8px', padding: '4px 8px', justifyContent: 'center' }}>
                    {['#00B894', '#0984E3', '#6C5CE7', '#FD79A8', '#E17055'].map(color => (
                        <button
                            key={color}
                            onClick={() => setAccentColor(color)}
                            style={{
                                width: '20px', height: '20px', borderRadius: '50%', border: 'none', cursor: 'pointer',
                                background: color, transform: accentColor === color ? 'scale(1.2)' : 'none',
                                transition: 'transform 0.2s',
                                boxShadow: accentColor === color ? `0 0 0 2px ${isDark ? '#333' : '#fff'}, 0 0 0 4px ${color}` : 'none'
                            }}
                            title="Change Accent Color"
                        />
                    ))}
                </div>

                {user && (
                    <div className="user-profile">
                        <img
                            className="user-avatar"
                            src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'U')}&background=6C5CE7&color=fff&size=32`}
                            alt=""
                            referrerPolicy="no-referrer"
                        />
                        <div className="user-info">
                            <span className="user-name">{user.displayName || 'User'}</span>
                            <span className="user-email">{user.email}</span>
                        </div>
                        <button className="signout-btn" onClick={handleSignOut} title="Sign out">
                            <FiLogOut size={16} />
                        </button>
                    </div>
                )}
            </div>
        </aside>
    );
};

export default Sidebar;
