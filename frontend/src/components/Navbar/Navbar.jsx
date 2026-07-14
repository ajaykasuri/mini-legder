import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { LogoMark, IconDashboard, IconTransactions, IconBudget, IconLock, IconSun, IconMoon, IconLogout } from '../icons/Icons';
import { useAuth } from '../../hooks/useAuth';
import '../../styles/navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [dark, setDark] = useState(() => localStorage.getItem('ledger_theme') === 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('ledger_theme', dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <LogoMark />
        <span>Ledger</span>
      </div>

      <div className="navbar-links">
        <NavLink to="/dashboard" className="navbar-link">
          <IconDashboard /> Dashboard
        </NavLink>
        <NavLink to="/transactions" className="navbar-link">
          <IconTransactions /> Transactions
        </NavLink>
        <NavLink to="/budgets" className="navbar-link">
          <IconBudget /> Budgets
        </NavLink>
        <NavLink to="/spending-locks" className="navbar-link">
          <IconLock /> Daily Limits
        </NavLink>
      </div>

      <div className="navbar-footer">
        <button className="theme-toggle" onClick={() => setDark((d) => !d)} aria-label="Toggle dark mode">
          {dark ? <IconSun /> : <IconMoon />}
        </button>
        <div className="navbar-user">
          <span className="navbar-user-name">{user?.name}</span>
          <button className="navbar-logout" onClick={logout} aria-label="Log out">
            <IconLogout />
          </button>
        </div>
      </div>
    </nav>
  );
}
