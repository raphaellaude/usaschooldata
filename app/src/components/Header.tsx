import {useState} from 'react';
import type {FormEvent} from 'react';
import {Link, useNavigate, useLocation} from 'react-router-dom';

export default function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  // Only show search bar on profile pages
  const showSearchBar = location.pathname.startsWith('/profiles/');

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="bg-[#333333] border-b border-gray-700 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-12">
          {/* Logo and Title */}
          <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <img
              src="/usaschooldata.svg"
              alt="USA School Data"
              className="h-6 w-6 brightness-0 invert"
            />
            <span className="text-lg font-bold text-white">USA School Data</span>
          </Link>

          {/* Search Bar - Only on profile pages, hidden on mobile */}
          {showSearchBar && (
            <form onSubmit={handleSearch} className="hidden md:flex items-center space-x-2">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search schools..."
                className="px-3 py-1.5 w-56 text-sm bg-[#2a2a2a] text-white placeholder-gray-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Search
              </button>
            </form>
          )}
        </div>
      </div>
    </header>
  );
}
