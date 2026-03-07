import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
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
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';
import './App.css';

const AppContent = () => {
  const { user, loading } = useAuth();

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
