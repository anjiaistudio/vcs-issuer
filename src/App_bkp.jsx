// src/App.jsx
import React, { useState, useEffect } from 'react';
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
  FileCheck,
  Award
} from 'lucide-react';
import './App.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export default function App() {
  // Navigation Tabs: 'issue' | 'oid4vp' | 'manual'
  const [activeTab, setActiveTab] = useState('issue');

  // --- Issuance State ---
  const [formData, setFormData] = useState({
    subject_did: 'did:key:z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwW36xyM',
    name: 'Jane Doe',
    email: 'jane.doe@example.com',
    role: 'Senior Identity Architect'
  });
  const [isIssuing, setIsIssuing] = useState(false);
  const [issueResult, setIssueResult] = useState(null); // stores { jwt, oid4vci_uri, qr_code_png_base64 }
  const [issueError, setIssueError] = useState('');
  const [copiedJwt, setCopiedJwt] = useState(false);

  // --- OID4VP Session State ---
  const [isCreatingVp, setIsCreatingVp] = useState(false);
  const [vpSession, setVpSession] = useState(null); // stores { session_id, oid4vp_uri, qr_code_png_base64 }
  const [vpStatus, setVpStatus] = useState(null); // stores { status, holder, credentials }
  const [vpError, setVpError] = useState('');

  // --- Direct JWT Verification State ---
  const [rawJwtInput, setRawJwtInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifyError, setVerifyError] = useState('');

  // Collapsible sections state
  const [openVcExplain, setOpenVcExplain] = useState(false);
  const [openIssuerExplain, setOpenIssuerExplain] = useState(false);

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
        'Failed to issue credential. Ensure the FastAPI backend is running.'
      );
    } finally {
      setIsIssuing(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedJwt(true);
    setTimeout(() => setCopiedJwt(false), 3000);
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

  // ---------------------------------------------------------------------------
  // 3. DIRECT JWT VERIFICATION HANDLER
  // ---------------------------------------------------------------------------
  const handleManualVerify = async (e) => {
    e.preventDefault();
    setIsVerifying(true);
    setVerifyError('');
    setVerifyResult(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/verify`, {
        jwt_vc: rawJwtInput
      });
      setVerifyResult(response.data);
    } catch (err) {
      console.error(err);
      setVerifyError(
        err.response?.data?.detail || 
        'Verification failed. Ensure the JWT VC is valid and intact.'
      );
    } finally {
      setIsVerifying(false);
    }
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
        {/* Card 1: What are W3C Verifiable Credentials? */}
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
                <strong>Verifiable Credentials (VCs)</strong> are the digital equivalents of physical credentials like a driver's license, university degree, or employee badge. Standardized by the W3C, VCs enable cryptographic trust without relying on central databases.
              </p>
              <ul>
                <li><strong>Tamper-Evident:</strong> Any alteration to the claims invalidates the signature.</li>
                <li><strong>Privacy-Preserving:</strong> Users hold their credentials directly in digital wallets and present them without contacting the issuer again.</li>
                <li><strong>Decentralized (DIDs):</strong> Uses Decentralized Identifiers instead of traditional usernames or centralized certificates.</li>
              </ul>
            </div>
          )}
        </div>

        {/* Card 2: Role of the Issuer & OID4VCI/OID4VP */}
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
                This application implements modern OpenID Foundation protocols for decentralised identity:
              </p>
              <ul>
                <li><strong>OID4VCI (Issuance):</strong> Generates an <code>openid-credential-offer://</code> URI. Mobile wallets scan the QR code, authenticate with pre-authorized codes, and safely pull the signed VC JWT.</li>
                <li><strong>OID4VP (Verification):</strong> Creates an <code>openid4vp://</code> session. Mobile wallets scan the QR code to submit a Verifiable Presentation directly to our backend via <code>direct_post</code>.</li>
              </ul>
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
        {/* <button 
          className={`button ${activeTab === 'manual' ? '' : 'button-secondary'}`}
          onClick={() => setActiveTab('manual')}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          <FileCheck size={18} /> 3. Direct JWT Verify
        </button> */}
      </nav>

      {/* =================================================================== */}
      {/* TAB 1: OID4VCI CREDENTIAL ISSUANCE                                 */}
      {/* =================================================================== */}
      {activeTab === 'issue' && (
        <main className="grid">
          {/* Form Section */}
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
                  placeholder="did:key:..."
                />
                <span className="hint">The Decentralized Identifier of the user's wallet.</span>
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

          {/* Output Section */}
          <section className="card">
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

                {/* <div className="jwt-box">
                  <div className="jwt-header">
                    <label className="label">Signed VC JWT Token</label>
                    <button onClick={() => copyToClipboard(issueResult.jwt)} className="copy-button">
                      {copiedJwt ? <CheckCircle2 size={16} color="#059669" /> : <Copy size={16} />}
                      {copiedJwt ? 'Copied!' : 'Copy JWT'}
                    </button>
                  </div>
                  <textarea
                    readOnly
                    value={issueResult.jwt}
                    rows={5}
                    className="textarea"
                  />
                </div> */}
              </div>
            )}
          </section>
        </main>
      )}

      {/* =================================================================== */}
      {/* TAB 2: OID4VP VERIFICATION SESSION                                 */}
      {/* =================================================================== */}
      {activeTab === 'oid4vp' && (
        <section className="card">
          <h2 className="card-title">OID4VP Presentation Verification</h2>
          <p className="subtitle" style={{ marginBottom: '20px' }}>
            Request a <code>ProofOfRoleCredential</code> from a user's mobile wallet using the OID4VP standard.
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
            <div className="output-container" style={{ marginTop: '25px' }}>
              <div className="qr-box" style={{ textAlign: 'center' }}>
                <QRCodeSVG value={vpSession.oid4vp_uri} size={220} includeMargin={true} />
                <p className="qr-hint" style={{ marginTop: '10px' }}>Scan with mobile wallet to present VC</p>
              </div>

              <div className="jwt-box">
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
                  <div className="info-card-content" style={{ marginTop: '15px', backgroundColor: '#ECFDF5', padding: '15px', borderRadius: '6px' }}>
                    <h4 style={{ color: '#065F46', display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 10px 0' }}>
                      <CheckCircle2 size={18} /> Verification Successful!
                    </h4>
                    {/* <p><strong>Holder DID:</strong> <code>{vpStatus.holder}</code></p> */}
                    <p style={{ marginTop: '8px' }}><strong>Verified Claims:</strong></p>
                    <pre className="textarea" style={{ height: 'auto', maxHeight: '200px', overflowY: 'auto' }}>
                      {JSON.stringify(vpStatus.credentials, null, 2)}
                    </pre>
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

      {/* =================================================================== */}
      {/* TAB 3: DIRECT JWT VERIFICATION                                     */}
      {/* =================================================================== */}
      {/* {activeTab === 'manual' && (
        <section className="card">
          <h2 className="card-title">Direct JWT Verifiable Credential Inspection</h2>
          <p className="subtitle" style={{ marginBottom: '20px' }}>
            Paste a raw JWT VC token to cryptographically resolve the issuer's <code>did:web</code> and verify the credential signature.
          </p>

          <form onSubmit={handleManualVerify} className="form">
            <div className="field-group">
              <label className="label">Paste Verifiable Credential JWT</label>
              <textarea
                value={rawJwtInput}
                onChange={(e) => setRawJwtInput(e.target.value)}
                required
                rows={6}
                className="textarea"
                placeholder="eyA..."
              />
            </div>

            <button type="submit" disabled={isVerifying} className="button" style={{ maxWidth: '250px' }}>
              {isVerifying ? (
                <>
                  <RefreshCw className="spinner" size={18} />
                  Verifying...
                </>
              ) : (
                'Verify VC JWT'
              )}
            </button>
          </form>

          {verifyError && (
            <div className="error-box" style={{ marginTop: '15px' }}>
              <AlertCircle size={20} color="#DC2626" />
              <span>{verifyError}</span>
            </div>
          )}

          {verifyResult && (
            <div className="info-card-content" style={{ marginTop: '20px', backgroundColor: '#ECFDF5', padding: '15px', borderRadius: '6px' }}>
              <h4 style={{ color: '#065F46', display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 10px 0' }}>
                <CheckCircle2 size={18} /> {verifyResult.status}
              </h4>
              <p><strong>Issuer DID:</strong> <code>{verifyResult.issuer}</code></p>
              <p><strong>Holder DID:</strong> <code>{verifyResult.holder}</code></p>
              <p style={{ marginTop: '8px' }}><strong>Verified Claims:</strong></p>
              <pre className="textarea" style={{ height: 'auto', maxHeight: '180px', overflowY: 'auto' }}>
                {JSON.stringify(verifyResult.claims, null, 2)}
              </pre>
            </div>
          )}
        </section>
      )} */}
    </div>
  );
}