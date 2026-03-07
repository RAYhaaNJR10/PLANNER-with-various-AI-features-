import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getSharedSubject } from '../services/shareService';
import { useAuth } from '../contexts/AuthContext';
import { addSubject, addTopic } from '../services/subjectService';
import ReactMarkdown from 'react-markdown';
import { FiCheck } from 'react-icons/fi';
import './SharedSubjectView.css';

const SharedSubjectView = () => {
    const { shareId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [importing, setImporting] = useState(false);

    useEffect(() => {
        getSharedSubject(shareId).then(d => {
            if (!d) setNotFound(true);
            else setData(d);
            setLoading(false);
        }).catch(err => {
            console.error("Error fetching shared subject:", err);
            setErrorMsg(err.message || "Failed to load shared subject.");
            setLoading(false);
        });
    }, [shareId]);

    if (loading) return (
        <div className="shared-loading">
            <div className="spinner" />
            <p>Loading shared subject...</p>
        </div>
    );

    if (errorMsg) return (
        <div className="shared-notfound">
            <span>⚠️</span>
            <h2>Access Denied or Error</h2>
            <p>{errorMsg}</p>
            <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                This is likely caused by Firestore security rules preventing read access to shared subjects.
            </p>
        </div>
    );

    if (notFound) return (
        <div className="shared-notfound">
            <span>😕</span>
            <h2>Subject not found</h2>
            <p>This link may have expired or been removed.</p>
        </div>
    );

    const completed = data.topics?.filter(t => t.completed).length || 0;
    const total = data.topics?.length || 0;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    const handleImport = async () => {
        if (!user) {
            alert('Please log in to import this subject.');
            return;
        }
        if (importing || !data) return;

        setImporting(true);
        try {
            const subjectRef = await addSubject(user.uid, {
                name: data.name,
                color: data.color || '#6C5CE7',
                icon: data.icon || '📚'
            });

            if (data.topics && data.topics.length > 0) {
                for (let i = 0; i < data.topics.length; i++) {
                    await addTopic(user.uid, subjectRef.id, {
                        name: data.topics[i].name,
                        order: i,
                        completed: false // Import as uncompleted
                    });
                }
            }
            alert('Subject imported successfully!');
            navigate('/subjects');
        } catch (err) {
            console.error('Error importing subject:', err);
            alert('Failed to import subject: ' + err.message);
        } finally {
            setImporting(false);
        }
    };

    return (
        <div className="shared-page">
            <div className="shared-header">
                <span className="shared-badge">🔗 Shared Subject</span>
                <h1 className="shared-title">{data.icon || '📚'} {data.name}</h1>
                <p className="shared-meta">Shared on {new Date(data.sharedAt).toLocaleDateString()}</p>
                <div className="shared-progress-row">
                    <div className="shared-progress-bar">
                        <div className="shared-progress-fill" style={{ width: `${pct}%`, background: data.color || 'var(--accent)' }} />
                    </div>
                    <span className="shared-progress-pct">{pct}%</span>
                </div>
            </div>

            <div className="shared-topics">
                {data.topics?.map((topic, i) => (
                    <div key={i} className={`shared-topic ${topic.completed ? 'shared-topic--done' : ''}`}>
                        <div className="shared-topic-check" style={topic.completed ? { background: data.color || 'var(--accent)', borderColor: data.color || 'var(--accent)' } : {}}>
                            {topic.completed && <FiCheck size={13} color="#fff" />}
                        </div>
                        <span className="shared-topic-name">{topic.name}</span>
                    </div>
                ))}
            </div>

            <div className="shared-footer" style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                {user ? (
                    <button
                        className="btn btn-primary"
                        onClick={handleImport}
                        disabled={importing}
                    >
                        {importing ? '⏳ Importing...' : '📥 Save to My Planner'}
                    </button>
                ) : (
                    <button
                        className="btn btn-primary"
                        onClick={() => navigate('/')}
                    >
                        Log in to Import
                    </button>
                )}
                <button className="btn btn-ghost" onClick={() => navigate('/')}>
                    📋 Open Planner
                </button>
            </div>
        </div>
    );
};

export default SharedSubjectView;
