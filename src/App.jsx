import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import {
  ShieldCheck, AlertCircle, RefreshCw, QrCode, Award, Code, ArrowRight,
  Upload, CheckCircle, Camera, Trash2, FileText, Lock, User, UserCheck,
  CreditCard, Landmark, Fingerprint, FileBadge, ShieldOff
} from 'lucide-react';
import './App.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Grouped field structures for organized visual presentation
const CREDENTIAL_SECTIONS = {
  BiographicCredential: [
    {
      title: 'Personal Details',
      icon: User,
      themeColor: '#4F46E5', // Indigo
      lightBg: '#EEF2FF',
      borderColor: '#C7D2FE',
      fields: [
        { name: 'first_name', label: 'First Name', type: 'text', default: 'Jane' },
        { name: 'middle_name', label: 'Middle Name', type: 'text', default: 'Alice' },
        { name: 'last_name', label: 'Last Name', type: 'text', default: 'Doe' },
        { name: 'date_of_birth', label: 'Date of Birth', type: 'date', default: '1990-04-12' },
        { name: 'verification_method', label: 'Verification Method', type: 'text', default: 'digital_id_check' },
      ],
    }
  ],
  DocumentCredential: [
    {
      title: 'Document Details',
      icon: FileBadge,
      themeColor: '#D97706', // Amber
      lightBg: '#FFFBEB',
      borderColor: '#FDE68A',
      fields: [
        { name: 'document_type', label: 'Document Type', type: 'text', default: 'drivers_license' },
        { name: 'license_number', label: 'License Number', type: 'text', default: 'DL1234567' },
        { name: 'issuing_state', label: 'Issuing State', type: 'text', default: 'NSW' },
        { name: 'document_expiry_date', label: 'Document Expiry Date', type: 'date', default: '2029-03-01' },
        { name: 'verification_method', label: 'Verification Method', type: 'text', default: 'digital_id_check' },
      ],
    }
  ],
  BankingCredential: [
    {
      title: 'Bank Account Details',
      icon: Landmark,
      themeColor: '#059669', // Emerald
      lightBg: '#ECFDF5',
      borderColor: '#A7F3D0',
      fields: [
        { name: 'bsb', label: 'BSB', type: 'text', default: '062-000' },
        { name: 'account_number', label: 'Account Number', type: 'text', default: '12345678' },
        { name: 'account_holder_name', label: 'Account Holder Name', type: 'text', default: 'Jane Doe' },
      ],
    }
  ],
  BiometricCredential: [
    {
      title: 'Biometric Details',
      icon: Fingerprint,
      themeColor: '#7C3AED', // Violet
      lightBg: '#F5F3FF',
      borderColor: '#DDD6FE',
      fields: [
        { name: 'biometric_reference_id', label: 'Biometric Reference ID', type: 'text', default: 'cust_001' },
        { name: 'biometric_verified', label: 'Biometric Verified', type: 'checkbox', default: true },
      ],
    }
  ],
  ConsolidatedCredential: [
    {
      title: 'Personal Details',
      icon: User,
      themeColor: '#4F46E5',
      lightBg: '#EEF2FF',
      borderColor: '#C7D2FE',
      fields: [
        { name: 'first_name', label: 'First Name', type: 'text', default: 'Jane' },
        { name: 'middle_name', label: 'Middle Name', type: 'text', default: 'Alice' },
        { name: 'last_name', label: 'Last Name', type: 'text', default: 'Doe' },
        { name: 'date_of_birth', label: 'Date of Birth', type: 'date', default: '1990-04-12' },
        { name: 'verification_method', label: 'Verification Method', type: 'text', default: 'digital_id_check' },
      ],
    },
    {
      title: 'Document Details',
      icon: FileBadge,
      themeColor: '#D97706',
      lightBg: '#FFFBEB',
      borderColor: '#FDE68A',
      fields: [
        { name: 'document_type', label: 'Document Type', type: 'text', default: 'drivers_license' },
        { name: 'license_number', label: 'License Number', type: 'text', default: 'DL1234567' },
        { name: 'issuing_state', label: 'Issuing State', type: 'text', default: 'NSW' },
        { name: 'document_expiry_date', label: 'Document Expiry Date', type: 'date', default: '2029-03-01' },
      ],
    },
    {
      title: 'Bank Account Details',
      icon: Landmark,
      themeColor: '#059669',
      lightBg: '#ECFDF5',
      borderColor: '#A7F3D0',
      fields: [
        { name: 'bsb', label: 'BSB', type: 'text', default: '062-000' },
        { name: 'account_number', label: 'Account Number', type: 'text', default: '12345678' },
        { name: 'account_holder_name', label: 'Account Holder Name', type: 'text', default: 'Jane Doe' },
      ],
    },
    {
      title: 'Biometric Details',
      icon: Fingerprint,
      themeColor: '#7C3AED',
      lightBg: '#F5F3FF',
      borderColor: '#DDD6FE',
      fields: [
        { name: 'biometric_reference_id', label: 'Biometric Reference ID', type: 'text', default: 'cust_001' },
        { name: 'biometric_verified', label: 'Biometric Verified', type: 'checkbox', default: true },
      ],
    }
  ],
};

const CREDENTIAL_TYPE_LABELS = {
  BiographicCredential: 'Biographic Credential',
  DocumentCredential: 'Document Credential',
  BankingCredential: 'Banking Credential',
  BiometricCredential: 'Biometric Credential',
  ConsolidatedCredential: 'Consolidated Credential (All-in-One)',
};

const CREDENTIAL_TYPE_LIST = Object.keys(CREDENTIAL_SECTIONS);

const USE_CASES = [
  { id: 'account_opening', label: 'Account Opening', description: 'Requests name, DOB, and biometric verification status.' },
  { id: 'autodebit_setup', label: 'Autodebit Setup', description: 'Requests bank details and confirms biometric verification occurred at issuance.' },
  { id: 'age_proofing', label: 'Age Proofing', description: 'Requests only the age-over-21 flag and verification method.' },
];

function defaultClaimsForType(credentialType) {
  const sections = CREDENTIAL_SECTIONS[credentialType];
  const claims = {};
  sections.forEach((sec) => {
    sec.fields.forEach((f) => { claims[f.name] = f.default; });
  });
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
  const fileInputRef = useRef(null);

  // --- Issuance State ---
  const [subjectDid, setSubjectDid] = useState('did:key:z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwW36xyM');
  const [issueMode, setIssueMode] = useState('single');
  const [selectedType, setSelectedType] = useState('ConsolidatedCredential');
  const [claimsByType, setClaimsByType] = useState(() => {
    const initial = {};
    CREDENTIAL_TYPE_LIST.forEach((t) => { initial[t] = defaultClaimsForType(t); });
    return initial;
  });
  const [selectedBatchTypes, setSelectedBatchTypes] = useState([...CREDENTIAL_TYPE_LIST]);

  const [isIssuing, setIsIssuing] = useState(false);
  const [issueResult, setIssueResult] = useState(null);
  const [issueError, setIssueError] = useState('');

  // --- Batch wizard state ---
  const [batchOffers, setBatchOffers] = useState(null);
  const [batchStepIndex, setBatchStepIndex] = useState(0);

  // --- Biometric state ---
  const [biometricEnabled, setBiometricEnabled] = useState(true);
  const [selfieFile, setSelfieFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollResult, setEnrollResult] = useState(null);
  const [enrollError, setEnrollError] = useState('');

  // --- Biometric verification (post-DCQL) state ---
  const [verifySelfieFile, setVerifySelfieFile] = useState(null);
  const [verifyPreviewUrl, setVerifyPreviewUrl] = useState(null);
  const [isVerifyingBiometric, setIsVerifyingBiometric] = useState(false);
  const [biometricVerifyResult, setBiometricVerifyResult] = useState(null); // { match: boolean, distance, ... }
  const [biometricVerifyError, setBiometricVerifyError] = useState('');
  const verifyFileInputRef = useRef(null);

  // --- DC-API State ---
  const [dcApiResult, setDcApiResult] = useState(null);
  const [dcApiError, setDcApiError] = useState('');
  const [isDcApiLoading, setIsDcApiLoading] = useState(false);

  // --- Status Update State ---
  const [statusCredentialType, setStatusCredentialType] = useState('ConsolidatedCredential');
  const [statusIdx, setStatusIdx] = useState('');
  const [statusValue, setStatusValue] = useState('suspended');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusUpdateResult, setStatusUpdateResult] = useState(null);
  const [statusUpdateError, setStatusUpdateError] = useState('');

  // --- OID4VP Session State ---
  const [selectedUseCase, setSelectedUseCase] = useState('account_opening');
  const [isCreatingVp, setIsCreatingVp] = useState(false);
  const [vpSession, setVpSession] = useState(null);
  const [vpStatus, setVpStatus] = useState(null);
  const [vpError, setVpError] = useState('');
  const [showRawJson, setShowRawJson] = useState(false);
  const [credentialMode, setCredentialMode] = useState('consolidated');

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

  const handleFileSelect = (file) => {
    if (!file) return;
    setSelfieFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setEnrollResult(null);
    setEnrollError('');
  };

  const clearFile = () => {
    setSelfieFile(null);
    setPreviewUrl(null);
    setEnrollResult(null);
    setEnrollError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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

  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handleEnrollBiometric = async () => {
    if (!selfieFile) return;
    setIsEnrolling(true);
    setEnrollError('');
    setEnrollResult(null);

    try {
      const selfie_image_b64 = await fileToBase64(selfieFile);
      const referenceId =
        claimsByType[selectedType]?.biometric_reference_id ||
        claimsByType.BiometricCredential?.biometric_reference_id ||
        'cust_001';

      const response = await axios.post(`${API_BASE_URL}/biometric/enroll`, {
        biometric_reference_id: referenceId,
        selfie_image_b64,
      });
      setEnrollResult(response.data);
    } catch (err) {
      setEnrollError(err.response?.data?.detail || 'Biometric enrollment failed.');
    } finally {
      setIsEnrolling(false);
    }
  };

  // Works whether claims came back as { biometric: {...} } (separate mode)
// or { consolidated: {...} } (consolidated mode) — just scans all
// disclosed credential groups for the field.
  const extractBiometricReferenceId = (credentialsById) => {
    if (!credentialsById) return null;
    for (const claims of Object.values(credentialsById)) {
      if (claims && claims.biometric_reference_id) {
        return claims.biometric_reference_id;
      }
    }
    return null;
  };

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
  const handleVerifySelfieSelect = (file) => {
    if (!file) return;
    setVerifySelfieFile(file);
    setVerifyPreviewUrl(URL.createObjectURL(file));
    setBiometricVerifyResult(null);
    setBiometricVerifyError('');
  };

  const clearVerifySelfie = () => {
    setVerifySelfieFile(null);
    setVerifyPreviewUrl(null);
    setBiometricVerifyResult(null);
    setBiometricVerifyError('');
    if (verifyFileInputRef.current) verifyFileInputRef.current.value = '';
  };

  const handleVerifyBiometric = async () => {
    const referenceId = extractBiometricReferenceId(vpStatus?.credentials);
    if (!verifySelfieFile || !referenceId) return;

    setIsVerifyingBiometric(true);
    setBiometricVerifyError('');
    setBiometricVerifyResult(null);

    try {
      const selfie_image_b64 = await fileToBase64(verifySelfieFile);
      const response = await axios.post(`${API_BASE_URL}/biometric/verify`, {
        biometric_reference_id: referenceId,
        selfie_image_b64,
      });
      setBiometricVerifyResult(response.data);
    } catch (err) {
      setBiometricVerifyError(err.response?.data?.detail || 'Biometric verification failed.');
    } finally {
      setIsVerifyingBiometric(false);
    }
  };
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

  const startVerificationSession = async () => {
    setIsCreatingVp(true);
    setVpError('');
    setVpSession(null);
    setVpStatus(null);
    setVerifySelfieFile(null);
    setVerifyPreviewUrl(null);
    setBiometricVerifyResult(null);
    setBiometricVerifyError('');

    try {
      const response = await axios.post(`${API_BASE_URL}/verify/session`, {
        use_case: selectedUseCase,
        credential_mode: credentialMode,
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

  const renderGroupedClaims = (credentialsById) => {
    if (!credentialsById) return null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '14px' }}>
        {Object.entries(credentialsById).map(([queryId, claims]) => (
          <div key={queryId} style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '16px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <p style={{ fontSize: '12px', fontWeight: '800', color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
              From: {queryId}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              {Object.entries(claims).map(([key, value]) => (
                <div key={key} style={{ backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748B', fontWeight: '700', letterSpacing: '0.025em' }}>
                    {key.replace(/_/g, ' ')}
                  </span>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#0F172A', marginTop: '4px', wordBreak: 'break-word' }}>
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

  // Modernized Categorized Claims UI
  const renderCategorizedClaims = (credentialType) => {
    const sections = CREDENTIAL_SECTIONS[credentialType];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {sections.map((section, idx) => {
          const SectionIcon = section.icon;
          return (
            <div
              key={idx}
              style={{
                backgroundColor: '#FFFFFF',
                border: `1.5px solid ${section.borderColor}`,
                borderRadius: '12px',
                padding: '18px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '16px',
                  paddingBottom: '10px',
                  borderBottom: `1px solid ${section.borderColor}`
                }}
              >
                <div style={{ backgroundColor: section.lightBg, padding: '6px', borderRadius: '8px' }}>
                  <SectionIcon size={20} color={section.themeColor} />
                </div>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0F172A', letterSpacing: '-0.01em' }}>
                  {section.title}
                </h4>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                {section.fields.map((field) => (
                  <div key={field.name} style={{ minWidth: 0, gridColumn: field.type === 'checkbox' ? '1 / -1' : 'auto' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                      {field.label}
                    </label>
                    {field.type === 'checkbox' ? (
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', color: '#0F172A', backgroundColor: section.lightBg, padding: '10px 14px', borderRadius: '8px', border: `1px solid ${section.borderColor}` }}>
                        <input
                          type="checkbox"
                          style={{ width: '18px', height: '18px', accentColor: section.themeColor, cursor: 'pointer' }}
                          checked={!!claimsByType[credentialType][field.name]}
                          onChange={(e) => handleClaimChange(credentialType, field.name, e.target.checked)}
                        />
                        Verified Status Active
                      </label>
                    ) : (
                      <input
                        type={field.type}
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          backgroundColor: '#FFFFFF',
                          fontSize: '14px',
                          fontWeight: '500',
                          color: '#0F172A',
                          outline: 'none',
                          transition: 'border-color 0.15s ease'
                        }}
                        value={claimsByType[credentialType][field.name] || ''}
                        onChange={(e) => handleClaimChange(credentialType, field.name, e.target.value)}
                        required
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    setIsUpdatingStatus(true);
    setStatusUpdateError('');
    setStatusUpdateResult(null);
    try {
      const response = await axios.post(`${API_BASE_URL}/status/update`, {
        credential_type: statusCredentialType,
        idx: parseInt(statusIdx, 10),
        status: statusValue,
      });
      setStatusUpdateResult(response.data);
    } catch (err) {
      setStatusUpdateError(err.response?.data?.detail || 'Failed to update credential status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const testDcApi = async () => {
    setIsDcApiLoading(true);
    setDcApiError('');
    setDcApiResult(null);

    const dcqlQuery = {
      credentials: [
        {
          id: 'biographic',
          format: 'dc+sd-jwt',
          meta: { vct_values: ['https://vcs-backend-wvbx.onrender.com/credentials/BiographicCredential'] },
          claims: [{ path: ['first_name'] }, { path: ['age_over_21'] }]
        }
      ]
    };

    const presentationRequest = {
      response_type: 'vp_token',
      response_mode: 'dc_api',
      client_id: `web-origin:${window.location.origin}`,
      nonce: crypto.randomUUID(),
      // response_uri: `${API_BASE_URL}/verify/dc-api-response`,
      client_metadata: {
              vp_formats: {
                "dc+sd-jwt": { "sd-jwt_alg_values": ["EdDSA"], "kb-jwt_alg_values": ["EdDSA"] }
              }
            },
      dcql_query: dcqlQuery,
    };

    try {
      const response = await navigator.credentials.get({
        digital: { requests: [{ protocol: 'openid4vp-v1-unsigned', data: presentationRequest }] }
      });
      console.log('DC API response:', response);
      setDcApiResult(response);
    } catch (err) {
      console.error('DC API error:', err);
      setDcApiError(err.message || 'DC API request failed.');
    } finally {
      setIsDcApiLoading(false);
    }
  };

  const renderBiometricSection = () => (
    <div style={{ marginTop: '20px' }}>
      <div style={{ backgroundColor: '#FFFFFF', border: '1.5px solid #DDD6FE', borderRadius: '12px', padding: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid #DDD6FE', paddingBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ backgroundColor: '#F5F3FF', padding: '6px', borderRadius: '8px' }}>
              <Camera size={20} color="#7C3AED" />
            </div>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0F172A' }}>
              Biometric Enrollment (Selfie Photo)
            </h4>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#475569' }}>
            <input
              type="checkbox"
              style={{ width: '16px', height: '16px', accentColor: '#7C3AED' }}
              checked={biometricEnabled}
              onChange={(e) => setBiometricEnabled(e.target.checked)}
            />
            Enable Enrollment
          </label>
        </div>

        {biometricEnabled && (
          <div>
            {!previewUrl ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed #A78BFA',
                  backgroundColor: '#F5F3FF',
                  borderRadius: '10px',
                  padding: '24px 16px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <Upload size={32} color="#7C3AED" style={{ marginBottom: '8px' }} />
                <p style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#5B21B6' }}>
                  Click to upload face selfie
                </p>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6B7280' }}>
                  JPG, PNG, or WEBP formats supported
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => handleFileSelect(e.target.files[0])}
                />
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <img
                  src={previewUrl}
                  alt="Selfie preview"
                  style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#0F172A' }}>
                    {selfieFile?.name}
                  </p>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                    {(selfieFile?.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearFile}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: '#EF4444' }}
                  title="Remove image"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '14px' }}>
              <button
                type="button"
                onClick={handleEnrollBiometric}
                disabled={!selfieFile || isEnrolling}
                style={{
                  padding: '10px 16px',
                  fontSize: '13px',
                  fontWeight: '700',
                  backgroundColor: !selfieFile || isEnrolling ? '#94A3B8' : '#7C3AED',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: !selfieFile || isEnrolling ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}
              >
                {isEnrolling ? <RefreshCw className="spinner" size={16} /> : <UserCheck size={16} />}
                {isEnrolling ? 'Enrolling...' : 'Enroll Face Profile'}
              </button>

              {enrollResult && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#059669', fontSize: '13px', fontWeight: '700' }}>
                  <CheckCircle size={18} /> Biometrics Registered Successfully
                </div>
              )}
            </div>

            {enrollError && (
              <div style={{ marginTop: '10px', padding: '10px', fontSize: '13px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} />
                <span>{enrollError}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="container" style={{ maxWidth: '1320px', margin: '0 auto', padding: '28px 24px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <header style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', backgroundColor: '#EEF2FF', borderRadius: '16px', color: '#4F46E5', marginBottom: '12px', boxShadow: '0 2px 6px rgba(79, 70, 229, 0.15)' }}>
          <ShieldCheck size={32} />
        </div>
        <h1 className="vcs-title" style={{ fontSize: '30px', fontWeight: '800', color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>VCS Issuer & Verifier Studio</h1>
        <p className="vcs-subtitle" style={{ fontSize: '15px', color: '#475569', marginTop: '6px' }}>
          Standards-compliant SD-JWT credentials with <code>OID4VCI</code> & <code>OID4VP</code>
        </p>
      </header>

      {/* Main Navigation Tabs */}
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
              <button
                className={`button ${activeTab === 'dcapi' ? '' : 'button-secondary'}`}
                onClick={() => setActiveTab('dcapi')}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Fingerprint size={18} /> 3. DC-API
              </button>
              <button
                className={`button ${activeTab === 'status' ? '' : 'button-secondary'}`}
                onClick={() => setActiveTab('status')}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <ShieldOff size={18} /> 4. Status Management
              </button>
            </nav>
      {/* <nav style={{ display: 'flex', gap: '10px', marginBottom: '24px', backgroundColor: '#4F46E5', padding: '6px', borderRadius: '12px' }}>
        <button
          onClick={() => setActiveTab('issue')}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '8px',
            border: 'none',
            fontWeight: '700',
            fontSize: '15px',
            cursor: 'pointer',
            backgroundColor: activeTab === 'issue' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'issue' ? '#4F46E5' : '#64748B',
            boxShadow: activeTab === 'issue' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <Award size={20} /> 1. Issue Credential (OID4VCI)
        </button>
        <button
          onClick={() => setActiveTab('oid4vp')}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '8px',
            border: 'none',
            fontWeight: '700',
            fontSize: '15px',
            cursor: 'pointer',
            backgroundColor: activeTab === 'oid4vp' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'oid4vp' ? '#4F46E5' : '#64748B',
            boxShadow: activeTab === 'oid4vp' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <QrCode size={20} /> 2. OID4VP Presentation
        </button>
      </nav> */}

      {/* TAB 1: ISSUANCE */}
      {activeTab === 'issue' && (
        <main className="issue-grid">
          {/* Column 1: Config Form */}
          <section style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.03)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A', marginTop: 0, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileText size={22} color="#4F46E5" /> 1. Credential Configuration
            </h2>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '6px' }}>
                Holder (Recipient) DID
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', paddingLeft: '36px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', fontFamily: 'monospace', color: '#0F172A', fontWeight: '500' }}
                  value={subjectDid}
                  onChange={(e) => setSubjectDid(e.target.value)}
                  required
                />
                <Lock size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '6px' }}>
                Issuance Mode
              </label>
              <select
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', fontWeight: '600', backgroundColor: '#FFFFFF', color: '#0F172A' }}
                value={issueMode}
                onChange={(e) => setIssueMode(e.target.value)}
              >
                <option value="single">Single Credential Issuance</option>
                <option value="batch">All Credentials (Batch Issuance Wizard)</option>
              </select>
            </div>

            {/* SINGLE MODE */}
            {issueMode === 'single' ? (
              <form onSubmit={handleIssueSingle}>
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Select Credential Type
                  </label>
                  <select
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', fontWeight: '600', backgroundColor: '#FFFFFF', color: '#0F172A' }}
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                  >
                    {CREDENTIAL_TYPE_LIST.map((t) => (
                      <option key={t} value={t}>{CREDENTIAL_TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </div>

                {renderCategorizedClaims(selectedType)}

                {(selectedType === 'BiometricCredential' || selectedType === 'ConsolidatedCredential') && renderBiometricSection()}

                <button
                  type="submit"
                  disabled={isIssuing}
                  style={{
                    width: '100%',
                    marginTop: '20px',
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: '#4F46E5',
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: '700',
                    fontSize: '15px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)'
                  }}
                >
                  {isIssuing ? (<><RefreshCw className="spinner" size={18} /> Signing Credential...</>) : 'Issue Verifiable Credential'}
                </button>
              </form>
            ) : (
              /* BATCH MODE */
              <form onSubmit={handleIssueBatch}>
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '8px' }}>
                    Credentials Included in Batch
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                    {CREDENTIAL_TYPE_LIST.map((t) => (
                      <label key={t} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                        <input
                          type="checkbox"
                          style={{ accentColor: '#4F46E5', width: '16px', height: '16px' }}
                          checked={selectedBatchTypes.includes(t)}
                          onChange={() => toggleBatchType(t)}
                        />
                        {CREDENTIAL_TYPE_LABELS[t]}
                      </label>
                    ))}
                  </div>
                </div>

                {selectedBatchTypes.map((t) => (
                  <div key={t} style={{ marginBottom: '16px' }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '800', color: '#0F172A' }}>{CREDENTIAL_TYPE_LABELS[t]}</p>
                    {renderCategorizedClaims(t)}
                  </div>
                ))}

                {(selectedBatchTypes.includes('BiometricCredential') || selectedBatchTypes.includes('ConsolidatedCredential')) && renderBiometricSection()}

                <button
                  type="submit"
                  disabled={isIssuing || selectedBatchTypes.length === 0}
                  style={{
                    width: '100%',
                    marginTop: '20px',
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: '#4F46E5',
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: '700',
                    fontSize: '15px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)'
                  }}
                >
                  {isIssuing ? (<><RefreshCw className="spinner" size={18} /> Preparing Offers...</>) : 'Issue All Selected Credentials'}
                </button>
              </form>
            )}

            {issueError && (
              <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', color: '#991B1B', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '500' }}>
                <AlertCircle size={18} color="#DC2626" />
                <span>{issueError}</span>
              </div>
            )}
          </section>

          {/* Column 2: Mobile Wallet Scanner (Adjacent to Form) */}
          <section ref={qrIssueRef} style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.03)', position: 'sticky', top: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A', marginTop: 0, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <QrCode size={22} color="#4F46E5" /> 2. Mobile Wallet Scanner
            </h2>

            {!issueResult && !batchOffers && (
              <div style={{ padding: '48px 20px', textAlign: 'center', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '2px dashed #CBD5E1' }}>
                <ShieldCheck size={48} color="#94A3B8" style={{ marginBottom: '12px' }} />
                <p style={{ margin: 0, fontSize: '14px', color: '#64748B', fontWeight: '600' }}>
                  Complete field configuration and click issue to render the wallet QR offer.
                </p>
              </div>
            )}

            {issueResult && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ padding: '20px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)', textAlign: 'center' }}>
                  <QRCodeSVG value={issueResult.oid4vci_uri} size={210} includeMargin={true} />
                  <p style={{ marginTop: '12px', marginBottom: 0, fontSize: '13px', fontWeight: '700', color: '#334155' }}>
                    Scan with your mobile wallet app
                  </p>
                </div>
              </div>
            )}

            {batchOffers && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ backgroundColor: '#EEF2FF', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '800', color: '#4F46E5', marginBottom: '14px' }}>
                  Step {batchStepIndex + 1} of {batchOffers.length}
                </div>

                <div style={{ padding: '20px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)', textAlign: 'center', width: '100%', boxSizing: 'border-box' }}>
                  <p style={{ fontWeight: '800', fontSize: '15px', color: '#0F172A', marginBottom: '12px' }}>
                    {CREDENTIAL_TYPE_LABELS[batchOffers[batchStepIndex].credential_type] || batchOffers[batchStepIndex].credential_type}
                  </p>
                  <QRCodeSVG value={batchOffers[batchStepIndex].oid4vci_uri} size={200} includeMargin={true} />
                  <p style={{ marginTop: '12px', marginBottom: 0, fontSize: '12px', color: '#64748B', fontWeight: '500' }}>
                    Scan this QR code, then accept offer in wallet
                  </p>
                </div>

                <button
                  disabled={batchStepIndex >= batchOffers.length - 1}
                  onClick={() => setBatchStepIndex((i) => Math.min(i + 1, batchOffers.length - 1))}
                  style={{
                    marginTop: '20px',
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: batchStepIndex >= batchOffers.length - 1 ? '#94A3B8' : '#10B981',
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: '700',
                    fontSize: '14px',
                    cursor: batchStepIndex >= batchOffers.length - 1 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {batchStepIndex >= batchOffers.length - 1
                    ? 'All Credentials Issued'
                    : (<>Next Credential <ArrowRight size={16} /></>)}
                </button>
              </div>
            )}
          </section>
        </main>
      )}

      {/* TAB 2: VERIFICATION */}
      {activeTab === 'oid4vp' && (
        <section style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.03)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0F172A', marginTop: 0, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <QrCode size={22} color="#4F46E5" /> OID4VP Presentation Verification
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px', marginBottom: '20px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '6px' }}>
                Credential Architecture
              </label>
              <select
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', fontWeight: '600', color: '#0F172A' }}
                value={credentialMode}
                onChange={(e) => setCredentialMode(e.target.value)}
              >
                <option value="separate">Separate Credentials (4 independent VCs)</option>
                <option value="consolidated">Consolidated Credential (1 grouped VC)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '6px' }}>
                Verification Use Case
              </label>
              <select
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', fontWeight: '600', color: '#0F172A' }}
                value={selectedUseCase}
                onChange={(e) => setSelectedUseCase(e.target.value)}
              >
                {USE_CASES.map((uc) => (
                  <option key={uc.id} value={uc.id}>{uc.label}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={startVerificationSession}
            disabled={isCreatingVp}
            style={{
              padding: '12px 20px',
              borderRadius: '8px',
              backgroundColor: '#4F46E5',
              color: '#FFFFFF',
              border: 'none',
              fontWeight: '700',
              fontSize: '15px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)'
            }}
          >
            {isCreatingVp ? (<><RefreshCw className="spinner" size={18} /> Initializing...</>) : 'Create Verification Session'}
          </button>

          {vpError && (
            <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', color: '#991B1B', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
              <AlertCircle size={18} color="#DC2626" />
              <span>{vpError}</span>
            </div>
          )}

          {vpSession && (
            <div style={{ marginTop: '24px', borderTop: '1px solid #E2E8F0', paddingTop: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '24px' }} ref={qrVpRef}>
              <div style={{ padding: '20px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
                <QRCodeSVG value={vpSession.oid4vp_uri} size={210} includeMargin={true} />
                <p style={{ marginTop: '12px', marginBottom: 0, fontSize: '13px', color: '#64748B', fontWeight: '600' }}>
                  Scan with your wallet scanner to authorize sharing
                </p>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
                  <p style={{ margin: 0, fontSize: '13px', color: '#475569' }}>
                    <strong>Session ID:</strong> <code style={{ backgroundColor: '#E2E8F0', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>{vpSession.session_id}</code>
                  </p>
                  <p style={{ marginTop: '8px', marginBottom: 0, fontSize: '14px' }}>
                    <strong>Verification Status: </strong>
                    <span style={{
                      fontWeight: '800',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      backgroundColor: vpStatus?.status === 'verified' ? '#D1FAE5' : vpStatus?.status === 'failed' ? '#FEE2E2' : '#FEF3C7',
                      color: vpStatus?.status === 'verified' ? '#065F46' : vpStatus?.status === 'failed' ? '#991B1B' : '#92400E'
                    }}>
                      {vpStatus?.status?.toUpperCase() || 'PENDING (WAITING FOR SCAN)'}
                    </span>
                  </p>
                </div>

                {vpStatus?.status === 'verified' && (
                  <div ref={vpClaimsRef} style={{ backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', padding: '18px', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ color: '#065F46', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '16px', fontWeight: '800' }}>
                        <CheckCircle size={20} color="#059669" /> Presentation Verified!
                      </h3>
                      <button
                        onClick={() => setShowRawJson(!showRawJson)}
                        style={{ background: 'none', border: 'none', color: '#047857', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '800' }}
                      >
                        <Code size={16} /> {showRawJson ? 'Hide Raw JSON' : 'Show Raw JSON'}
                      </button>
                    </div>

                    {renderGroupedClaims(vpStatus.credentials)}
                    {selectedUseCase === 'account_opening' && extractBiometricReferenceId(vpStatus.credentials) && (
                      <div style={{ marginTop: '18px', paddingTop: '18px', borderTop: '1px solid #A7F3D0' }}>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '800', color: '#065F46', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Camera size={18} color="#7C3AED" /> Live Biometric Re-Verification
                        </h4>

                        {!verifyPreviewUrl ? (
                          <div
                            onClick={() => verifyFileInputRef.current?.click()}
                            style={{
                              border: '2px dashed #A78BFA',
                              backgroundColor: '#F5F3FF',
                              borderRadius: '10px',
                              padding: '20px 16px',
                              textAlign: 'center',
                              cursor: 'pointer',
                            }}
                          >
                            <Upload size={28} color="#7C3AED" style={{ marginBottom: '6px' }} />
                            <p style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: '#5B21B6' }}>
                              Click to upload live selfie
                            </p>
                            <input
                              ref={verifyFileInputRef}
                              type="file"
                              accept="image/*"
                              style={{ display: 'none' }}
                              onChange={(e) => handleVerifySelfieSelect(e.target.files[0])}
                            />
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', backgroundColor: '#FFFFFF', padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                            <img
                              src={verifyPreviewUrl}
                              alt="Verification selfie preview"
                              style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: '#0F172A' }}>{verifySelfieFile?.name}</p>
                            </div>
                            <button type="button" onClick={clearVerifySelfie} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: '#EF4444' }}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
                          <button
                            type="button"
                            onClick={handleVerifyBiometric}
                            disabled={!verifySelfieFile || isVerifyingBiometric}
                            style={{
                              padding: '10px 16px',
                              fontSize: '13px',
                              fontWeight: '700',
                              backgroundColor: !verifySelfieFile || isVerifyingBiometric ? '#94A3B8' : '#7C3AED',
                              color: '#FFFFFF',
                              borderRadius: '8px',
                              border: 'none',
                              cursor: !verifySelfieFile || isVerifyingBiometric ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                            }}
                          >
                            {isVerifyingBiometric ? <RefreshCw className="spinner" size={16} /> : <Fingerprint size={16} />}
                            {isVerifyingBiometric ? 'Comparing...' : 'Verify Biometric'}
                          </button>

                         {biometricVerifyResult && (
                            <div
                              style={{display: 'flex', alignItems: 'center', gap: '6px',fontSize: '13px',fontWeight: '800',
                                color: biometricVerifyResult.result === 'match' ? '#059669' : '#DC2626',
                              }}
                            >
                              {biometricVerifyResult.result === 'match' ? (
                                <>
                                  <CheckCircle size={18} /> Biometric Match
                                </>
                              ) : (
                                <>
                                  <AlertCircle size={18} /> No Match
                                </>
                              )}
                            </div>
                          )}
                        </div>

                        {biometricVerifyError && (
                          <div style={{ marginTop: '10px', padding: '10px', fontSize: '13px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <AlertCircle size={16} />
                            <span>{biometricVerifyError}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {showRawJson && (
                      <pre style={{ marginTop: '12px', padding: '12px', borderRadius: '8px', maxHeight: '200px', overflowY: 'auto', backgroundColor: '#0F172A', color: '#F8FAFC', fontSize: '12px', fontFamily: 'monospace' }}>
                        {JSON.stringify(vpStatus.credentials, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* TAB 3: DC-API */}
      {activeTab === 'dcapi' && (
        <section className="tab-section" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.03)', overflowX: 'hidden' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0F172A', marginTop: 0, marginBottom: '8px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <Fingerprint size={22} color="#4F46E5" /> DC-API Credential Presentation
          </h2>
          <p style={{ fontSize: '14px', color: '#475569', marginBottom: '24px', marginTop: 0, lineHeight: '1.6' }}>
            Uses the browser's <code>navigator.credentials.get()</code> Digital Credentials API to request a Biographic Credential (SD-JWT) from the Sphereon wallet.
          </p>

          <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', marginBottom: '24px', overflow: 'hidden' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: '700', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>DCQL Query</h3>
            <pre style={{ margin: 0, padding: '12px', borderRadius: '8px', backgroundColor: '#0F172A', color: '#F8FAFC', fontSize: '11px', fontFamily: 'monospace', overflowX: 'auto', width: '100%', boxSizing: 'border-box', lineHeight: '1.6' }}>
{`{
  "credentials": [{
    "id": "biographic",
    "format": "dc+sd-jwt",
    "meta": {
      "vct_values": [
        "https://vcs-backend-wvbx.onrender.com
          /credentials/BiographicCredential"
      ]
    },
    "claims": [
      { "path": ["first_name"] },
      { "path": ["age_over_21"] }
    ]
  }]
}`}
            </pre>
          </div>

          <button
            className="dcapi-btn"
            onClick={testDcApi}
            disabled={isDcApiLoading}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              backgroundColor: isDcApiLoading ? '#94A3B8' : '#4F46E5',
              color: '#FFFFFF',
              border: 'none',
              fontWeight: '700',
              fontSize: '15px',
              cursor: isDcApiLoading ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)'
            }}
          >
            {isDcApiLoading ? (<><RefreshCw className="spinner" size={18} /> Waiting for Wallet...</>) : (<><Fingerprint size={18} /> Request Credential via DC-API</>)}
          </button>

          {dcApiError && (
            <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', color: '#991B1B', display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '14px' }}>
              <AlertCircle size={18} color="#DC2626" style={{ flexShrink: 0, marginTop: '1px' }} />
              <span style={{ wordBreak: 'break-word' }}>{dcApiError}</span>
            </div>
          )}

          {dcApiResult && (
            <div style={{ marginTop: '20px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', padding: '18px', borderRadius: '12px', overflow: 'hidden' }}>
              <h3 style={{ color: '#065F46', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 12px 0', fontSize: '16px', fontWeight: '800' }}>
                <CheckCircle size={20} color="#059669" /> Credential Received!
              </h3>
              <pre style={{ margin: 0, padding: '12px', borderRadius: '8px', maxHeight: '300px', overflowY: 'auto', overflowX: 'auto', backgroundColor: '#0F172A', color: '#F8FAFC', fontSize: '11px', fontFamily: 'monospace', width: '100%', boxSizing: 'border-box', lineHeight: '1.6' }}>
                {JSON.stringify(dcApiResult, null, 2)}
              </pre>
            </div>
          )}
        </section>
      )}

      {/* TAB 4: STATUS MANAGEMENT */}
      {activeTab === 'status' && (
        <section style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.03)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0F172A', marginTop: 0, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldOff size={22} color="#DC2626" /> Credential Status Management
          </h2>
          <p style={{ fontSize: '14px', color: '#475569', marginBottom: '28px', marginTop: 0 }}>
            Update the revocation status of an issued credential by its type and status list index.
          </p>

          <form onSubmit={handleStatusUpdate} style={{ maxWidth: '520px' }}>
            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '6px' }}>
                Credential Type
              </label>
              <select
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', fontWeight: '600', color: '#0F172A', backgroundColor: '#FFFFFF' }}
                value={statusCredentialType}
                onChange={(e) => { setStatusCredentialType(e.target.value); setStatusUpdateResult(null); setStatusUpdateError(''); }}
              >
                {CREDENTIAL_TYPE_LIST.map((t) => (
                  <option key={t} value={t}>{CREDENTIAL_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '6px' }}>
                Status List Index (idx)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                required
                placeholder="e.g. 0"
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', fontWeight: '500', color: '#0F172A' }}
                value={statusIdx}
                onChange={(e) => { setStatusIdx(e.target.value); setStatusUpdateResult(null); setStatusUpdateError(''); }}
              />
              <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                The index is printed in the backend logs when the credential was issued.
              </p>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '8px' }}>
                New Status
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {['valid', 'suspended', 'revoked'].map((s) => {
                  const colors = {
                    valid:     { bg: '#D1FAE5', border: '#059669', text: '#065F46', activeBg: '#059669' },
                    suspended: { bg: '#FEF3C7', border: '#D97706', text: '#92400E', activeBg: '#D97706' },
                    revoked:   { bg: '#FEE2E2', border: '#DC2626', text: '#991B1B', activeBg: '#DC2626' },
                  }[s];
                  const isActive = statusValue === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => { setStatusValue(s); setStatusUpdateResult(null); setStatusUpdateError(''); }}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '8px',
                        border: `2px solid ${isActive ? colors.activeBg : '#E2E8F0'}`,
                        backgroundColor: isActive ? colors.bg : '#F8FAFC',
                        color: isActive ? colors.text : '#64748B',
                        fontWeight: '700',
                        fontSize: '13px',
                        cursor: 'pointer',
                        textTransform: 'capitalize',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px', marginBottom: '20px', fontFamily: 'monospace', fontSize: '13px', color: '#334155' }}>
              <span style={{ color: '#94A3B8', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>Request Preview</span>
              {'{'}<br />
              &nbsp;&nbsp;<span style={{ color: '#7C3AED' }}>"credential_type"</span>: <span style={{ color: '#059669' }}>"{ statusCredentialType }"</span>,<br />
              &nbsp;&nbsp;<span style={{ color: '#7C3AED' }}>"idx"</span>: <span style={{ color: '#D97706' }}>{ statusIdx !== '' ? statusIdx : 0 }</span>,<br />
              &nbsp;&nbsp;<span style={{ color: '#7C3AED' }}>"status"</span>: <span style={{ color: '#059669' }}>"{ statusValue }"</span><br />
              {'}'}
            </div>

            <button
              type="submit"
              disabled={isUpdatingStatus || statusIdx === ''}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: isUpdatingStatus || statusIdx === '' ? '#94A3B8' : '#DC2626',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: '700',
                fontSize: '15px',
                cursor: isUpdatingStatus || statusIdx === '' ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 2px 4px rgba(220, 38, 38, 0.2)',
              }}
            >
              {isUpdatingStatus ? (<><RefreshCw className="spinner" size={18} /> Updating...</>) : (<><ShieldOff size={18} /> Update Credential Status</>)}
            </button>
          </form>

          {statusUpdateError && (
            <div style={{ marginTop: '16px', maxWidth: '520px', padding: '12px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', color: '#991B1B', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
              <AlertCircle size={18} color="#DC2626" />
              <span>{statusUpdateError}</span>
            </div>
          )}

          {statusUpdateResult && (
            <div style={{ marginTop: '16px', maxWidth: '520px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', padding: '18px', borderRadius: '12px' }}>
              <h3 style={{ color: '#065F46', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 12px 0', fontSize: '15px', fontWeight: '800' }}>
                <CheckCircle size={18} color="#059669" /> Status Updated Successfully
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                {[['Credential Type', statusUpdateResult.credential_type], ['Index', statusUpdateResult.idx], ['New Status', statusUpdateResult.status]].map(([label, val]) => (
                  <div key={label} style={{ backgroundColor: '#FFFFFF', padding: '10px 12px', borderRadius: '8px', border: '1px solid #A7F3D0' }}>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748B', fontWeight: '700', letterSpacing: '0.025em', display: 'block' }}>{label}</span>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: '#0F172A', wordBreak: 'break-word' }}>{String(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}