import React from 'react';
import { CalendarDays, ListChecks, ChartNoAxesColumnIncreasing, Settings, LogIn } from 'lucide-react';
import * as api from '../../lib/api';
import { Button } from '../ui/index.js';

export default function Sidebar({ currentView = 'today', setView, syncState = 'Bağlantı hazır', user = null, onOpenAuth }) {
  const items = [
    { id: 'today', label: 'Bugün', icon: CalendarDays },
    { id: 'habits', label: 'Alışkanlıklar', icon: ListChecks },
    { id: 'progress', label: 'İlerleme', icon: ChartNoAxesColumnIncreasing },
  ];

  const isDemo = api.isDemo();
  const isAuthenticated = Boolean(user && !isDemo);
  const isError = /Hata|Çakışma|kurulamadı|Kaydedilmemiş|kaydedilemedi|Arşivlenemedi|Geri yüklenemedi|Kayıt değişti|Cihazda bekliyor/i.test(syncState || '');
  const isPending = /Kaydediliyor|Yükleniyor/i.test(syncState || '');
  const showSync = isError || isPending;
  const syncAttr = isError ? 'error' : 'local';

  return (
    <aside className="sidebar" aria-label="Ana gezinme">
      <a
        className="brand"
        href="#today"
        onClick={(e) => { e.preventDefault(); setView?.('today'); }}
        aria-label="PACE ana sayfa"
      >
        <span>PACE</span>
      </a>

      <p className="sidebar-caption mono">her gün, net bir düzenle</p>
      <nav className="nav-list">
        {items.map((item) => {
          const NavIcon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${isActive ? 'is-active' : ''}`}
              data-view={item.id}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => setView?.(item.id)}
            >
              <span className="nav-icon"><NavIcon size={18} strokeWidth={1.5} aria-hidden="true" /></span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        {showSync && (
          <span className="sync-indicator mono" id="sync-indicator" data-state={syncAttr}>
            <i aria-hidden="true" />
            <span>{syncState}</span>
          </span>
        )}

        {!isAuthenticated && (
          <Button
            variant="primary"
            size="md"
            onClick={() => onOpenAuth?.('login')}
            style={{ width: '100%', justifyContent: 'flex-start', marginBottom: 'var(--space-2)' }}
          >
            <LogIn size={16} strokeWidth={1.5} aria-hidden="true" />
            <span>{isDemo ? 'Demo’dan Çık & Giriş Yap' : 'Giriş Yap / Kayıt Ol'}</span>
          </Button>
        )}

        <button
          type="button"
          className={`nav-item settings-link ${currentView === 'settings' ? 'is-active' : ''}`}
          data-view="settings"
          aria-current={currentView === 'settings' ? 'page' : undefined}
          onClick={() => setView?.('settings')}
        >
          <span className="nav-icon"><Settings size={18} strokeWidth={1.5} aria-hidden="true" /></span>
          <span>Ayarlar</span>
        </button>
      </div>
    </aside>
  );
}
