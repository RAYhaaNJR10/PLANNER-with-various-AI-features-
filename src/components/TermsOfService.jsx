import React from 'react';
import { FiArrowLeft } from 'react-icons/fi';
import { Link } from 'react-router-dom';

const TermsOfService = () => {
    return (
        <div style={{
            maxWidth: '800px',
            margin: '0 auto',
            padding: '40px 20px',
            color: 'var(--text)',
            fontFamily: 'inherit',
            lineHeight: '1.6'
        }}>
            <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--accent)', textDecoration: 'none', marginBottom: '32px', fontWeight: 'bold' }}>
                <FiArrowLeft /> Back to App
            </Link>

            <h1 style={{ fontSize: '2.5rem', marginBottom: '8px', color: 'var(--text)' }}>Terms of Service</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Last updated: {new Date().toLocaleDateString()}</p>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '16px', color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>1. Agreement to Terms</h2>
                <p>By accessing or using LevelUp Study Planner (the "Application"), you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you may not access the service.</p>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '16px', color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>2. Description of Service</h2>
                <p>LevelUp Study Planner is a productivity tool designed to help users track subjects, topics, habits, and tasks. It incorporates gamification elements, study groups, AI-generated courses, and Google Calendar synchronization.</p>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '16px', color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>3. User Accounts & Google OAuth</h2>
                <p style={{ marginBottom: '12px' }}>To use this Application, you must authenticate using your Google Account via Google OAuth. You are responsible for safeguarding the password and credentials that you use to access Google services.</p>
                <p>We rely on Google's APIs to provide core features (like saving to Firebase and syncing to Google Calendar). We do not store your Google password.</p>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '16px', color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>4. User Data and Privacy</h2>
                <p style={{ marginBottom: '12px' }}>Your privacy is important to us. By using the Application, you also agree to our <Link to="/privacy" style={{ color: 'var(--accent)' }}>Privacy Policy</Link>, which explains how we handle your personal data.</p>
                <p>If you authorize Google Calendar access, the Application will only write new events related to your study tasks and will not read or modify your existing personal events.</p>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '16px', color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>5. Acceptable Use</h2>
                <p style={{ marginBottom: '12px' }}>You agree not to use the Application to:</p>
                <ul style={{ paddingLeft: '24px', listStyleType: 'disc' }}>
                    <li style={{ marginBottom: '8px' }}>Violate any laws, third party rights, or our policies.</li>
                    <li style={{ marginBottom: '8px' }}>Attempt to bypass any security mechanisms of the Application or Google Firebase.</li>
                    <li style={{ marginBottom: '8px' }}>Abuse the Gemini AI course generation feature by repeatedly spamming the service with automated requests.</li>
                </ul>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '16px', color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>6. Service Modifications and Termination</h2>
                <p>We reserve the right to modify, suspend, or discontinue the Application at any time without notice. We provide this Application "as is" and make no guarantees regarding its continuous availability or the preservation of your data in the event of a critical failure.</p>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '16px', color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>7. Governing Law</h2>
                <p>These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which the developer resides, without regard to its conflict of law provisions.</p>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '16px', color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>8. Contact</h2>
                <p>If you have any questions about these Terms, please contact <strong>rayhaanlibish@gmail.com</strong>.</p>
            </section>
        </div>
    );
};

export default TermsOfService;
