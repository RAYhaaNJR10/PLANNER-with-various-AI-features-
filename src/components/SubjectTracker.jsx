import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
    subscribeToSubjects,
    addSubject,
    deleteSubject,
    subscribeToTopics,
    addTopic,
    deleteTopic,
    toggleTopicCompletion,
} from '../services/subjectService';
import { extractTextFromPDF } from '../services/pdfService';
import { extractSubjectsFromText } from '../services/geminiService';
import { shareSubject } from '../services/shareService';
import { FiPlus, FiTrash2, FiChevronDown, FiChevronRight, FiCheck, FiX, FiUpload, FiFile, FiShare2 } from 'react-icons/fi';
import './SubjectTracker.css';

const SUBJECT_COLORS = [
    '#6C5CE7', '#00B894', '#E17055', '#0984E3',
    '#FDCB6E', '#A29BFE', '#FD79A8', '#00CEC9',
];

const SubjectTracker = () => {
    const { user } = useAuth();
    const [subjects, setSubjects] = useState([]);
    const [showAdd, setShowAdd] = useState(false);
    const [newSubjectName, setNewSubjectName] = useState('');
    const [newSubjectColor, setNewSubjectColor] = useState(SUBJECT_COLORS[0]);
    const [expandedSubject, setExpandedSubject] = useState(null);

    // PDF upload state
    const [showPdfUpload, setShowPdfUpload] = useState(false);
    const [pdfFile, setPdfFile] = useState(null);
    const [pdfProcessing, setPdfProcessing] = useState(false);
    const [pdfStatus, setPdfStatus] = useState('');
    const [pdfError, setPdfError] = useState('');
    const [pdfPreview, setPdfPreview] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (!user) return;
        const unsub = subscribeToSubjects(user.uid, setSubjects);
        return () => unsub();
    }, [user]);

    const handleAddSubject = async () => {
        if (!newSubjectName.trim()) return;
        await addSubject(user.uid, { name: newSubjectName.trim(), color: newSubjectColor });
        setNewSubjectName('');
        setShowAdd(false);
    };

    const handleDeleteSubject = async (subjectId) => {
        if (confirm('Delete this subject and all its topics?')) {
            await deleteSubject(user.uid, subjectId);
        }
    };

    // PDF handlers
    const handleFileSelect = (file) => {
        if (!file) return;
        if (file.type !== 'application/pdf') {
            setPdfError('Please select a PDF file.');
            return;
        }
        setPdfFile(file);
        setPdfError('');
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => setIsDragging(false);

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        handleFileSelect(file);
    };

    const handlePdfProcess = async () => {
        if (!pdfFile || !user) return;
        setPdfProcessing(true);
        setPdfError('');
        setPdfPreview(null);

        try {
            setPdfStatus('📄 Extracting text from PDF...');
            const text = await extractTextFromPDF(pdfFile);

            if (!text.trim()) {
                throw new Error('Could not extract text from this PDF. It may be a scanned image.');
            }

            setPdfStatus('🤖 AI is analyzing your document...');
            const extractedSubjects = await extractSubjectsFromText(text);

            if (!extractedSubjects.length) {
                throw new Error('Could not identify any subjects in this PDF.');
            }

            setPdfPreview(extractedSubjects);
            setPdfStatus(`✅ Found ${extractedSubjects.length} subject(s)! Review and confirm below.`);
        } catch (err) {
            setPdfError(err.message || 'Something went wrong processing the PDF.');
            setPdfStatus('');
        } finally {
            setPdfProcessing(false);
        }
    };

    const handleConfirmPdfSubjects = async () => {
        if (!pdfPreview || !user) return;
        setPdfProcessing(true);
        setPdfStatus('💾 Creating subjects and topics...');

        try {
            for (let i = 0; i < pdfPreview.length; i++) {
                const s = pdfPreview[i];
                const color = SUBJECT_COLORS[i % SUBJECT_COLORS.length];
                const subjectRef = await addSubject(user.uid, { name: s.name, color });

                for (const topicName of s.topics) {
                    await addTopic(user.uid, subjectRef.id, { name: topicName });
                }
            }

            setPdfStatus('');
            setPdfFile(null);
            setPdfPreview(null);
            setShowPdfUpload(false);
        } catch (err) {
            setPdfError('Failed to save subjects. Please try again.');
        } finally {
            setPdfProcessing(false);
        }
    };

    const resetPdfUpload = () => {
        setPdfFile(null);
        setPdfPreview(null);
        setPdfStatus('');
        setPdfError('');
        setShowPdfUpload(false);
    };

    return (
        <div className="subjects-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">📖 Subjects</h1>
                    <p className="page-subtitle">Track topics and completion per subject</p>
                </div>
                <div className="page-header-actions">
                    <button className="btn btn-accent" onClick={() => { setShowPdfUpload(true); setShowAdd(false); }}>
                        <FiUpload /> Import PDF
                    </button>
                    <button className="btn btn-primary" onClick={() => { setShowAdd(true); setShowPdfUpload(false); }}>
                        <FiPlus /> Add Subject
                    </button>
                </div>
            </div>

            {/* PDF Upload Section */}
            {showPdfUpload && (
                <div className="pdf-upload-card">
                    <div className="label-form-header">
                        <h3>📄 Import from PDF</h3>
                        <button className="modal-close" onClick={resetPdfUpload}><FiX /></button>
                    </div>
                    <div className="label-form-content">
                        {!pdfPreview && (
                            <>
                                <div
                                    className={`pdf-dropzone ${isDragging ? 'pdf-dropzone--active' : ''} ${pdfFile ? 'pdf-dropzone--has-file' : ''}`}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".pdf"
                                        style={{ display: 'none' }}
                                        onChange={(e) => handleFileSelect(e.target.files[0])}
                                    />
                                    {pdfFile ? (
                                        <div className="pdf-file-info">
                                            <FiFile size={32} />
                                            <span className="pdf-file-name">{pdfFile.name}</span>
                                            <span className="pdf-file-size">{(pdfFile.size / 1024).toFixed(1)} KB</span>
                                        </div>
                                    ) : (
                                        <div className="pdf-dropzone-content">
                                            <FiUpload size={36} />
                                            <p><strong>Drop a PDF here</strong> or click to browse</p>
                                            <span>Syllabus, textbook contents, curriculum, etc.</span>
                                        </div>
                                    )}
                                </div>

                                {pdfError && <div className="pdf-error">⚠️ {pdfError}</div>}
                                {pdfStatus && <div className="pdf-status">{pdfStatus}</div>}

                                <div className="form-actions">
                                    <button className="btn btn-ghost" onClick={resetPdfUpload}>Cancel</button>
                                    <button
                                        className="btn btn-primary"
                                        onClick={handlePdfProcess}
                                        disabled={!pdfFile || pdfProcessing}
                                    >
                                        {pdfProcessing ? '⏳ Processing...' : '🤖 Extract Subjects'}
                                    </button>
                                </div>
                            </>
                        )}

                        {pdfPreview && (
                            <>
                                <div className="pdf-status">{pdfStatus}</div>
                                <div className="pdf-preview-list">
                                    {pdfPreview.map((s, i) => (
                                        <div key={i} className="pdf-preview-subject">
                                            <div className="pdf-preview-header">
                                                <div
                                                    className="subject-color-dot"
                                                    style={{ background: SUBJECT_COLORS[i % SUBJECT_COLORS.length] }}
                                                />
                                                <strong>{s.name}</strong>
                                                <span className="pdf-topic-count">{s.topics.length} topics</span>
                                            </div>
                                            <div className="pdf-preview-topics">
                                                {s.topics.map((t, j) => (
                                                    <span key={j} className="pdf-preview-topic-chip">{t}</span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {pdfError && <div className="pdf-error">⚠️ {pdfError}</div>}

                                <div className="form-actions">
                                    <button className="btn btn-ghost" onClick={resetPdfUpload}>Cancel</button>
                                    <button
                                        className="btn btn-primary"
                                        onClick={handleConfirmPdfSubjects}
                                        disabled={pdfProcessing}
                                    >
                                        {pdfProcessing ? '💾 Saving...' : `✅ Add ${pdfPreview.length} Subject(s)`}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {showAdd && (
                <div className="label-form-card">
                    <div className="label-form-header">
                        <h3>New Subject</h3>
                        <button className="modal-close" onClick={() => setShowAdd(false)}><FiX /></button>
                    </div>
                    <div className="label-form-content">
                        <div className="form-group">
                            <label className="form-label">Name</label>
                            <input
                                type="text"
                                className="form-input"
                                value={newSubjectName}
                                onChange={(e) => setNewSubjectName(e.target.value)}
                                placeholder="e.g. Mathematics"
                                autoFocus
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Color</label>
                            <div className="color-grid">
                                {SUBJECT_COLORS.map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        className={`color-swatch ${newSubjectColor === c ? 'color-swatch--active' : ''}`}
                                        style={{ background: c }}
                                        onClick={() => setNewSubjectColor(c)}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="form-actions">
                            <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleAddSubject} disabled={!newSubjectName.trim()}>
                                <FiCheck /> Create
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="subjects-list">
                {subjects.map((subject) => (
                    <SubjectCard
                        key={subject.id}
                        subject={subject}
                        userId={user.uid}
                        expanded={expandedSubject === subject.id}
                        onToggle={() => setExpandedSubject(expandedSubject === subject.id ? null : subject.id)}
                        onDelete={() => handleDeleteSubject(subject.id)}
                    />
                ))}
            </div>

            {subjects.length === 0 && !showAdd && !showPdfUpload && (
                <div className="empty-state">
                    <span className="empty-emoji">📖</span>
                    <h3>No subjects yet</h3>
                    <p>Add a subject manually or import from a PDF!</p>
                </div>
            )}
        </div>
    );
};

const SubjectCard = ({ subject, userId, expanded, onToggle, onDelete }) => {
    const [topics, setTopics] = useState([]);
    const [showAddTopic, setShowAddTopic] = useState(false);
    const [newTopicName, setNewTopicName] = useState('');
    const [sharing, setSharing] = useState(false);

    useEffect(() => {
        const unsub = subscribeToTopics(userId, subject.id, setTopics);
        return () => unsub();
    }, [userId, subject.id]);

    const completedCount = topics.filter((t) => t.completed).length;
    const percentage = topics.length > 0 ? Math.round((completedCount / topics.length) * 100) : 0;

    const handleAddTopic = async () => {
        if (!newTopicName.trim()) return;
        await addTopic(userId, subject.id, { name: newTopicName.trim() });
        setNewTopicName('');
        setShowAddTopic(false);
    };

    const handleToggleTopic = async (topic) => {
        await toggleTopicCompletion(userId, subject.id, topic.id, topic.completed);
    };

    const handleDeleteTopic = async (topicId) => {
        await deleteTopic(userId, subject.id, topicId);
    };

    const handleShare = async () => {
        if (sharing) return;
        setSharing(true);
        try {
            const shareId = await shareSubject(userId, subject.id, { ...subject, topics });
            const url = `${window.location.origin}/share/${shareId}`;
            await navigator.clipboard.writeText(url);
            alert('Share link copied to clipboard!\n\n' + url);
        } catch (e) {
            alert('Failed to share subject: ' + e.message);
        } finally {
            setSharing(false);
        }
    };

    return (
        <div className="subject-card" style={{ borderColor: subject.color + '40' }}>
            <div className="subject-header" onClick={onToggle}>
                <div className="subject-color-dot" style={{ background: subject.color }} />
                <div className="subject-info">
                    <h3 className="subject-name">{subject.name}</h3>
                    <span className="subject-count">{completedCount}/{topics.length} topics</span>
                </div>
                <div className="subject-progress-ring">
                    <svg width="44" height="44" viewBox="0 0 44 44">
                        <circle
                            cx="22" cy="22" r="18"
                            fill="none"
                            stroke={subject.color + '30'}
                            strokeWidth="4"
                        />
                        <circle
                            cx="22" cy="22" r="18"
                            fill="none"
                            stroke={subject.color}
                            strokeWidth="4"
                            strokeDasharray={`${(percentage / 100) * 113.1} 113.1`}
                            strokeLinecap="round"
                            transform="rotate(-90 22 22)"
                            style={{ transition: 'stroke-dasharray 0.5s ease' }}
                        />
                    </svg>
                    <span className="subject-percentage" style={{ color: subject.color }}>{percentage}%</span>
                </div>
                <span className="subject-chevron">
                    {expanded ? <FiChevronDown /> : <FiChevronRight />}
                </span>
            </div>

            {expanded && (
                <div className="subject-body">
                    <div className="subject-progress-bar">
                        <div
                            className="subject-progress-fill"
                            style={{ width: `${percentage}%`, background: subject.color }}
                        />
                    </div>

                    <div className="topics-list">
                        {topics.map((topic) => (
                            <div key={topic.id} className={`topic-item ${topic.completed ? 'topic-item--done' : ''}`}>
                                <button
                                    className={`task-check ${topic.completed ? 'task-check--checked' : ''}`}
                                    style={topic.completed ? { background: subject.color, borderColor: subject.color } : {}}
                                    onClick={() => handleToggleTopic(topic)}
                                >
                                    {topic.completed && <FiCheck />}
                                </button>
                                <span className="topic-name">{topic.name}</span>
                                <button className="task-action-btn task-action-btn--danger" onClick={() => handleDeleteTopic(topic.id)}>
                                    <FiTrash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>

                    {showAddTopic ? (
                        <div className="topic-add-form">
                            <input
                                type="text"
                                className="form-input"
                                value={newTopicName}
                                onChange={(e) => setNewTopicName(e.target.value)}
                                placeholder="Topic name..."
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleAddTopic()}
                            />
                            <button className="btn btn-primary btn-sm" onClick={handleAddTopic}>
                                <FiCheck />
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowAddTopic(false)}>
                                <FiX />
                            </button>
                        </div>
                    ) : (
                        <button className="topic-add-btn" onClick={() => setShowAddTopic(true)}>
                            <FiPlus /> Add Topic
                        </button>
                    )}

                    <div className="subject-body-actions" style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                        <button className="btn btn-ghost" style={{ flex: 1 }} onClick={handleShare} disabled={sharing}>
                            {sharing ? '⏳ Creating Link...' : <><FiShare2 /> Share Subject</>}
                        </button>
                        <button className="subject-delete-btn" style={{ margin: 0, padding: '10px 16px', background: '#fee2e2', color: '#ef4444', borderRadius: '12px' }} onClick={onDelete}>
                            <FiTrash2 /> Delete
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
};

export default SubjectTracker;

