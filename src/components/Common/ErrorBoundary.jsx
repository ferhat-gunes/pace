import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidUpdate(prevProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            maxWidth: '480px',
            margin: '40px auto',
            background: 'var(--surface)',
            borderRadius: '20px',
            border: '2px solid var(--border)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
          }}
        >
          <div style={{ fontSize: '36px', marginBottom: '16px' }}>🌱</div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', color: 'var(--ink)', marginBottom: '8px' }}>
            Beklenmeyen bir durum oluştu
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: 1.5, marginBottom: '24px' }}>
            Tekrar deneyebilir veya başka bir sekmeye geçebilirsin. Verilerin güvende.
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-3d btn-3d-green"
              onClick={this.handleRetry}
              style={{ minHeight: '44px', padding: '0 20px', fontSize: '14px', borderRadius: '14px' }}
            >
              Tekrar Dene
            </button>
            <button
              type="button"
              className="btn-3d btn-3d-gray"
              onClick={this.handleReload}
              style={{ minHeight: '44px', padding: '0 20px', fontSize: '14px', borderRadius: '14px' }}
            >
              Sayfayı Yenile
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
