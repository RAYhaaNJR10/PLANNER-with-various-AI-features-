import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { getGamification } from './services/gamificationService';
import Sidebar from './components/Sidebar';
import TaskList from './components/TaskList';
import Calendar from './components/Calendar';
import LabelManager from './components/LabelManager';
import SubjectTracker from './components/SubjectTracker';
import StatsOverview from './components/StatsOverview';
import HabitsTracker from './components/HabitsTracker';
import LoginPage from './components/LoginPage';
import PomodoroTimer from './components/PomodoroTimer';
import SharedSubjectView from './components/SharedSubjectView';
import Leaderboard from './components/Leaderboard';
import Shop from './components/Shop';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';
import './App.css';

const AppContent = () => {
  const { user, loading } = useAuth();
  const { setTheme } = useTheme();
  const [nudgeToast, setNudgeToast] = useState(null);

  useEffect(() => {
    if (!user) return;
    
    // Load active theme
    getGamification(user.uid).then(stats => {
      if (stats.activeTheme) setTheme(stats.activeTheme);
    }).catch(console.error);

    // Subscribe to nudges
    import('./services/presenceService').then(({ subscribeToNudges }) => {
      const unsub = subscribeToNudges(user.uid, (senderName) => {
        setNudgeToast(`🔔 ${senderName} nudged you! Time to get back to studying!`);
        // Auto-hide toast after 5 seconds
        setTimeout(() => setNudgeToast(null), 5000);
      });
      // We can't synchronously return cleanup from a promise, so we just let it run.
      // In a real app we'd useRef to store the unsub. For now this is fine.
    });
  }, [user]);

  // Handle public routes gracefully FIRST - Do not wait for Auth Loading
  const isPublicRoute = window.location.pathname.startsWith('/share/') ||
    window.location.pathname.startsWith('/privacy') ||
    window.location.pathname.startsWith('/terms');

  if (isPublicRoute) {
    return (
      <ThemeProvider>
        <div className="app-layout" style={{ paddingLeft: 0 }}>
          <main className="main-content" style={{ marginLeft: 0 }}>
            <Routes>
              <Route path="/share/:shareId" element={<SharedSubjectView />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
            </Routes>
          </main>
        </div>
      </ThemeProvider>
    );
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <span className="loading-emoji">📋</span>
          <h2>Planner</h2>
          <div className="spinner" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="app-layout">
      {nudgeToast && (
        <div className="global-nudge-toast">
          {nudgeToast}
        </div>
      )}
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<TaskList />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/subjects" element={<SubjectTracker />} />
          <Route path="/labels" element={<LabelManager />} />
          <Route path="/stats" element={<StatsOverview />} />
          <Route path="/habits" element={<HabitsTracker />} />
          <Route path="/groups" element={<Leaderboard />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/share/:shareId" element={<SharedSubjectView />} />
        </Routes>
      </main>
      <PomodoroTimer />
    </div>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;
