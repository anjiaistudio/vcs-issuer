import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import {
  ShieldCheck, Copy, CheckCircle2, AlertCircle, RefreshCw,
  ChevronDown, ChevronUp, BookOpen, UserCheck, QrCode, Award, Code, ArrowRight
} from 'lucide-react';
import './App.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// --- Credential form configuration (mirrors backend CREDENTIAL_TYPES) ---
const CREDENTIAL_FORM_CONFIG = {
  BiographicCredential: {
    label: 'Biographic Credential',
    fields: [
      { name: 'first_name', label: 'First Name', type: 'text', default: 'Jane' },
      { name: 'middle_name', label: 'Middle Name', type: 'text', default: 'Alice' },
      { name: 'last_name', label: 'Last Name', type: 'text', default: 'Doe' },
      { name: 'date_of_birth', label: 'Date of Birth', type: 'date', default: '1990-04-12' },
      { name: 'verification_method', label: 'Verification Method', type: 'text', default: 'digital_id_check' },
    ],
  },
  DocumentCredential: {
    label: 'Document Credential',
    fields: [
      { name: 'document_type', label: 'Document Type', type: 'text', default: 'drivers_license' },
      { name: 'license_number', label: 'License Number', type: 'text', default: 'DL1234567' },
      { name: 'issuing_state', label: 'Issuing State', type: 'text', default: 'NSW' },
      { name: 'document_expiry_date', label: 'Document Expiry Date', type: 'date', default: '2029-03-01' },
      { name: 'verification_method', label: 'Verification Method', type: 'text', default: 'digital_id_check' },
    ],
  },
  BankingCredential: {
    label: 'Banking Credential',
    fields: [
      { name: 'bsb', label: 'BSB', type: 'text', default: '062-000' },
      { name: 'account_number', label: 'Account Number', type: 'text', default: '12345678' },
      { name: 'account_holder_name', label: 'Account Holder Name', type: 'text', default: 'Jane Doe' },
    ],
  },
  BiometricCredential: {
    label: 'Biometric Credential',
    fields: [
      { name: 'biometric_reference_id', label: 'Biometric Reference ID', type: 'text', default: 'cust_001' },
      { name: 'biometric_verified', label: 'Biometric Verified', type: 'checkbox', default: true },
    ],
  },
};

const CREDENTIAL_TYPE_LIST = Object.keys(CREDENTIAL_FORM_CONFIG);

const USE_CASES = [
  { id: 'account_opening', label: 'Account Opening', description: 'Requests name, DOB, and biometric verification status.' },
  { id: 'autodebit_setup', label: 'Autodebit Setup', description: 'Requests bank details and confirms biometric verification occurred at issuance.' },
  { id: 'age_proofing', label: 'Age Proofing', description: 'Requests only the age-over-21 flag and verification method.' },
];

function defaultClaimsForType(credentialType) {
  const config = CREDENTIAL_FORM_CONFIG[credentialType];
  const claims = {};
  config.fields.forEach((f) => { claims[f.name] = f.default; });
  if (credentialType === 'BiometricCredential') {
    claims.enrolled_at = new Date().toISOString();
    claims.biometric_verification_endpoint = `${API_BASE_URL}/biometric/verify`;
  }
  return claims;
}

export default function App() {
  const [activeTab, setActiveTab] = useState('issue');

  const qrIssueRef = useRef(null);
  const qrVpRef = useRef(null);
  const vpClaimsRef = useRef(null);

  // --- Issuance State ---
  const [subjectDid, setSubjectDid] = useState('did:key:z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwW36xyM');
  const [issueMode, setIssueMode] = useState('single'); // 'single' | 'batch'
  const [selectedType, setSelectedType] = useState('BiographicCredential');
  const [claimsByType, setClaimsByType] = useState(() => {
    const initial = {};
    CREDENTIAL_TYPE_LIST.forEach((t) => { initial[t] = defaultClaimsForType(t); });
    return initial;
  });
  const [selectedBatchTypes, setSelectedBatchTypes] = useState([...CREDENTIAL_TYPE_LIST]);

  const [isIssuing, setIsIssuing] = useState(false);
  const [issueResult, setIssueResult] = useState(null); // single-mode: { oid4vci_uri, ... }
  const [issueError, setIssueError] = useState('');

  // --- Batch wizard state ---
  const [batchOffers, setBatchOffers] = useState(null); // [{ credential_type, oid4vci_uri }, ...]
  const [batchStepIndex, setBatchStepIndex] = useState(0);

  // --- OID4VP Session State ---
  const [selectedUseCase, setSelectedUseCase] = useState('account_opening');
  const [isCreatingVp, setIsCreatingVp] = useState(false);
  const [vpSession, setVpSession] = useState(null);
  const [vpStatus, setVpStatus] = useState(null);
  const [vpError, setVpError] = useState('');
  const [showRawJson, setShowRawJson] = useState(false);

  const [openVcExplain, setOpenVcExplain] = useState(false);
  const [openIssuerExplain, setOpenIssuerExplain] = useState(false);

  useEffect(() => {
    if ((issueResult || batchOffers) && qrIssueRef.current) {
      qrIssueRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [issueResult, batchOffers, batchStepIndex]);

  useEffect(() => {
    if (vpSession && qrVpRef.current) {
      qrVpRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [vpSession]);

  useEffect(() => {
    if (vpStatus?.status === 'verified' && vpClaimsRef.current) {
      vpClaimsRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [vpStatus]);

  const handleClaimChange = (credentialType, fieldName, value) => {
    setClaimsByType((prev) => ({
      ...prev,
      [credentialType]: { ...prev[credentialType], [fieldName]: value }
    }));
  };

  const toggleBatchType = (credentialType) => {
    setSelectedBatchTypes((prev) =>
      prev.includes(credentialType)
        ? prev.filter((t) => t !== credentialType)
        : [...prev, credentialType]
    );
  };

  // ---------------------------------------------------------------------------
  // 1a. SINGLE CREDENTIAL ISSUANCE
  // ---------------------------------------------------------------------------
  const handleIssueSingle = async (e) => {
    e.preventDefault();
    setIsIssuing(true);
    setIssueError('');
    setIssueResult(null);
    setBatchOffers(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/issue`, {
        subject_did: subjectDid,
        credential_type: selectedType,
        claims: claimsByType[selectedType],
      });
      setIssueResult(response.data);
    } catch (err) {
      console.error(err);
      setIssueError(err.response?.data?.detail || 'Failed to issue credential.');
    } finally {
      setIsIssuing(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 1b. BATCH ISSUANCE (WIZARD)
  // ---------------------------------------------------------------------------
  const handleIssueBatch = async (e) => {
    e.preventDefault();
    setIsIssuing(true);
    setIssueError('');
    setIssueResult(null);
    setBatchOffers(null);
    setBatchStepIndex(0);

    try {
      const response = await axios.post(`${API_BASE_URL}/issue/batch`, {
        subject_did: subjectDid,
        credential_types: selectedBatchTypes,
        claims_by_type: Object.fromEntries(
          selectedBatchTypes.map((t) => [t, claimsByType[t]])
        ),
      });
      setBatchOffers(response.data.offers);
    } catch (err) {
      console.error(err);
      setIssueError(err.response?.data?.detail || 'Failed to issue credential batch.');
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
      const response = await axios.post(`${API_BASE_URL}/verify/session`, {
        use_case: selectedUseCase,
      });
      setVpSession(response.data);
    } catch (err) {
      console.error(err);
      setVpError(err.response?.data?.detail || 'Failed to initialize verification session.');
    } finally {
      setIsCreatingVp(false);
    }
  };

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

  // Renders claims grouped by DCQL credential id (e.g. "biographic", "biometric")
  const renderGroupedClaims = (credentialsById) => {
    if (!credentialsById) return null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
        {Object.entries(credentialsById).map(([queryId, claims]) => (
          <div key={queryId}>
            <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#059669', textTransform: 'uppercase', marginBottom: '6px' }}>
              From: {queryId}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              {Object.entries(claims).map(([key, value]) => (
                <div key={key} style={{ backgroundColor: '#FFFFFF', padding: '12px', borderRadius: '8px', border: '1px solid #D1D5DB' }}>
                  <span style={{ fontSize: '12px', textTransform: 'uppercase', color: '#6B7280', fontWeight: 'bold' }}>
                    {key.replace(/_/g, ' ')}
                  </span>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827', marginTop: '4px', wordBreak: 'break-word' }}>
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderClaimFields = (credentialType) => {
    const config = CREDENTIAL_FORM_CONFIG[credentialType];
    return (
      <div className="form" style={{ marginTop: '12px' }}>
        {config.fields.map((field) => (
          <div className="field-group" key={field.name}>
            <label className="label">{field.label}</label>
            {field.type === 'checkbox' ? (
              <input
                type="checkbox"
                checked={!!claimsByType[credentialType][field.name]}
                onChange={(e) => handleClaimChange(credentialType, field.name, e.target.checked)}
              />
            ) : (
              <input
                type={field.type}
                className="input"
                value={claimsByType[credentialType][field.name] || ''}
                onChange={(e) => handleClaimChange(credentialType, field.name, e.target.value)}
                required
              />
            )}
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
          Issue & Verify SD-JWT Credentials using <code>OID4VCI</code> & <code>OID4VP</code>
        </p>
      </header>

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

      {/* TAB 1: ISSUANCE */}
      {activeTab === 'issue' && (
        <main className="grid">
          <section className="card">
            <h2 className="card-title">1. Credential Details</h2>

            <div className="field-group" style={{ marginBottom: '16px' }}>
              <label className="label">Holder (Recipient) DID</label>
              <input
                type="text"
                className="input"
                value={subjectDid}
                onChange={(e) => setSubjectDid(e.target.value)}
                required
              />
              <span className="hint">Placeholder only — real holder key is bound via wallet proof at import time.</span>
            </div>

            <div className="field-group" style={{ marginBottom: '16px' }}>
              <label className="label">Issuance Mode</label>
              <select
                className="input"
                value={issueMode}
                onChange={(e) => setIssueMode(e.target.value)}
              >
                <option value="single">Single Credential</option>
                <option value="batch">All Credentials (Batch Wizard)</option>
              </select>
            </div>

            {issueMode === 'single' ? (
              <form onSubmit={handleIssueSingle} className="form">
                <div className="field-group">
                  <label className="label">Credential Type</label>
                  <select
                    className="input"
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                  >
                    {CREDENTIAL_TYPE_LIST.map((t) => (
                      <option key={t} value={t}>{CREDENTIAL_FORM_CONFIG[t].label}</option>
                    ))}
                  </select>
                </div>

                {renderClaimFields(selectedType)}

                <button type="submit" disabled={isIssuing} className="button">
                  {isIssuing ? (<><RefreshCw className="spinner" size={18} /> Signing Credential...</>) : 'Issue Verifiable Credential'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleIssueBatch} className="form">
                <div className="field-group">
                  <label className="label">Credentials to Include</label>
                  {CREDENTIAL_TYPE_LIST.map((t) => (
                    <label key={t} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <input
                        type="checkbox"
                        checked={selectedBatchTypes.includes(t)}
                        onChange={() => toggleBatchType(t)}
                      />
                      {CREDENTIAL_FORM_CONFIG[t].label}
                    </label>
                  ))}
                </div>

                {selectedBatchTypes.map((t) => (
                  <div key={t} style={{ borderTop: '1px solid #f3f4f6', paddingTop: '12px' }}>
                    <p className="label">{CREDENTIAL_FORM_CONFIG[t].label}</p>
                    {renderClaimFields(t)}
                  </div>
                ))}

                <button type="submit" disabled={isIssuing || selectedBatchTypes.length === 0} className="button">
                  {isIssuing ? (<><RefreshCw className="spinner" size={18} /> Preparing Offers...</>) : 'Issue All Selected Credentials'}
                </button>
              </form>
            )}

            {issueError && (
              <div className="error-box">
                <AlertCircle size={20} color="#DC2626" />
                <span>{issueError}</span>
              </div>
            )}
          </section>

          <section className="card" ref={qrIssueRef}>
            <h2 className="card-title">2. Scan with Mobile Wallet</h2>

            {!issueResult && !batchOffers && (
              <div className="empty-state">
                <ShieldCheck size={48} color="#D1D5DB" />
                <p>Fill out claim details and issue a credential to generate the OID4VCI QR offer.</p>
              </div>
            )}

            {issueResult && (
              <div className="output-container">
                <div className="qr-box" style={{ textAlign: 'center' }}>
                  <QRCodeSVG value={issueResult.oid4vci_uri} size={200} includeMargin={true} />
                  <p className="qr-hint" style={{ marginTop: '10px' }}>Scan with your wallet's built-in QR scanner</p>
                </div>
              </div>
            )}

            {batchOffers && (
              <div className="output-container">
                <p className="hint">Step {batchStepIndex + 1} of {batchOffers.length}</p>
                <div className="qr-box" style={{ textAlign: 'center' }}>
                  <p style={{ fontWeight: 600, marginBottom: '10px' }}>
                    {CREDENTIAL_FORM_CONFIG[batchOffers[batchStepIndex].credential_type]?.label || batchOffers[batchStepIndex].credential_type}
                  </p>
                  <QRCodeSVG value={batchOffers[batchStepIndex].oid4vci_uri} size={200} includeMargin={true} />
                  <p className="qr-hint" style={{ marginTop: '10px' }}>Scan this credential, then confirm import in your wallet</p>
                </div>

                <button
                  className="button"
                  disabled={batchStepIndex >= batchOffers.length - 1}
                  onClick={() => setBatchStepIndex((i) => Math.min(i + 1, batchOffers.length - 1))}
                  style={{ maxWidth: '260px', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  {batchStepIndex >= batchOffers.length - 1
                    ? 'All Credentials Issued'
                    : (<>I've added this credential — Next <ArrowRight size={16} /></>)}
                </button>
              </div>
            )}
          </section>
        </main>
      )}

      {/* TAB 2: VERIFICATION */}
      {activeTab === 'oid4vp' && (
        <section className="card">
          <h2 className="card-title">OID4VP Presentation Verification</h2>

          <div className="field-group" style={{ marginBottom: '16px', maxWidth: '400px' }}>
            <label className="label">Use Case</label>
            <select
              className="input"
              value={selectedUseCase}
              onChange={(e) => setSelectedUseCase(e.target.value)}
            >
              {USE_CASES.map((uc) => (
                <option key={uc.id} value={uc.id}>{uc.label}</option>
              ))}
            </select>
            <span className="hint">{USE_CASES.find((uc) => uc.id === selectedUseCase)?.description}</span>
          </div>

          <button onClick={startVerificationSession} disabled={isCreatingVp} className="button" style={{ maxWidth: '300px' }}>
            {isCreatingVp ? (<><RefreshCw className="spinner" size={18} /> Initializing Session...</>) : 'Create Verification Session'}
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
                <p className="qr-hint" style={{ marginTop: '10px' }}>Scan with your wallet's built-in QR scanner</p>
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
                    {renderGroupedClaims(vpStatus.credentials)}

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
                    <span>Presentation verification failed, signature invalid, or a credential's status is not valid.</span>
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