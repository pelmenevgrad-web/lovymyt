import { Component } from 'react'
import { AlertTriangle } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] caught:', error)
    console.error('[ErrorBoundary] component stack:', info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div style={{
        padding: 24, fontFamily: 'monospace',
        background: '#fff1f2', minHeight: 'var(--full-h)',
        color: '#7f1d1d',
      }}>
        <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={18} /> Render error
        </div>
        <div style={{
          background: '#fff', borderRadius: 10, padding: 16,
          border: '1.5px solid #fca5a5', marginBottom: 16,
          wordBreak: 'break-word', fontSize: 14, lineHeight: 1.6,
        }}>
          <strong>{error.name}:</strong> {error.message}
        </div>
        {error.stack && (
          <pre style={{
            background: '#1e1e1e', color: '#f8f8f2',
            borderRadius: 10, padding: 14, fontSize: 11,
            overflowX: 'auto', lineHeight: 1.55,
            whiteSpace: 'pre-wrap', wordBreak: 'break-all',
          }}>
            {error.stack}
          </pre>
        )}
        <button
          onClick={() => this.setState({ error: null })}
          style={{
            marginTop: 16, padding: '10px 20px', borderRadius: 10,
            background: '#dc2626', color: '#fff',
            border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: 14,
          }}
        >
          Спробувати ще раз
        </button>
      </div>
    )
  }
}
