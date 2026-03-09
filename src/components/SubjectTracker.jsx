import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToSubjects, addSubject, deleteSubject, subscribeToTopics, addTopic, deleteTopic, toggleTopicCompletion } from '../services/subjectService';
import { extractTextFromPDF } from '../services/pdfService';
import { extractSubjectsFromText, generateQuizForTopic, generateFullCourse } from '../services/geminiService';
import { shareSubject } from '../services/shareService';
import { awardXP, updateStreak } from '../services/gamificationService';
import { addTask, deleteTasksBySubject } from '../services/taskService';
import { FiCheck, FiMoreVertical, FiTrash2, FiPlus, FiChevronDown, FiChevronRight, FiMove, FiCalendar, FiShare2, FiHelpCircle, FiX, FiUpload, FiFile } from 'react-icons/fi';
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

    // AI Course Builder State
    const [showCourseBuilder, setShowCourseBuilder] = useState(false);
    const [coursePrompt, setCoursePrompt] = useState('');
    const [courseLoading, setCourseLoading] = useState(false);
    const [courseError, setCourseError] = useState('');

    // Quiz Modals & State - handled at the SubjectTracker level to stay on top
    const [quizActive, setQuizActive] = useState(false);
    const [quizData, setQuizData] = useState(null); // The 3 questions
    const [quizLoading, setQuizLoading] = useState(false);
    const [quizCurrentQ, setQuizCurrentQ] = useState(0);
    const [quizScore, setQuizScore] = useState(0);
    const [quizSelection, setQuizSelection] = useState(null); // null, or index of clicked option
    const [quizFeedback, setQuizFeedback] = useState(null); // null, 'correct', 'incorrect'
    const [quizFinished, setQuizFinished] = useState(false);
    const [quizContext, setQuizContext] = useState(null); // { topicName, subjectName }

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
            console.error(err);
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

    // AI Course Builder Handler
    const handleBuildCourse = async () => {
        if (!coursePrompt.trim() || !user) return;
        setCourseLoading(true);
        setCourseError('');
        try {
            setPdfStatus('🧠 Designing course... (this may take a few seconds)');
            const courseData = await generateFullCourse(coursePrompt.trim());
            const randomColor = SUBJECT_COLORS[Math.floor(Math.random() * SUBJECT_COLORS.length)];

            const subjectRef = await addSubject(user.uid, { name: courseData.subjectName, color: randomColor });

            for (let i = 0; i < courseData.topics.length; i++) {
                await addTopic(user.uid, subjectRef.id, { name: courseData.topics[i], order: i });
            }

            setShowCourseBuilder(false);
            setCoursePrompt('');
            setPdfStatus('');
        } catch (e) {
            setCourseError(e.message || 'Failed to generate course. Please try again.');
        } finally {
            setCourseLoading(false);
        }
    };

    // --- Quiz Logic ---
    const handleStartQuiz = async (topicName, subjectName) => {
        setQuizContext({ topicName, subjectName });
        setQuizActive(true);
        setQuizLoading(true);
        setQuizFinished(false);
        setQuizCurrentQ(0);
        setQuizScore(0);
        setQuizSelection(null);
        setQuizFeedback(null);

        try {
            const data = await generateQuizForTopic(topicName, subjectName);
            setQuizData(data);
        } catch (e) {
            alert("Failed to generate quiz: " + e.message);
            setQuizActive(false);
        } finally {
            setQuizLoading(false);
        }
    };

    const handleAnswerQuiz = (selectedIndex) => {
        if (quizFeedback !== null) return; // already answered this question

        setQuizSelection(selectedIndex);
        const correct = quizData[quizCurrentQ].correctIndex === selectedIndex;

        if (correct) {
            setQuizFeedback('correct');
            setQuizScore(s => s + 1);
        } else {
            setQuizFeedback('incorrect');
        }
    };

    const handleNextQuizQuestion = async () => {
        if (quizCurrentQ < quizData.length - 1) {
            setQuizCurrentQ(q => q + 1);
            setQuizSelection(null);
            setQuizFeedback(null);
        } else {
            // Finished
            setQuizFinished(true);
            if (user) {
                const xpEarned = quizScore * 10; // 10 XP per correct answer
                if (xpEarned > 0) {
                    await awardXP(user.uid, xpEarned);
                }
                await updateStreak(user.uid);
            }
        }
    };

    return (
        <div className="subjects-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">📖 Subjects</h1>
                    <p className="page-subtitle">Track topics and completion per subject</p>
                </div>
                <div className="page-header-actions">
                    <button className="btn btn-accent" onClick={() => { setShowCourseBuilder(true); setShowPdfUpload(false); setShowAdd(false); }}>
                        ✨ AI Course
                    </button>
                    <button className="btn btn-ghost" onClick={() => { setShowPdfUpload(true); setShowAdd(false); setShowCourseBuilder(false); }}>
                        <FiUpload /> Import PDF
                    </button>
                    <button className="btn btn-primary" onClick={() => { setShowAdd(true); setShowPdfUpload(false); setShowCourseBuilder(false); }}>
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

            {/* AI Course Builder Modal */}
            {showCourseBuilder && (
                <div className="label-form-card">
                    <div className="label-form-header">
                        <h3>✨ Build Course with AI</h3>
                        <button className="modal-close" onClick={() => setShowCourseBuilder(false)}><FiX /></button>
                    </div>
                    <div className="label-form-content">
                        <div className="form-group">
                            <label className="form-label">What do you want to learn?</label>
                            <input
                                type="text"
                                className="form-input"
                                value={coursePrompt}
                                onChange={(e) => setCoursePrompt(e.target.value)}
                                placeholder="e.g. Learn React from scratch in 30 days"
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleBuildCourse()}
                            />
                        </div>

                        {courseError && <div className="pdf-error">⚠️ {courseError}</div>}
                        {courseLoading && <div className="pdf-status">🧠 AI is writing your curriculum...</div>}

                        <div className="form-actions">
                            <button className="btn btn-ghost" onClick={() => setShowCourseBuilder(false)}>Cancel</button>
                            <button
                                className="btn btn-accent"
                                onClick={handleBuildCourse}
                                disabled={!coursePrompt.trim() || courseLoading}
                            >
                                {courseLoading ? 'Generating...' : '✨ Generate'}
                            </button>
                        </div>
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
                        onStartQuiz={handleStartQuiz}
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

            {/* Quiz Modal */}
            {quizActive && (
                <div className="modal-overlay">
                    <div className="label-form-card" style={{ maxWidth: '500px', width: '90%' }}>
                        <div className="label-form-header">
                            <h3>🧠 Quiz: {quizContext?.topicName}</h3>
                            <button className="modal-close" onClick={() => setQuizActive(false)}><FiX /></button>
                        </div>
                        <div className="label-form-content">
                            {quizLoading ? (
                                <div style={{ textAlign: 'center', padding: '40px' }}>
                                    <div className="spinner" style={{ margin: '0 auto 16px' }} />
                                    <p>AI is generating your quiz...</p>
                                </div>
                            ) : quizFinished ? (
                                <div style={{ textAlign: 'center', padding: '20px' }}>
                                    <h2>Quiz Complete! 🎉</h2>
                                    <p style={{ fontSize: '1.2rem', margin: '16px 0' }}>
                                        You scored <strong>{quizScore}</strong> out of {quizData.length}
                                    </p>
                                    <p style={{ color: 'var(--accent)', marginBottom: '24px' }}>
                                        +{quizScore * 10} XP Awarded!
                                    </p>
                                    <button className="btn btn-primary" onClick={() => setQuizActive(false)} style={{ width: '100%' }}>
                                        Close
                                    </button>
                                </div>
                            ) : quizData ? (
                                <div>
                                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                                        Question {quizCurrentQ + 1} of {quizData.length}
                                    </p>
                                    <h4 style={{ fontSize: '1.1rem', marginBottom: '20px', lineHeight: '1.4' }}>
                                        {quizData[quizCurrentQ].question}
                                    </h4>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                                        {quizData[quizCurrentQ].options.map((opt, idx) => {
                                            let btnClasses = "btn btn-ghost";
                                            let btnStyles = {
                                                justifyContent: 'flex-start',
                                                textAlign: 'left',
                                                height: 'auto',
                                                minHeight: '44px',
                                                whiteSpace: 'normal',
                                                border: '1px solid var(--border)'
                                            };

                                            if (quizFeedback !== null) {
                                                if (idx === quizData[quizCurrentQ].correctIndex) {
                                                    btnStyles.background = '#00B89420';
                                                    btnStyles.borderColor = '#00B894';
                                                    btnStyles.color = '#00B894';
                                                } else if (idx === quizSelection) {
                                                    btnStyles.background = '#E1705520';
                                                    btnStyles.borderColor = '#E17055';
                                                    btnStyles.color = '#E17055';
                                                }
                                                btnStyles.opacity = idx !== quizData[quizCurrentQ].correctIndex && idx !== quizSelection ? 0.5 : 1;
                                            } else if (quizSelection === idx) {
                                                btnStyles.borderColor = 'var(--accent)';
                                            }

                                            return (
                                                <button
                                                    key={idx}
                                                    className={btnClasses}
                                                    style={btnStyles}
                                                    onClick={() => handleAnswerQuiz(idx)}
                                                    disabled={quizFeedback !== null}
                                                >
                                                    <span style={{ fontWeight: 'bold', marginRight: '12px', color: 'var(--text-secondary)' }}>
                                                        {['A', 'B', 'C', 'D'][idx]}
                                                    </span>
                                                    <span>{opt}</span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {quizFeedback && (
                                        <div style={{
                                            padding: '16px',
                                            borderRadius: '12px',
                                            marginBottom: '24px',
                                            background: quizFeedback === 'correct' ? '#00B89420' : '#E1705520',
                                            color: quizFeedback === 'correct' ? '#00B894' : '#E17055',
                                            border: `1px solid ${quizFeedback === 'correct' ? '#00B894' : '#E17055'}`
                                        }}>
                                            <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                                                {quizFeedback === 'correct' ? '✅ Correct!' : '❌ Incorrect'}
                                            </div>
                                            <div style={{ fontSize: '0.9rem', color: 'var(--text)' }}>
                                                {quizData[quizCurrentQ].explanation}
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        className="btn btn-primary"
                                        onClick={handleNextQuizQuestion}
                                        disabled={quizFeedback === null}
                                        style={{ width: '100%' }}
                                    >
                                        {quizCurrentQ < quizData.length - 1 ? 'Next Question' : 'Finish Quiz'}
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const SubjectCard = ({ subject, userId, expanded, onToggle, onDelete, onStartQuiz }) => {
    const [topics, setTopics] = useState([]);
    const [showAddTopic, setShowAddTopic] = useState(false);
    const [newTopicName, setNewTopicName] = useState('');
    const [sharing, setSharing] = useState(false);

    // Auto Schedule State
    const [showSchedule, setShowSchedule] = useState(false);
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [targetDate, setTargetDate] = useState('');
    const [scheduling, setScheduling] = useState(false);

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

    const handleAutoSchedule = async () => {
        if (!targetDate || !startDate) return;

        const uncompleted = topics.filter(t => !t.completed);
        if (uncompleted.length === 0) {
            alert('All topics are already completed!');
            setShowSchedule(false);
            return;
        }

        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(targetDate);
        end.setHours(23, 59, 59, 999);

        if (end < start) {
            alert('End date must be after the start date.');
            return;
        }

        // Calculate total days between now and target
        const MS_PER_DAY = 1000 * 60 * 60 * 24;
        const diffDays = Math.max(1, Math.ceil((end - start) / MS_PER_DAY));

        setScheduling(true);
        try {
            // Clear old tasks before scheduling new ones
            await deleteTasksBySubject(userId, subject.id);

            // Distribute uniformly
            for (let i = 0; i < uncompleted.length; i++) {
                const topic = uncompleted[i];
                // Day offset: which day does this topic fall on?
                // Example: 10 topics over 5 days -> 2 per day.
                // i = 0,1 -> day 0. i=2,3 -> day 1. 
                const dayOffset = Math.floor((i / uncompleted.length) * diffDays);

                const taskDate = new Date(start);
                taskDate.setDate(taskDate.getDate() + dayOffset);
                const dateStr = taskDate.toISOString().split('T')[0];

                await addTask(userId, {
                    title: `Study: ${topic.name}`,
                    description: `Topic from ${subject.name}`,
                    date: dateStr,
                    estimatedMinutes: 30, // Default estimate
                    subjectId: subject.id,
                    topicId: topic.id
                });
            }
            alert(`✅ Successfully auto-scheduled ${uncompleted.length} topics across ${diffDays} days!`);
            setShowSchedule(false);
            setTargetDate('');
        } catch (e) {
            alert('Failed to auto-schedule: ' + e.message);
        } finally {
            setScheduling(false);
        }
    };

    const handleDragEnd = async (result) => {
        if (!result.destination) return;

        const sourceIndex = result.source.index;
        const destinationIndex = result.destination.index;
        if (sourceIndex === destinationIndex) return;

        const reordered = Array.from(topics);
        const [moved] = reordered.splice(sourceIndex, 1);
        reordered.splice(destinationIndex, 0, moved);

        // Optimistically update UI
        setTopics(reordered);

        try {
            const { updateTopicOrder } = await import('../services/subjectService');
            await updateTopicOrder(userId, subject.id, reordered);
        } catch (e) {
            alert('Failed to save order: ' + e.message);
            // Will snap back on next snapshot
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
                        {topics.map((topic, index) => (
                            <div
                                key={topic.id}
                                className={`topic-item ${topic.completed ? 'topic-item--done' : ''}`}
                            >
                                <div
                                    style={{ color: 'var(--border)', cursor: 'grab', display: 'flex' }}
                                >
                                    <FiMove size={14} />
                                </div>
                                <button
                                    className={`task-check ${topic.completed ? 'task-check--checked' : ''}`}
                                    style={topic.completed ? { background: subject.color, borderColor: subject.color } : {}}
                                    onClick={() => handleToggleTopic(topic)}
                                >
                                    {topic.completed && <FiCheck />}
                                </button>
                                <span className="topic-name">{topic.name}</span>
                                <button className="task-action-btn" title="AI Quiz" onClick={() => onStartQuiz(topic.name, subject.name)} style={{ color: 'var(--accent)' }}>
                                    <FiHelpCircle size={16} />
                                </button>
                                <button className="task-action-btn task-action-btn--danger" onClick={() => handleDeleteTopic(topic.id)}>
                                    <FiTrash2 size={16} />
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

                    {showSchedule && (
                        <div className="label-form-card" style={{ marginTop: '16px', border: `1px solid ${subject.color}` }}>
                            <div className="label-form-header">
                                <h3 style={{ fontSize: '1rem' }}><FiCalendar /> Auto-Schedule</h3>
                                <button className="modal-close" onClick={() => setShowSchedule(false)}><FiX /></button>
                            </div>
                            <div className="label-form-content" style={{ padding: '0 0 16px 0' }}>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                                    Pick a start date and an exam/end date. We will evenly distribute your <strong>{topics.filter(t => !t.completed).length}</strong> remaining topics across your daily calendar tasks, replacing any previously scheduled tasks for this subject.
                                </p>
                                <div className="form-group">
                                    <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '4px' }}>Start Date</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        style={{ marginBottom: '12px' }}
                                    />
                                    <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '4px' }}>End Date (Exam)</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={targetDate}
                                        min={startDate}
                                        onChange={(e) => setTargetDate(e.target.value)}
                                    />
                                </div>
                                <button
                                    className="btn btn-primary"
                                    style={{ width: '100%' }}
                                    disabled={!targetDate || !startDate || scheduling}
                                    onClick={handleAutoSchedule}
                                >
                                    {scheduling ? 'Scheduling...' : 'Schedule / Reschedule'}
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="subject-body-actions" style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
                        <button className="btn btn-ghost" style={{ flex: 1, minWidth: '120px' }} onClick={() => setShowSchedule(true)}>
                            <FiCalendar /> Auto Schedule
                        </button>
                        <button className="btn btn-ghost" style={{ flex: 1, minWidth: '120px' }} onClick={handleShare} disabled={sharing}>
                            {sharing ? '⏳ Creating...' : <><FiShare2 /> Share</>}
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

