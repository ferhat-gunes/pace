import React from 'react';

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
            margin: '60px auto',
            background: 'var(--surface)',
            borderRadius: '16px',
            border: '1px solid var(--border)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
          }}
        >
          <div style={{ fontSize: '36px', marginBottom: '16px' }}>🌱</div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', color: 'var(--ink)', marginBottom: '8px' }}>
            Beklenmeyen bir durum oluştu
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: 1.5, marginBottom: '24px' }}>
            Sayfayı yenileyerek kaldığınız yerden devam edebilirsiniz. Verileriniz yerel bellekte güvendedir.
          </p>
          <button
            type="button"
            className="btn-3d btn-3d-green"
            onClick={this.handleReload}
            style={{ minHeight: '44px', padding: '0 24px', fontSize: '15px' }}
          >
            Yeniden Yükle
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
