import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { CmsProvider } from '@/context/CmsContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { LiveKitProvider } from '@/context/LiveKitContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { Toaster } from 'sonner';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import InstallPrompt from '@/components/InstallPrompt';
import AIChatBar from '@/components/AIChatBar';
import BottomTaskBar from '@/components/BottomTaskBar';


import HomePage from '@/pages/HomePage';
import LearningPage from '@/pages/LearningPage';
import TopicDetailPage from '@/pages/TopicDetailPage';
import LessonPage from '@/pages/LessonPage';
import AboutPage from '@/pages/AboutPage';
import MaterialsPage from '@/pages/MaterialsPage';
import LoginPage from '@/pages/LoginPage';
import ChatPage from '@/pages/ChatPage';
import AdminPage from '@/pages/AdminPage';
import TestsPage from '@/pages/TestsPage';
import BookmarksPage from '@/pages/BookmarksPage';
import ProgressPage from '@/pages/ProgressPage';


function AppRoutes() {
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen flex flex-col overflow-y-auto transition-colors duration-300 ${
      theme === 'light' ? 'bg-[#f1f5f9] text-[#0f172a]' : 'bg-[#0a0e1a] text-white'
    }`} style={{ WebkitOverflowScrolling: 'touch' }}>
      <Navbar />
      <InstallPrompt />
      <main className="flex-1 pt-24" style={{ WebkitOverflowScrolling: 'touch', paddingBottom: 'calc(3rem + max(0px, env(safe-area-inset-bottom)))' }}>
        <Routes>
          {/* Login is always accessible */}
          <Route path="/login" element={<LoginPage />} />

          {/* Public content routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          
          {/* Protected content routes - require login check and block status check */}
          <Route path="/learning" element={<ProtectedRoute><LearningPage /></ProtectedRoute>} />
          <Route path="/learning/:topicId" element={<ProtectedRoute><TopicDetailPage /></ProtectedRoute>} />
          <Route path="/learning/:topicId/:subtopicId" element={<ProtectedRoute><LessonPage /></ProtectedRoute>} />
          <Route path="/materials" element={<ProtectedRoute><MaterialsPage /></ProtectedRoute>} />

          {/* Protected Interactive Routes */}
          <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
          <Route path="/tests" element={<ProtectedRoute><TestsPage /></ProtectedRoute>} />
          <Route path="/bookmarks" element={<ProtectedRoute><BookmarksPage /></ProtectedRoute>} />
          <Route path="/progress" element={<ProtectedRoute><ProgressPage /></ProtectedRoute>} />

          {/* Admin Route */}
          <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminPage /></ProtectedRoute>} />

          {/* Catch-all route - redirect to home */}
          <Route path="*" element={<HomePage />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <CmsProvider>
        <Router>
          <NotificationProvider>
            <LiveKitProvider>
              <ThemeProvider>
                <AppRoutes />
                <Toaster position="top-right" theme="dark" />
              </ThemeProvider>
              <AIChatBar />
              <BottomTaskBar />
              
            </LiveKitProvider>
          </NotificationProvider>
        </Router>
      </CmsProvider>
    </AuthProvider>
  );
}

export default App;
