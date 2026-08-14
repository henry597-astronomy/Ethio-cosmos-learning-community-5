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
import AppUpdatePrompt from '@/components/AppUpdatePrompt';
import AIChatBar from '@/components/AIChatBar';
import BottomTaskBar from '@/components/BottomTaskBar';


import { lazy, Suspense } from 'react';

const HomePage = lazy(() => import('@/pages/HomePage'));
const LearningPage = lazy(() => import('@/pages/LearningPage'));
const TopicDetailPage = lazy(() => import('@/pages/TopicDetailPage'));
const LessonPage = lazy(() => import('@/pages/LessonPage'));
const AboutPage = lazy(() => import('@/pages/AboutPage'));
const MaterialsPage = lazy(() => import('@/pages/MaterialsPage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const ChatPage = lazy(() => import('@/pages/ChatPage'));
const AdminPage = lazy(() => import('@/pages/AdminPage'));
const TestsPage = lazy(() => import('@/pages/TestsPage'));
const BookmarksPage = lazy(() => import('@/pages/BookmarksPage'));
const ProgressPage = lazy(() => import('@/pages/ProgressPage'));


const GRADIENT_THEME_BACKGROUNDS: Record<string, string> = {
  'gradient-sakura': 'linear-gradient(135deg, #4a1942 0%, #c06c84 52%, #f8b195 100%)',
  'gradient-desert': 'linear-gradient(135deg, #451a03 0%, #c2410c 48%, #fbbf24 100%)',
  'gradient-arctic': 'linear-gradient(135deg, #082f49 0%, #0e7490 50%, #a5f3fc 100%)',
  'gradient-twilight': 'linear-gradient(135deg, #172554 0%, #7e22ce 52%, #f0abfc 100%)',
  'gradient-rose-gold': 'linear-gradient(135deg, #4c0519 0%, #be123c 50%, #fda4af 100%)',
  'gradient-celestial': 'linear-gradient(135deg, #172554 0%, #2563eb 48%, #c4b5fd 100%)',
};

function AppRoutes() {
  const { theme } = useTheme();
  const gradientBackground = GRADIENT_THEME_BACKGROUNDS[theme];

  return (
    <div className={`h-screen w-full flex flex-col overflow-hidden transition-colors duration-300 ${
      theme === 'light' ? 'bg-[#f1f5f9] text-[#0f172a]' : 'bg-[#0a0e1a] text-white'
    }`} style={{ background: gradientBackground, backgroundAttachment: gradientBackground ? 'fixed' : undefined }}>
      <Navbar />
      <InstallPrompt />
      <AppUpdatePrompt />
      <main className="flex-1 overflow-y-auto pt-24" style={{ WebkitOverflowScrolling: 'touch', paddingBottom: 'calc(3rem + max(0px, env(safe-area-inset-bottom)))' }}>
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        }>
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
        </Suspense>
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
