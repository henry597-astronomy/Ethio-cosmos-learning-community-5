
import { Link } from 'react-router-dom';

export function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    learn: [
      { to: '/learning', label: 'All Topics' },
      { to: '/tests', label: 'Quizzes' },
      { to: '/progress', label: 'Progress' },
    ],
    community: [
      { to: '/chat', label: 'Community Chat' },
      { to: '/materials', label: 'Materials' },
      { to: '/about', label: 'About Us' },
    ],
    legal: [
      { to: '#', label: 'Privacy Policy' },
      { to: '#', label: 'Terms of Service' },
    ],
  };

  return (
    <footer className="bg-slate-950 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-2xl">🌌</span>
              <span className="text-white font-bold text-lg">Ethio-Cosmos</span>
            </Link>
          </div>

          {/* Learn Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Learn</h3>
            <ul className="space-y-2">
              {footerLinks.learn.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="text-gray-400 hover:text-orange-500 transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Community Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Community</h3>
            <ul className="space-y-2">
              {footerLinks.community.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="text-gray-400 hover:text-orange-500 transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 mt-8 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-sm">
            {currentYear} Ethio-Cosmos Learning Community. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            {footerLinks.legal.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                className="text-gray-500 hover:text-gray-400 transition-colors text-sm"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
