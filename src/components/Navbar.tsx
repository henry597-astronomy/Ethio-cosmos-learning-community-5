import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const publicNavLinks = [
  { path: '/', label: 'Home' },
  { path: '/learning', label: 'Lesson' },
  { path: '/materials', label: 'Materials' },
  { path: '/chat', label: 'Channel' },
  { path: '/tests', label: 'Quizzes' },
  { path: '/about', label: 'About' },
];

export default function Navbar() {
  const location = useLocation();
  const { isAdmin, isSuperAdmin } = useAuth();
  
  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const allNavLinks = [
    ...publicNavLinks,
    ...(isAdmin ? [{ path: '/admin', label: isSuperAdmin ? 'Admin' : 'Lessons' }] : [])
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50">
      <div className="bg-slate-950/95 border-b border-white/10 h-16 flex items-center justify-center">
        <h1 className="text-xl font-bold text-white">EthioCosmos</h1>
      </div>
      <div className="bg-slate-900/90 backdrop-blur-md border-b border-white/5 h-10 flex items-center justify-center overflow-x-auto">
        <div className="flex items-center gap-4 px-4">
          {allNavLinks.map((link, idx) => (
            <Link
              key={idx}
              to={link.path}
              className={`px-3 py-1 rounded-full text-sm transition-all ${
                isActive(link.path)
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
