import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { CmsProvider } from '@/context/CmsContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
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
  return (
    <div className="min-h-screen bg-[#0a0e1a] flex flex-col">
      <Navbar />
      <main className="flex-1 pt-28">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/learning" element={<LearningPage />} />
          <Route path="/learning/:topicId" element={<TopicDetailPage />} />
          <Route path="/learning/:topicId/:subtopicId" element={<LessonPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/materials" element={<MaterialsPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Routes */}
          <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
          <Route path="/tests" element={<ProtectedRoute><TestsPage /></ProtectedRoute>} />
          <Route path="/bookmarks" element={<ProtectedRoute><BookmarksPage /></ProtectedRoute>} />
          <Route path="/progress" element={<ProtectedRoute><ProgressPage /></ProtectedRoute>} />

          {/* Admin Route */}
          <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminPage /></ProtectedRoute>} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <CmsProvider>
        <Router>
          <AppRoutes />
        </Router>
      </CmsProvider>
    </AuthProvider>
  );
}

export default App;
