import { signInWithGoogle } from '../services/auth';
import { useState } from 'react';
import { FcGoogle } from 'react-icons/fc';
import './LoginPage.css';

const LoginPage = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGoogleSignIn = async () => {
        setLoading(true);
        setError('');
        try {
            await signInWithGoogle();
        } catch (err) {
            setError('Sign-in failed. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-header">
                    <span className="login-logo">📋</span>
                    <h1 className="login-title">Planner</h1>
                    <p className="login-subtitle">Your colorful daily task manager</p>
                </div>

                <div className="login-features">
                    <div className="login-feature">✨ Organize tasks with labels & priorities</div>
                    <div className="login-feature">📅 Calendar view for daily planning</div>
                    <div className="login-feature">📊 Track subject progress & completion</div>
                    <div className="login-feature">📄 Import subjects from PDF with AI</div>
                </div>

                <button
                    className="google-signin-btn"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                >
                    <FcGoogle size={22} />
                    <span>{loading ? 'Signing in...' : 'Continue with Google'}</span>
                </button>

                {error && <p className="login-error">{error}</p>}

                <p className="login-footer">
                    Your data is stored securely in the cloud ☁️
                </p>
            </div>

            <div className="login-bg-shapes">
                <div className="shape shape-1" />
                <div className="shape shape-2" />
                <div className="shape shape-3" />
                <div className="shape shape-4" />
            </div>
        </div>
    );
};

export default LoginPage;
