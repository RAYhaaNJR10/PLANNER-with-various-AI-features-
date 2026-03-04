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
import './App.css';

const AppContent = () => {
  const { user, loading } = useAuth();

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

  // Public share route — no auth needed
  if (window.location.pathname.startsWith('/share/')) {
    return (
      <ThemeProvider>
        <div className="app-layout" style={{ paddingLeft: 0 }}>
          <main className="main-content" style={{ marginLeft: 0 }}>
            <Routes>
              <Route path="/share/:shareId" element={<SharedSubjectView />} />
            </Routes>
          </main>
        </div>
      </ThemeProvider>
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
