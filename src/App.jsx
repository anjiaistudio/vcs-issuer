import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import { 
  ShieldCheck, 
  Copy, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  BookOpen, 
  UserCheck,
  QrCode,
  Award,
  Code
} from 'lucide-react';
import './App.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export default function App() {
  // Navigation Tabs: 'issue' | 'oid4vp'
  const [activeTab, setActiveTab] = useState('issue');

  // DOM Refs for auto-scrolling
  const qrIssueRef = useRef(null);
  const qrVpRef = useRef(null);
  const vpClaimsRef = useRef(null);

  // --- Issuance State ---
  const [formData, setFormData] = useState({
    subject_did: 'did:key:z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwW36xyM',
    name: 'Jane Doe',
    email: 'jane.doe@example.com',
    role: 'Senior Identity Architect'
  });
  const [isIssuing, setIsIssuing] = useState(false);
  const [issueResult, setIssueResult] = useState(null);
  const [issueError, setIssueError] = useState('');

  // --- OID4VP Session State ---
  const [isCreatingVp, setIsCreatingVp] = useState(false);
  const [vpSession, setVpSession] = useState(null);
  const [vpStatus, setVpStatus] = useState(null);
  const [vpError, setVpError] = useState('');
  const [showRawJson, setShowRawJson] = useState(false);

  // Collapsible sections state
  const [openVcExplain, setOpenVcExplain] = useState(false);
  const [openIssuerExplain, setOpenIssuerExplain] = useState(false);

  // Auto-scroll logic when issue result is set
  useEffect(() => {
    if (issueResult && qrIssueRef.current) {
      qrIssueRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [issueResult]);

  // Auto-scroll logic when VP session is initialized
  useEffect(() => {
    if (vpSession && qrVpRef.current) {
      qrVpRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [vpSession]);

  // Auto-scroll logic when claims are successfully verified
  useEffect(() => {
    if (vpStatus?.status === 'verified' && vpClaimsRef.current) {
      vpClaimsRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [vpStatus]);

  // Form input handler
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ---------------------------------------------------------------------------
  // 1. OID4VCI ISSUANCE HANDLER
  // ---------------------------------------------------------------------------
  const handleIssueCredential = async (e) => {
    e.preventDefault();
    setIsIssuing(true);
    setIssueError('');
    setIssueResult(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/issue`, {
        subject_did: formData.subject_did,
        claims: {
          name: formData.name,
          email: formData.email,
          role: formData.role
        }
      });

      if (response.data && response.data.oid4vci_uri) {
        setIssueResult(response.data);
      } else {
        throw new Error('Invalid response payload received from issuer service.');
      }
    } catch (err) {
      console.error(err);
      setIssueError(
        err.response?.data?.detail || 
        'Failed to issue credential. Ensure the backend is running.'
      );
    } finally {
      setIsIssuing(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 2. OID4VP VERIFICATION SESSION & POLLING
  // ---------------------------------------------------------------------------
  const startVerificationSession = async () => {
    setIsCreatingVp(true);
    setVpError('');
    setVpSession(null);
    setVpStatus(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/verify/session`);
      setVpSession(response.data);
    } catch (err) {
      console.error(err);
      setVpError(
        err.response?.data?.detail || 
        'Failed to initialize verification session. Check backend connectivity.'
      );
    } finally {
      setIsCreatingVp(false);
    }
  };

  // Poll status every 2s while OID4VP session is pending
  useEffect(() => {
    if (!vpSession || vpStatus?.status === 'verified' || vpStatus?.status === 'failed') {
      return;
    }

    const intervalId = setInterval(async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/verify/status/${vpSession.session_id}`);
        if (response.data) {
          setVpStatus(response.data);
          if (response.data.status === 'verified' || response.data.status === 'failed') {
            clearInterval(intervalId);
          }
        }
      } catch (err) {
        console.error('Error polling verification status:', err);
      }
    }, 2000);

    return () => clearInterval(intervalId);
  }, [vpSession, vpStatus]);

  // Helper function to extract claims array/object safely
  const renderClaims = (credentials) => {
    if (!credentials) return null;

    // Handle array or object structure returned by API
    const claimsObj = Array.isArray(credentials) ? credentials[0] : credentials;

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginTop: '12px' }}>
        {Object.entries(claimsObj).map(([key, value]) => (
          <div key={key} style={{ backgroundColor: '#FFFFFF', padding: '12px', borderRadius: '8px', border: '1px solid #D1D5DB' }}>
            <span style={{ fontSize: '12px', textTransform: 'uppercase', color: '#6B7280', fontWeight: 'bold' }}>
              {key.replace('_', ' ')}
            </span>
            <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827', marginTop: '4px', wordBreak: 'break-word' }}>
              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="container">
      <header className="header">
        <ShieldCheck size={36} color="#4F46E5" />
        <h1 className="title">VCS Issuer & Verifier Studio</h1>
        <p className="subtitle">
          Issue & Verify W3C Credentials using <code>OID4VCI</code> & <code>OID4VP</code>
        </p>
      </header>

      {/* Explanations Section */}
      <section className="info-section">
        <div className="info-card">
          <button 
            className="info-card-header" 
            onClick={() => setOpenVcExplain(!openVcExplain)}
            aria-expanded={openVcExplain}
          >
            <span className="info-card-title">
              <BookOpen size={18} color="#4F46E5" />
              What are W3C Verifiable Credentials (VCs)?
            </span>
            {openVcExplain ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          
          {openVcExplain && (
            <div className="info-card-content">
              <p>
                <strong>Verifiable Credentials (VCs)</strong> are digital equivalents of physical identity cards. Standardized by W3C, VCs enable cryptographic trust without relying on central databases.
              </p>
            </div>
          )}
        </div>

        <div className="info-card">
          <button 
            className="info-card-header" 
            onClick={() => setOpenIssuerExplain(!openIssuerExplain)}
            aria-expanded={openIssuerExplain}
          >
            <span className="info-card-title">
              <UserCheck size={18} color="#4F46E5" />
              How do OID4VCI & OID4VP Work?
            </span>
            {openIssuerExplain ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          
          {openIssuerExplain && (
            <div className="info-card-content">
              <p>
                <strong>OID4VCI:</strong> Generates an issuance QR offer scanned by mobile wallets.<br />
                <strong>OID4VP:</strong> Creates a presentation request session to receive verified claims back.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Mode Navigation Tabs */}
      <nav className="tab-navigation" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button 
          className={`button ${activeTab === 'issue' ? '' : 'button-secondary'}`}
          onClick={() => setActiveTab('issue')}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          <Award size={18} /> 1. Issue Credential (OID4VCI)
        </button>
        <button 
          className={`button ${activeTab === 'oid4vp' ? '' : 'button-secondary'}`}
          onClick={() => setActiveTab('oid4vp')}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          <QrCode size={18} /> 2. OID4VP Presentation
        </button>
      </nav>

      {/* TAB 1: OID4VCI CREDENTIAL ISSUANCE */}
      {activeTab === 'issue' && (
        <main className="grid">
          <section className="card">
            <h2 className="card-title">1. Enter Credential Claims</h2>
            <form onSubmit={handleIssueCredential} className="form">
              <div className="field-group">
                <label className="label">Holder (Recipient) DID</label>
                <input
                  type="text"
                  name="subject_did"
                  value={formData.subject_did}
                  onChange={handleChange}
                  required
                  className="input"
                />
              </div>

              <div className="field-group">
                <label className="label">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="input"
                />
              </div>

              <div className="field-group">
                <label className="label">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="input"
                />
              </div>

              <div className="field-group">
                <label className="label">Assigned Role</label>
                <input
                  type="text"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  required
                  className="input"
                />
              </div>

              <button type="submit" disabled={isIssuing} className="button">
                {isIssuing ? (
                  <>
                    <RefreshCw className="spinner" size={18} />
                    Signing Credential...
                  </>
                ) : (
                  'Issue Verifiable Credential'
                )}
              </button>
            </form>

            {issueError && (
              <div className="error-box">
                <AlertCircle size={20} color="#DC2626" />
                <span>{issueError}</span>
              </div>
            )}
          </section>

          <section className="card" ref={qrIssueRef}>
            <h2 className="card-title">2. Scan with Mobile Wallet</h2>
            
            {!issueResult ? (
              <div className="empty-state">
                <ShieldCheck size={48} color="#D1D5DB" />
                <p>Fill out claim details and click <strong>"Issue Verifiable Credential"</strong> to generate the OID4VCI QR offer.</p>
              </div>
            ) : (
              <div className="output-container">
                <div className="qr-box" style={{ textAlign: 'center' }}>
                  <QRCodeSVG value={issueResult.oid4vci_uri} size={200} includeMargin={true} />
                  <p className="qr-hint" style={{ marginTop: '10px' }}>
                    Scan with <strong>walt.id</strong>, <strong>Lissi</strong>, or any OID4VCI wallet
                  </p>
                </div>
              </div>
            )}
          </section>
        </main>
      )}

      {/* TAB 2: OID4VP VERIFICATION SESSION */}
      {activeTab === 'oid4vp' && (
        <section className="card">
          <h2 className="card-title">OID4VP Presentation Verification</h2>
          <p className="subtitle" style={{ marginBottom: '20px' }}>
            Request a credential presentation from a user's mobile wallet using OID4VP.
          </p>

          <button onClick={startVerificationSession} disabled={isCreatingVp} className="button" style={{ maxWidth: '300px' }}>
            {isCreatingVp ? (
              <>
                <RefreshCw className="spinner" size={18} />
                Initializing Session...
              </>
            ) : (
              'Create Verification Session'
            )}
          </button>

          {vpError && (
            <div className="error-box" style={{ marginTop: '15px' }}>
              <AlertCircle size={20} color="#DC2626" />
              <span>{vpError}</span>
            </div>
          )}

          {vpSession && (
            <div className="output-container" style={{ marginTop: '25px' }} ref={qrVpRef}>
              <div className="qr-box" style={{ textAlign: 'center' }}>
                <QRCodeSVG value={vpSession.oid4vp_uri} size={220} includeMargin={true} />
                <p className="qr-hint" style={{ marginTop: '10px' }}>Scan with mobile wallet to present VC</p>
              </div>

              <div className="jwt-box" style={{ width: '100%' }}>
                <p><strong>Session ID:</strong> <code>{vpSession.session_id}</code></p>
                <p style={{ marginTop: '10px' }}>
                  <strong>Status: </strong>
                  <span style={{ 
                    fontWeight: 'bold', 
                    color: vpStatus?.status === 'verified' ? '#059669' : vpStatus?.status === 'failed' ? '#DC2626' : '#D97706' 
                  }}>
                    {vpStatus?.status?.toUpperCase() || 'PENDING (WAITING FOR SCAN)'}
                  </span>
                </p>

                {vpStatus?.status === 'verified' && (
                  <div ref={vpClaimsRef} style={{ marginTop: '20px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', padding: '20px', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ color: '#065F46', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '18px' }}>
                        <CheckCircle2 size={22} color="#059669" /> Verification Successful!
                      </h3>
                      <button 
                        onClick={() => setShowRawJson(!showRawJson)} 
                        style={{ background: 'none', border: 'none', color: '#047857', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 'bold' }}
                      >
                        <Code size={16} /> {showRawJson ? 'Hide Raw JSON' : 'Show Raw JSON'}
                      </button>
                    </div>

                    <p style={{ marginTop: '12px', fontWeight: '600', color: '#064E3B' }}>Verified Claims Received:</p>
                    {renderClaims(vpStatus.credentials)}

                    {showRawJson && (
                      <pre className="textarea" style={{ marginTop: '15px', height: 'auto', maxHeight: '200px', overflowY: 'auto', backgroundColor: '#1E293B', color: '#F8FAFC' }}>
                        {JSON.stringify(vpStatus.credentials, null, 2)}
                      </pre>
                    )}
                  </div>
                )}

                {vpStatus?.status === 'failed' && (
                  <div className="error-box" style={{ marginTop: '15px' }}>
                    <AlertCircle size={20} color="#DC2626" />
                    <span>Presentation verification failed or signature was invalid.</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}