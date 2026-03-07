import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getGamification, addStreakFreeze } from '../services/gamificationService';
import { FiShoppingCart, FiAlertCircle } from 'react-icons/fi';
import './Shop.css';

const FREEZE_COST = 500;

const Shop = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({ xp: 0, streakFreezes: 0 });
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
                        <p>Missed a day? A Streak Freeze automatically deploys to protect your study streak, keeping it intact.</p>
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

                <div className="shop-item-card shop-item-card--locked">
                    <div className="shop-item-icon">🎨</div>
                    <div className="shop-item-info">
                        <h3>Premium Themes</h3>
                        <p>Unlock exclusive color palettes and animated backgrounds.</p>
                        <div className="shop-item-status">Coming Soon</div>
                    </div>
                    <button className="btn btn-ghost shop-buy-btn" disabled>
                        Locked
                    </button>
                </div>

                <div className="shop-item-card shop-item-card--locked">
                    <div className="shop-item-icon">👑</div>
                    <div className="shop-item-info">
                        <h3>Profile Titles</h3>
                        <p>Display a custom prestigious title next to your name on the leaderboard.</p>
                        <div className="shop-item-status">Coming Soon</div>
                    </div>
                    <button className="btn btn-ghost shop-buy-btn" disabled>
                        Locked
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Shop;
