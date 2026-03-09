import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createGroup, joinGroup, getUserGroups, getGroupLeaderboard } from '../services/groupService';
import { subscribeToGroupPresence, sendNudge } from '../services/presenceService';
import { subscribeToGroupMessages, sendMessage } from '../services/chatService';
import { FiUsers, FiPlus, FiUserPlus, FiAward, FiCopy, FiClock, FiBell, FiMessageSquare, FiSend, FiSmile } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import './Leaderboard.css';

const Leaderboard = () => {
    const { user } = useAuth();
    const [groups, setGroups] = useState([]);
    const [activeGroup, setActiveGroup] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);
    const [presence, setPresence] = useState({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Chat
    const [activeTab, setActiveTab] = useState('rankings'); // 'rankings' or 'chat'
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [unreadCount, setUnreadCount] = useState(0);
    const prevMessagesLength = useRef(0);

    const EMOJI_CATEGORIES = [
        { name: 'Smileys', emojis: ['😊', '😂', '🤣', '😍', '😎', '😜', '😇', '🤔', '🥳', '🤩'] },
        { name: 'Gestures', emojis: ['👍', '🙌', '👏', '🔥', '❤️', '💯', '🤝', '✌️', '💪', '✨'] },
        { name: 'Study', emojis: ['📚', '💡', '🧠', '🎯', '✍️', '📖', '📝', '🎓', '🧪', '🎨'] },
        { name: 'Celebrate', emojis: ['🎉', '🎈', '🎊', '🎀', '🌟', '🏆', '🌈', '🧨', '🥂', '🍰'] },
        { name: 'Objects', emojis: ['💻', '📱', '⌚️', '📷', '🕹', '⌛️', '🎁', '💎', '🔑', '🏷️'] },
        { name: 'Symbols', emojis: ['✅', '❌', '⚠️', '🆗', '🆙', '🆒', '🆕', '🆓', '➕', '➖'] }
    ];

    const [showChatEmojiPicker, setShowChatEmojiPicker] = useState(false);

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

    // Subscribe to Real-Time Presence
    useEffect(() => {
        if (!activeGroup || !activeGroup.members) {
            setPresence({});
            return;
        }

        const memberIds = activeGroup.members.map(m => m.uid);
        const unsubscribe = subscribeToGroupPresence(memberIds, (data) => {
            setPresence(data);
        });

        return () => unsubscribe();
    }, [activeGroup]);

    // Subscribe to Group Messages
    useEffect(() => {
        if (!activeGroup) {
            setMessages([]);
            setUnreadCount(0);
            prevMessagesLength.current = 0;
            return;
        }
        const unsub = subscribeToGroupMessages(activeGroup.id, (fetchedMessages) => {
            setMessages(fetchedMessages);
            if (activeTab !== 'chat' && fetchedMessages.length > prevMessagesLength.current && prevMessagesLength.current !== 0) {
                // Ignore the initial load (when prev === 0), only notify on new incoming
                setUnreadCount(prev => prev + (fetchedMessages.length - prevMessagesLength.current));
            }
            prevMessagesLength.current = fetchedMessages.length;
        });
        return () => unsub();
    }, [activeGroup, activeTab]);

    useEffect(() => {
        if (activeTab === 'chat') {
            setUnreadCount(0);
        }
    }, [activeTab]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeGroup) return;
        try {
            await sendMessage(activeGroup.id, user, newMessage);
            setNewMessage('');
        } catch (err) {
            console.error('Failed to send message', err);
        }
    };

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

    const handleSendNudge = async (recipientId) => {
        if (!user) return;
        try {
            await sendNudge(recipientId, user.displayName);
            alert('Nudge sent successfully! 🔔');
        } catch (e) {
            console.error('Failed to send nudge', e);
            alert('Failed to send nudge.');
        }
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
                                        Join Code: <strong>{activeGroup.joinCode}</strong> • {leaderboard.length} Member{leaderboard.length === 1 ? '' : 's'} • {leaderboard.reduce((acc, m) => acc + (m.focusMinutes || 0), 0)} Total Focus Mins
                                    </p>
                                </div>
                                <button className="btn btn-ghost btn-sm" onClick={copyJoinCode}>
                                    <FiCopy /> Copy Code
                                </button>
                            </div>

                            <div className="leaderboard-tabs" style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '8px', overflowX: 'auto' }}>
                                <button 
                                    className="btn btn-ghost"
                                    style={{ color: activeTab === 'rankings' ? 'var(--accent)' : 'var(--text-secondary)', borderBottom: activeTab === 'rankings' ? '2px solid var(--accent)' : 'none', borderRadius: 0, paddingBottom: '12px' }}
                                    onClick={() => setActiveTab('rankings')}
                                >
                                    <FiAward /> Rankings
                                </button>
                                <button 
                                    className="btn btn-ghost"
                                    style={{ position: 'relative', color: activeTab === 'chat' ? 'var(--accent)' : 'var(--text-secondary)', borderBottom: activeTab === 'chat' ? '2px solid var(--accent)' : 'none', borderRadius: 0, paddingBottom: '12px' }}
                                    onClick={() => setActiveTab('chat')}
                                >
                                    <FiMessageSquare /> Chat
                                    {unreadCount > 0 && (
                                        <span style={{ position: 'absolute', top: '-4px', right: '-12px', background: '#E74C3C', color: 'white', fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '10px' }}>
                                            {unreadCount}
                                        </span>
                                    )}
                                </button>
                            </div>

                            {activeTab === 'chat' ? (
                                <div className="group-chat-container">
                                    <div className="chat-messages" style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '400px', overflowY: 'auto', padding: '16px', border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--bg)', marginBottom: '16px' }}>
                                        {messages.length === 0 ? (
                                            <div className="empty-state" style={{ minHeight: '200px', margin: 'auto' }}>
                                                <span className="empty-emoji">💬</span>
                                                <p>No messages yet. Say hi!</p>
                                            </div>
                                        ) : (
                                            messages.map(msg => {
                                                const isMe = msg.uid === user.uid;
                                                return (
                                                    <div key={msg.id} className={`chat-message ${isMe ? 'chat-message--me' : ''}`} style={{ display: 'flex', gap: '8px', alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '85%', flexDirection: isMe ? 'row-reverse' : 'row' }}>
                                                        {!isMe && (
                                                            <img src={msg.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.displayName)}`} alt={msg.displayName} className="chat-avatar" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                                                        )}
                                                        <div className="chat-bubble-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                                                            {!isMe && <span className="chat-sender" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', marginLeft: '4px' }}>{msg.displayName}</span>}
                                                            <div className="chat-bubble" style={{ padding: '10px 14px', borderRadius: '16px', background: isMe ? 'var(--accent)' : 'var(--border)', color: isMe ? '#fff' : 'var(--text)', borderBottomRightRadius: isMe ? '4px' : '16px', borderTopLeftRadius: isMe ? '16px' : '4px', wordBreak: 'break-word' }}>
                                                                {msg.text}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                    <div style={{ position: 'relative' }}>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <button 
                                                type="button" 
                                                className="btn btn-ghost"
                                                onClick={() => setShowChatEmojiPicker(!showChatEmojiPicker)}
                                                style={{ padding: '8px' }}
                                                title="Emoji picker"
                                            >
                                                <FiSmile size={20} />
                                            </button>
                                            <form className="chat-input-form" onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px', flex: 1 }}>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    placeholder="Message the group..."
                                                    value={newMessage}
                                                    onChange={(e) => setNewMessage(e.target.value)}
                                                    style={{ flex: 1 }}
                                                />
                                                <button type="submit" className="btn btn-primary" disabled={!newMessage.trim()}>
                                                    <FiSend />
                                                </button>
                                            </form>
                                        </div>

                                        {showChatEmojiPicker && (
                                            <div style={{
                                                position: 'absolute', bottom: '100%', left: '0', zIndex: 100,
                                                background: 'var(--card)', border: '1px solid var(--border)',
                                                borderRadius: '12px', padding: '16px', boxShadow: 'var(--shadow-lg)',
                                                marginBottom: '12px', width: '300px'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                    <h4 style={{ margin: 0, fontSize: '0.9rem' }}>Select Emoji</h4>
                                                    <button className="modal-close" onClick={() => setShowChatEmojiPicker(false)}>×</button>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '200px', overflowY: 'auto' }}>
                                                    {EMOJI_CATEGORIES.map(cat => (
                                                        <div key={cat.name}>
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>{cat.name}</div>
                                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px' }}>
                                                                {cat.emojis.map(emoji => (
                                                                    <button
                                                                        key={emoji}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setNewMessage(prev => prev + emoji);
                                                                            setShowChatEmojiPicker(false);
                                                                        }}
                                                                        style={{ background: 'none', border: 'none', fontSize: '1.25rem', padding: '4px', cursor: 'pointer', borderRadius: '4px' }}
                                                                        className="hover-bg-subtle"
                                                                    >
                                                                        {emoji}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : refreshing ? (
                                <div style={{ textAlign: 'center', padding: '40px' }}><div className="spinner" /></div>
                            ) : (
                                <>
                                    {/* Focus Time Graph */}
                                    <div className="group-stats-card">
                                        <h3 className="group-stats-title"><FiClock /> This Week's Focus Time (Mins)</h3>
                                        <div style={{ width: '100%', height: 200, marginTop: '20px' }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={leaderboard.map(m => ({
                                                    name: m.displayName.split(' ')[0],
                                                    focusMinutes: m.focusMinutes || 0,
                                                    isMe: m.uid === user.uid
                                                }))}>
                                                    <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                                                    <YAxis tick={{ fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                                                    <Tooltip cursor={{ fill: 'var(--hover)' }} contentStyle={{ background: 'var(--bg)', border: 'none', borderRadius: '8px', color: 'var(--text)' }} />
                                                    <Bar dataKey="focusMinutes" radius={[4, 4, 0, 0]}>
                                                        {
                                                            leaderboard.map((m, index) => (
                                                                <Cell key={`cell-${index}`} fill={m.uid === user.uid ? 'var(--accent)' : 'var(--text-secondary)'} opacity={m.uid === user.uid ? 1 : 0.4} />
                                                            ))
                                                        }
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

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
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span className="rank-name">{member.displayName} {isMe && '(You)'}</span>
                                                            {presence[member.uid]?.isStudying ? (
                                                                <span className="presence-tag" title="Currently studying!">
                                                                    <span className="presence-dot"></span> {presence[member.uid].taskId || presence[member.uid].subjectName || 'In a Focus Session'}
                                                                </span>
                                                            ) : (
                                                                !isMe && presence[member.uid] && (
                                                                    <button 
                                                                        className="nudge-btn" 
                                                                        onClick={() => handleSendNudge(member.uid)}
                                                                        title={`Send ${member.displayName} a reminder to study!`}
                                                                    >
                                                                        <FiBell /> Nudge
                                                                    </button>
                                                                )
                                                            )}
                                                        </div>
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
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Leaderboard;
