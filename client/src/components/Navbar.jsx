import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, LogOut, User as UserIcon, ChevronDown, Menu, X, Plus } from 'lucide-react';
import Logo from './Logo';
import { BACKEND_URL } from '../utils/api';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const navLinks = [
    { name: 'Return', path: '/return' },
    { name: 'Cash', path: '/cash' },
    { name: 'Cheque', path: '/cheque' },
    { name: 'Data', path: '/data' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-40 w-full bg-white/70 dark:bg-darkBg-card/75 backdrop-blur-xl border-b border-slate-100 dark:border-white/5 transition-all duration-300 shadow-[0_2px_15px_rgba(0,0,0,0.01)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.15)]">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Branding */}
          <div className="flex md:flex-1 items-center justify-start">
            <Link to="/" className="hover:opacity-95 transition-opacity">
              <Logo variant="horizontal" iconSize="sm" />
            </Link>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex md:flex-1 justify-center space-x-6">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className={`relative px-4 py-2 text-sm font-semibold transition-all duration-200 rounded-lg hover:bg-slate-500/5 ${
                  isActive(link.path)
                    ? 'text-primary dark:text-primary-emerald font-bold'
                    : 'text-slate-500 dark:text-slate-300 hover:text-primary dark:hover:text-primary-emerald'
                }`}
              >
                {link.name}
                {isActive(link.path) && (
                  <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-gradient-to-r from-primary to-primary-emerald rounded-full"></span>
                )}
              </Link>
            ))}
          </div>

          {/* Right Side Settings & Profile */}
          <div className="hidden md:flex md:flex-1 items-center justify-end space-x-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-darkBg-input transition-all duration-200 border border-transparent hover:border-slate-200 dark:hover:border-white/5"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4.5 h-4.5 text-accent" /> : <Moon className="w-4.5 h-4.5 text-primary" />}
            </button>

            {/* Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center space-x-2 p-1.5 rounded-xl border border-slate-200 dark:border-white/5 bg-white/50 dark:bg-darkBg/30 hover:bg-slate-100 dark:hover:bg-darkBg-input hover:shadow-md transition-all duration-250"
              >
                {user.profilePhoto ? (
                  <img
                    src={user.profilePhoto.startsWith('data:') ? user.profilePhoto : `${BACKEND_URL}${user.profilePhoto}`}
                    alt={user.name}
                    className="w-8 h-8 rounded-lg object-cover ring-2 ring-primary/10"
                  />
                ) : (
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 dark:bg-primary-emerald/10 text-primary dark:text-primary-emerald font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 max-w-[100px] truncate">
                  {user.name}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2.5 w-56 rounded-2xl bg-white/95 dark:bg-darkBg-card/95 backdrop-blur-md border border-slate-200 dark:border-white/5 shadow-2xl py-1.5 z-50 animate-in fade-in slide-in-from-top-3 duration-200">
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-white/5">
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Signed in as</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate mt-0.5">{user.email}</p>
                    <p className="text-[10px] uppercase font-bold text-accent tracking-wider mt-1">{user.role}</p>
                  </div>
                  <Link
                    to="/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center space-x-2.5 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-darkBg-input transition-colors duration-150"
                  >
                    <UserIcon className="w-4.5 h-4.5 text-primary" />
                    <span className="font-medium">My Profile & Users</span>
                  </Link>
                  <button
                    onClick={logout}
                    className="w-full flex items-center space-x-2.5 px-4 py-2.5 text-sm text-red-650 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/15 transition-colors duration-150 text-left border-t border-slate-100 dark:border-white/5"
                  >
                    <LogOut className="w-4.5 h-4.5" />
                    <span className="font-semibold">Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile hamburger menu */}
          <div className="flex md:hidden items-center space-x-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-lightBg dark:hover:bg-darkBg-input"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5 text-accent" /> : <Moon className="w-5 h-5 text-primary" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-lightBg dark:hover:bg-darkBg-input"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-100 dark:border-emerald-950/20 bg-white dark:bg-darkBg-card px-4 pt-2 pb-4 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-xl text-base font-medium ${
                isActive(link.path)
                  ? 'bg-primary/10 text-primary dark:text-primary-emerald font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-lightBg dark:hover:bg-darkBg-input'
              }`}
            >
              {link.name}
            </Link>
          ))}
          <div className="pt-4 border-t border-slate-100 dark:border-emerald-950/20">
            <div className="flex items-center px-3 space-x-3 mb-3">
              {user.profilePhoto ? (
                <img
                  src={user.profilePhoto.startsWith('data:') ? user.profilePhoto : `${BACKEND_URL}${user.profilePhoto}`}
                  alt={user.name}
                  className="w-10 h-10 rounded-lg object-cover"
                />
              ) : (
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-primary dark:text-primary-emerald font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{user.name}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">{user.email}</p>
              </div>
            </div>
            <Link
              to="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-xl text-base font-medium text-slate-600 dark:text-slate-300 hover:bg-lightBg dark:hover:bg-darkBg-input"
            >
              My Profile & Users
            </Link>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                logout();
              }}
              className="w-full text-left block px-3 py-2 rounded-xl text-base font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/10"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
