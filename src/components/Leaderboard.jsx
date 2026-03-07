import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createGroup, joinGroup, getUserGroups, getGroupLeaderboard } from '../services/groupService';
import { FiUsers, FiPlus, FiUserPlus, FiAward, FiCopy } from 'react-icons/fi';
import './Leaderboard.css';

const Leaderboard = () => {
    const { user } = useAuth();
    const [groups, setGroups] = useState([]);
    const [activeGroup, setActiveGroup] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Modals
    const [showCreate, setShowCreate] = useState(false);
    const [showJoin, setShowJoin] = useState(false);
    const [groupName, setGroupName] = useState('');
    const [joinCode, setJoinCode] = useState('');

    const fetchGroups = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const userGroups = await getUserGroups(user.uid);
            setGroups(userGroups);
            if (userGroups.length > 0 && !activeGroup) {
                // Default to first group
                setActiveGroup(userGroups[0]);
            } else if (activeGroup) {
                // Update active group data if it changed
                const updatedActive = userGroups.find(g => g.id === activeGroup.id);
                if (updatedActive) setActiveGroup(updatedActive);
            }
        } catch (e) {
            console.error('Failed to fetch groups', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGroups();
    }, [user]);

    // Fetch Leaderboard when activeGroup changes
    useEffect(() => {
        if (!activeGroup) return;

        const fetchRankings = async () => {
            setRefreshing(true);
            try {
                const rankedMembers = await getGroupLeaderboard(activeGroup.members);
                setLeaderboard(rankedMembers);
            } catch (e) {
                console.error("Failed to load rankings", e);
            } finally {
                setRefreshing(false);
            }
        };
        fetchRankings();
    }, [activeGroup]);

    const handleCreateGroup = async () => {
        if (!groupName.trim()) return;
        try {
            const newGroup = await createGroup(user, groupName.trim());
            setGroups([...groups, newGroup]);
            setActiveGroup(newGroup);
            setGroupName('');
            setShowCreate(false);
        } catch (e) {
            alert('Error creating group: ' + e.message);
        }
    };

    const handleJoinGroup = async () => {
        if (!joinCode.trim()) return;
        try {
            const joinedGroup = await joinGroup(user, joinCode.trim().toUpperCase());
            // Fetch groups again to ensure fresh state
            await fetchGroups();
            setActiveGroup(joinedGroup);
            setJoinCode('');
            setShowJoin(false);
        } catch (e) {
            alert(e.message);
        }
    };

    const copyJoinCode = () => {
        if (!activeGroup) return;
        navigator.clipboard.writeText(activeGroup.joinCode);
        alert(`Join code ${activeGroup.joinCode} copied to clipboard! Share it with your friends.`);
    };

    if (loading) {
        return (
            <div className="stats-loading">
                <div className="spinner" />
                <p>Loading your study groups...</p>
            </div>
        );
    }

    return (
        <div className="leaderboard-page">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="page-title">🏆 Study Groups</h1>
                    <p className="page-subtitle">Learn together and compete</p>
                </div>
                <div className="page-header-actions">
                    <button className="btn btn-ghost" onClick={() => { setShowJoin(true); setShowCreate(false); }}>
                        <FiUserPlus /> Join Group
                    </button>
                    <button className="btn btn-primary" onClick={() => { setShowCreate(true); setShowJoin(false); }}>
                        <FiPlus /> Create Group
                    </button>
                </div>
            </div>

            {/* Create Group Modal */}
            {showCreate && (
                <div className="label-form-card">
                    <div className="label-form-header">
                        <h3>Create a Study Group</h3>
                        <button className="modal-close" onClick={() => setShowCreate(false)}>×</button>
                    </div>
                    <div className="label-form-content">
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Group Name (e.g. AP Calc Warriors)"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            autoFocus
                        />
                        <div className="form-actions" style={{ marginTop: '16px' }}>
                            <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleCreateGroup}>Create</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Join Group Modal */}
            {showJoin && (
                <div className="label-form-card">
                    <div className="label-form-header">
                        <h3>Join a Study Group</h3>
                        <button className="modal-close" onClick={() => setShowJoin(false)}>×</button>
                    </div>
                    <div className="label-form-content">
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Enter 6-character Join Code"
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value)}
                            autoFocus
                        />
                        <div className="form-actions" style={{ marginTop: '16px' }}>
                            <button className="btn btn-ghost" onClick={() => setShowJoin(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleJoinGroup}>Join</button>
                        </div>
                    </div>
                </div>
            )}

            {groups.length === 0 && !showCreate && !showJoin ? (
                <div className="empty-state">
                    <span className="empty-emoji">👥</span>
                    <h3>No study groups yet</h3>
                    <p>Create a group with your friends and climb the leaderboard!</p>
                </div>
            ) : null}

            {groups.length > 0 && (
                <div className="leaderboard-layout">
                    {/* Sidebar for groups */}
                    <div className="group-sidebar">
                        <h3 className="group-sidebar-title">Your Groups</h3>
                        <div className="group-list">
                            {groups.map(g => (
                                <button
                                    key={g.id}
                                    className={`group-item ${activeGroup?.id === g.id ? 'active' : ''}`}
                                    onClick={() => setActiveGroup(g)}
                                >
                                    <FiUsers className="group-icon" />
                                    <span className="group-name">{g.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Active Group Leaderboard */}
                    {activeGroup && (
                        <div className="leaderboard-content">
                            <div className="leaderboard-header">
                                <div>
                                    <h2 className="leaderboard-group-name">{activeGroup.name}</h2>
                                    <p className="leaderboard-group-meta">
                                        Join Code: <strong>{activeGroup.joinCode}</strong>
                                    </p>
                                </div>
                                <button className="btn btn-ghost btn-sm" onClick={copyJoinCode}>
                                    <FiCopy /> Copy Code
                                </button>
                            </div>

                            {refreshing ? (
                                <div style={{ textAlign: 'center', padding: '40px' }}><div className="spinner" /></div>
                            ) : (
                                <div className="rankings-list">
                                    {leaderboard.map((member, idx) => {
                                        const isMe = member.uid === user.uid;

                                        // Medals
                                        let rankBadge = <div className="rank-badge rank-normal">{idx + 1}</div>;
                                        if (idx === 0) rankBadge = <div className="rank-badge rank-gold">🥇</div>;
                                        if (idx === 1) rankBadge = <div className="rank-badge rank-silver">🥈</div>;
                                        if (idx === 2) rankBadge = <div className="rank-badge rank-bronze">🥉</div>;

                                        return (
                                            <div key={member.uid} className={`ranking-card ${isMe ? 'ranking-card--me' : ''}`}>
                                                {rankBadge}
                                                <img
                                                    src={member.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.displayName)}&background=random`}
                                                    alt={member.displayName}
                                                    className="rank-avatar"
                                                    referrerPolicy="no-referrer"
                                                />
                                                <div className="rank-info">
                                                    <span className="rank-name">{member.displayName} {isMe && '(You)'}</span>
                                                    <span className="rank-level">Level {member.level}</span>
                                                </div>
                                                <div className="rank-score">
                                                    <FiAward className="rank-icon" />
                                                    <span className="rank-xp">{member.xp} XP</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Leaderboard;
