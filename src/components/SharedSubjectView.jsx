import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getSharedSubject } from '../services/shareService';
import ReactMarkdown from 'react-markdown';
import { FiCheck } from 'react-icons/fi';
import './SharedSubjectView.css';

const SharedSubjectView = () => {
    const { shareId } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        getSharedSubject(shareId).then(d => {
            if (!d) setNotFound(true);
            else setData(d);
            setLoading(false);
        });
    }, [shareId]);

    if (loading) return (
        <div className="shared-loading">
            <div className="spinner" />
            <p>Loading shared subject...</p>
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

            <div className="shared-footer">
                <a href="/" className="btn btn-primary">📋 Open Planner</a>
            </div>
        </div>
    );
};

export default SharedSubjectView;
