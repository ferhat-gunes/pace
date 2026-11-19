import React from 'react';
import { Button } from '../ui/index.js';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="app-error"
          role="alert"
          style={{
            padding: 'var(--space-8) var(--space-6)',
            textAlign: 'center',
            maxWidth: '480px',
            margin: 'var(--space-12) auto',
            backgroundColor: 'var(--surface-1)',
            border: '1px solid var(--danger)',
          }}
        >
          <div className="mono" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--danger)', letterSpacing: '0.06em', marginBottom: 'var(--space-3)' }}>
            HATA
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: 'var(--fg)', marginBottom: 'var(--space-2)' }}>
            Beklenmeyen bir durum oluştu
          </h2>
          <p style={{ color: 'var(--fg-muted)', fontSize: '14px', lineHeight: 1.5, marginBottom: 'var(--space-6)' }}>
            Bu bölümü yeniden deneyebilir veya gezinmeden başka bir bölüme geçebilirsin. Henüz gönderilmemiş form bilgilerini kontrol et.
          </p>
          <Button variant="primary" onClick={this.handleReload}>
            Bu bölümü yeniden dene
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
