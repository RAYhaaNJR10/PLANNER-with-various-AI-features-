import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { getGamification, addStreakFreeze, setActiveTheme } from '../services/gamificationService';
import { FiShoppingCart, FiAlertCircle } from 'react-icons/fi';
import './Shop.css';

const FREEZE_COST = 500;

const THEMES = [
    { id: 'light', name: 'Light Mode', emoji: '☀️', reqLevel: 1 },
    { id: 'dark', name: 'Dark Mode', emoji: '🌙', reqLevel: 1 },
    { id: 'midnight', name: 'Midnight', emoji: '🌌', reqLevel: 10 },
    { id: 'forest', name: 'Deep Forest', emoji: '🌲', reqLevel: 20 },
    { id: 'neon', name: 'Cyber Neon', emoji: '⚡', reqLevel: 30 }
];

const Shop = () => {
    const { user } = useAuth();
    const { theme, setTheme } = useTheme();
    const [stats, setStats] = useState({ xp: 0, level: 1, streakFreezes: 0, activeTheme: 'light' });
    const [buying, setBuying] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        if (!user) return;
        const load = async () => {
            const data = await getGamification(user.uid);
            setStats(data);
        };
        load();

        // Refresh every 5s while in shop
        const interval = setInterval(load, 5000);
        return () => clearInterval(interval);
    }, [user]);

    const handleBuyFreeze = async () => {
        if (!user || buying) return;
        if (stats.xp < FREEZE_COST) {
            setMessage({ type: 'error', text: "Not enough XP!" });
            return;
        }

        setBuying(true);
        setMessage(null);
        try {
            const success = await addStreakFreeze(user.uid, FREEZE_COST);
            if (success) {
                setMessage({ type: 'success', text: "Successfully purchased 1 Streak Freeze!" });
                // Optimistic update
                setStats(prev => ({
                    ...prev,
                    xp: prev.xp - FREEZE_COST,
                    streakFreezes: (prev.streakFreezes || 0) + 1
                }));
            } else {
                setMessage({ type: 'error', text: "Transaction failed. Please try again." });
            }
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setBuying(false);
        }
    };

    const handleEquipTheme = async (themeId) => {
        if (!user) return;
        try {
            await setActiveTheme(user.uid, themeId);
            setTheme(themeId); // Update local context state
            setStats(prev => ({ ...prev, activeTheme: themeId }));
            setMessage({ type: 'success', text: `Equipped ${themeId} theme!` });
        } catch (e) {
            setMessage({ type: 'error', text: 'Failed to equip theme.' });
        }
    };

    return (
        <div className="shop-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">🛒 XP Shop</h1>
                    <p className="page-subtitle">Spend your hard-earned XP on useful items</p>
                </div>
                <div className="shop-balance">
                    <span className="shop-balance-label">Current Balance</span>
                    <span className="shop-balance-amount">{stats.xp} XP</span>
                </div>
            </div>

            {message && (
                <div className={`shop-message ${message.type === 'error' ? 'shop-message--error' : 'shop-message--success'}`}>
                    {message.type === 'error' && <FiAlertCircle style={{ marginRight: '8px' }} />}
                    {message.text}
                </div>
            )}

            <div className="shop-grid">
                <div className="shop-item-card">
                    <div className="shop-item-icon">❄️</div>
                    <div className="shop-item-info">
                        <h3>Streak Freeze</h3>
                        <p>Missed a day? A Streak Freeze automatically deploys to protect your study streak.</p>
                        <div className="shop-item-status">
                            You currently own: <strong>{stats.streakFreezes || 0}</strong>
                        </div>
                    </div>
                    <button
                        className="btn btn-primary shop-buy-btn"
                        onClick={handleBuyFreeze}
                        disabled={buying || stats.xp < FREEZE_COST}
                    >
                        {buying ? 'Purchasing...' : `Buy for ${FREEZE_COST} XP`}
                    </button>
                </div>
            </div>

            <h2 className="shop-section-title" style={{ marginTop: '40px', marginBottom: '20px', fontSize: '1.4rem' }}>🎨 Unlockable Themes</h2>
            <div className="shop-grid">
                {THEMES.map(t => {
                    const isUnlocked = stats.level >= t.reqLevel;
                    const isEquipped = theme === t.id;

                    return (
                        <div key={t.id} className={`shop-item-card ${!isUnlocked ? 'shop-item-card--locked' : ''} ${isEquipped ? 'shop-item-card--equipped' : ''}`}>
                            <div className="shop-item-icon">{t.emoji}</div>
                            <div className="shop-item-info">
                                <h3>{t.name}</h3>
                                <p>Unlocks at Level {t.reqLevel}</p>
                                <div className="shop-item-status">
                                    {isEquipped ? <strong style={{color: 'var(--accent)'}}>Equipped</strong> : (isUnlocked ? 'Unlocked' : 'Locked')}
                                </div>
                            </div>
                            <button 
                                className={`btn shop-buy-btn ${isEquipped ? 'btn-ghost' : 'btn-primary'}`} 
                                disabled={!isUnlocked || isEquipped}
                                onClick={() => handleEquipTheme(t.id)}
                            >
                                {isEquipped ? 'Active' : (isUnlocked ? 'Equip' : `Requires Lvl ${t.reqLevel}`)}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Shop;
