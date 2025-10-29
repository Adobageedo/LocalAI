/**
 * Sidebar Component
 * Barre latérale de navigation
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { Nav, INavLink, INavStyles } from '@fluentui/react';
import { useTheme } from '@/contexts';

export default function Sidebar() {
  const { mode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const navStyles: Partial<INavStyles> = {
    root: {
      width: '250px',
      height: '100%',
      backgroundColor: mode === 'dark' ? '#1e1e1e' : '#f3f2f1',
      borderRight: `1px solid ${mode === 'dark' ? '#3e3e3e' : '#edebe9'}`,
      padding: '16px 0',
    },
    link: {
      color: mode === 'dark' ? '#ffffff' : '#323130',
    },
  };

  const navLinks: INavLink[] = [
    {
      name: 'Accueil',
      url: '/',
      key: 'home',
      icon: 'Home',
    },
    {
      name: 'Composer',
      url: '/compose',
      key: 'compose',
      icon: 'Edit',
    },
    {
      name: 'Éditer Email',
      url: '/edit',
      key: 'edit',
      icon: 'EditMail',
    },
    {
      name: 'Templates',
      url: '/templates',
      key: 'templates',
      icon: 'FileTemplate',
    },
    {
      name: 'Historique',
      url: '/history',
      key: 'history',
      icon: 'History',
    },
    {
      name: 'Paramètres',
      url: '/settings',
      key: 'settings',
      icon: 'Settings',
    },
  ];

  const handleLinkClick = (ev?: React.MouseEvent<HTMLElement>, item?: INavLink) => {
    if (ev) {
      ev.preventDefault();
    }
    if (item?.url) {
      navigate(item.url);
    }
  };

  return (
    <Nav
      groups={[
        {
          links: navLinks,
        },
      ]}
      styles={navStyles}
      selectedKey={location.pathname}
      onLinkClick={handleLinkClick}
    />
  );
}
