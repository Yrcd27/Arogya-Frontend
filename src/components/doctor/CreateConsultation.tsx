import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { consultationAPI } from '../../services/consultationService';
import type { Consultation, ConsultationCreate } from '../../services/consultationService';
import { labTestAPI } from '../../services/labTestService';
import { queueAPI } from '../../services/queueService';
import { ApiError } from '../../services/httpClient';
import { LabTestFormData } from '../../types/labTest';
import { useAuth } from '../../hooks/useAuth';
import { findConsultationForToken, isLabOrderSaved, progressForStatus } from '../../utils/consultationRecovery';
import { statusLabel } from '../../utils/statusLabels';
import { Plus, Trash2, FlaskConical, Stethoscope, FileText, User } from 'lucide-react';
import type { QueueTokenResponse } from '../../services/queueService';
import { focusFirstInvalidField, getApiFieldErrors, type FieldErrors } from '../../utils/formValidation';
import { CONSULTATION_FIELDS, LAB_TEST_NAME_MAX_LENGTH, MAX_SESSION_NUMBER, getLabTestNameError, getSessionNumberError, isPositiveId, normalizeConsultation, validateConsultation, validateLabOrders, type ConsultationErrors, type ConsultationField } from '../../utils/clinicalValidation';
import { BUTTON_OUTLINE, BUTTON_PRIMARY, BUTTON_SECONDARY, MODAL_CLOSE, MODAL_OVERLAY, MODAL_PANEL } from '../../components/dialogs/modalStyles';
import { noTranslateProps } from '../../utils/noTranslate';

interface CreateConsultationProps {
  token: QueueTokenResponse;
  patientName?: string;
  clinicId?: number;
  onClose: () => void;
  onSaved: (tokenId: number, consultationId: number) => void;
}

export function CreateConsultation({ token, patientName, clinicId, onClose, onSaved }: CreateConsultationProps) {
  const { user: currentUser, sessionKey } = useAuth();
  const currentSessionRef = useRef(sessionKey);
  currentSessionRef.current = sessionKey;
  const consultationContext = `${sessionKey}:${token?.id}:${token?.patientId}:${token?.clinicId}`;
  const initialContextRef = useRef(consultationContext);
  const currentContextRef = useRef(consultationContext);
  currentContextRef.current = consultationContext;
  
  const [chief, setChief] = useState<string>('');
  const [present, setPresent] = useState<string>('');
  const [past, setPast] = useState<string>('');
  const [recom, setRecom] = useState<string>('');
  const [sessionNumber, setSessionNumber] = useState('1');
  const [saving, setSaving] = useState(false);
  const [partiallySaved, setPartiallySaved] = useState(false);
  const [formErrors, setFormErrors] = useState<ConsultationErrors>({});
  const [labErrors, setLabErrors] = useState<FieldErrors<keyof LabTestFormData>[]>([]);
  const [saveError, setSaveError] = useState('');
  const [unconfirmedWrite, setUnconfirmedWrite] = useState(false);
  const unconfirmedWriteRef = useRef(false);
  const uncertainRef = useRef<{ kind: 'consultation' | 'lab'; labIndex: number } | null>(null);
  const [recovery, setRecovery] = useState<'checking' | 'ready' | 'failed'>('checking');
  const [recoveryNotice, setRecoveryNotice] = useState('');
  const [labsOpen, setLabsOpen] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const savingRef = useRef(false);
  const createdConsultationIdRef = useRef<number | null>(null);
  const createdConsultationPayloadRef = useRef<ConsultationCreate | null>(null);
  const progressRef = useRef({ started: false, completed: false, queueCompleted: false, labOrders: new Set<number>() });

  // Lab test states
  const [requestLabTests, setRequestLabTests] = useState(false);
  const [labTests, setLabTests] = useState<LabTestFormData[]>([]);

  const addLabTest = () => {
    if (savingRef.current || createdConsultationIdRef.current !== null && !labsOpen) return;
    setLabTests(previous => [...previous, { testName: '', testDescription: '', testInstructions: '' }]);
  };

  const removeLabTest = (index: number) => {
    if (savingRef.current || createdConsultationIdRef.current !== null && !labsOpen) return;
    setLabTests(labTests.filter((_, i) => i !== index));
    setLabErrors(previous => previous.filter((_, i) => i !== index));
  };

  const updateLabTest = (index: number, field: keyof LabTestFormData, value: string) => {
    if (savingRef.current || progressRef.current.labOrders.has(index)) return;
    setLabTests(previous => previous.map((test, i) => i === index ? { ...test, [field]: value } : test));
    setLabErrors(previous => previous.map((errors, i) => i === index ? { ...errors, [field]: field === 'testName' ? getLabTestNameError(value) : undefined } : errors));
    setSaveError('');
  };

  const changeClinicalField = (field: ConsultationField, value: string) => {
    if (savingRef.current || createdConsultationIdRef.current !== null) return;
    const setters = { chiefComplaint: setChief, presentIllness: setPresent, pastMedicalHistory: setPast, recommendations: setRecom };
    setters[field](value);
    setFormErrors(previous => ({ ...previous, [field]: previous[field] ? validateConsultation({ chiefComplaint: chief, recommendations: recom, [field]: value })[field] : undefined }));
    setSaveError('');
  };

  const clinicalProps = (field: ConsultationField) => ({
    id: `consultation-${field}`,
    disabled: partiallySaved,
    'aria-invalid': !!formErrors[field],
    'aria-describedby': formErrors[field] ? `consultation-${field}-error` : undefined,
    onBlur: () => {
      const values = { chiefComplaint: chief, presentIllness: present, pastMedicalHistory: past, recommendations: recom };
      const message = validateConsultation(values)[field];
      setFormErrors(previous => ({ ...previous, [field]: message ?? previous[field] }));
    },
  });

  const fieldError = (field: ConsultationField | 'sessionNumber') => formErrors[field]
    ? <p id={`consultation-${field}-error`} role="alert" className="text-red-500 text-xs mt-1.5">{formErrors[field]}</p> : null;

  const lookupExisting = async (): Promise<Consultation | null> => {
    const patientId = Number(token.patientId);
    const doctorId = Number(currentUser?.id);
    if (!isPositiveId(patientId) || !isPositiveId(doctorId)) throw new Error('The patient or signed-in doctor could not be verified.');
    const fetchPage = async (page: number) => {
      try {
        return await consultationAPI.list({ patientId, doctorId, page, size: 100 });
      } catch (err) {
        if (err instanceof ApiError && err.status === 400 && err.bodyEmpty) return { items: [] as Consultation[], total: 0 };
        throw err;
      }
    };
    const first = await fetchPage(0);
    const items = [...first.items];
    if (first.total > items.length) items.push(...(await fetchPage(Math.ceil(first.total / 100) - 1)).items);
    return findConsultationForToken(items, { tokenId: token.id, patientId, doctorId, clinicId: Number(token.clinicId) });
  };

  const adopt = async (found: Consultation) => {
    const details = await consultationAPI.getWithTests(found.id);
    const existingTests = details.labTests ?? [];
    const progress = progressForStatus(found.status);
    createdConsultationIdRef.current = found.id;
    progressRef.current.started = progress.started;
    progressRef.current.completed = progress.completed;
    setChief(found.chiefComplaint ?? '');
    setPresent(found.presentIllness ?? '');
    setPast(found.pastMedicalHistory ?? '');
    setRecom(found.recommendations ?? '');
    setSessionNumber(String(found.sessionNumber ?? 1));
    setLabsOpen(existingTests.length === 0);
    setPartiallySaved(true);
    setRecoveryNotice(`An earlier consultation (#${found.id}, ${statusLabel(found.status)}) is already saved for this patient's queue token.${existingTests.length ? ' Its lab tests are already ordered.' : ''} No new consultation will be created. Review it, then use Finish Saving to complete the remaining steps.`);
  };

  const initialCheckRef = useRef<() => Promise<void>>(async () => undefined);
  initialCheckRef.current = async () => {
    setRecovery('checking');
    try {
      const found = await lookupExisting();
      if (found) await adopt(found);
      setSaveError('');
      setRecovery('ready');
    } catch (err) {
      setRecovery('failed');
      setSaveError(`Could not check for an earlier saved consultation: ${err instanceof Error ? err.message : 'please try again.'} Use Check Save Status to retry before saving.`);
    }
  };

  useEffect(() => {
    void initialCheckRef.current();
  }, [consultationContext]);

  const verify = async () => {
    if (savingRef.current || verifying) return;
    setVerifying(true);
    setSaveError('');
    try {
      const uncertain = uncertainRef.current;
      const existingId = createdConsultationIdRef.current;
      if (uncertain?.kind === 'lab' && existingId !== null) {
        const details = await consultationAPI.getWithTests(existingId);
        if (isLabOrderSaved(details.labTests ?? [], labTests, uncertain.labIndex)) {
          progressRef.current.labOrders.add(uncertain.labIndex);
          setRecoveryNotice(`Lab test ${uncertain.labIndex + 1} was found on the server. Use Finish Saving to continue.`);
        } else {
          setRecoveryNotice(`Lab test ${uncertain.labIndex + 1} was not found on the server, so it is safe to use Finish Saving again.`);
        }
      } else {
        const found = await lookupExisting();
        if (found) await adopt(found);
        else setRecoveryNotice('No saved consultation was found on the server, so it is safe to save again.');
        setRecovery('ready');
      }
      uncertainRef.current = null;
      unconfirmedWriteRef.current = false;
      setUnconfirmedWrite(false);
    } catch (err) {
      setSaveError(`Could not check the saved status: ${err instanceof Error ? err.message : 'please try again.'}`);
    } finally {
      setVerifying(false);
    }
  };

  const save = async () => {
    if (savingRef.current || unconfirmedWriteRef.current || recovery !== 'ready') return;
    setSaveError('');
    if (initialContextRef.current !== consultationContext) {
      setSaveError('The patient or signed-in session changed. Return to the queue and reopen this consultation.');
      return;
    }
    if (!token || !isPositiveId(token.id) || !isPositiveId(token.patientId) || !isPositiveId(token.clinicId)
      || !isPositiveId(currentUser?.id) || clinicId !== undefined && Number(clinicId) !== Number(token.clinicId)) {
      setSaveError('The patient, clinic, or signed-in doctor could not be verified. Return to the queue and select the patient again.');
      return;
    }
    const errors = validateConsultation({ chiefComplaint: chief, presentIllness: present, pastMedicalHistory: past, recommendations: recom }, sessionNumber);
    const orderErrors = validateLabOrders(requestLabTests, labTests);
    setFormErrors(errors);
    setLabErrors(orderErrors);
    if (Object.keys(errors).length || orderErrors.some(error => Object.keys(error).length) || requestLabTests && labTests.length === 0) {
      if (requestLabTests && labTests.length === 0) setSaveError('Add at least one lab test or turn off Request tests.');
      if (formRef.current) focusFirstInvalidField(formRef.current);
      return;
    }
    const submittedSession = sessionKey;
    const assertCurrentSession = () => {
      if (currentSessionRef.current !== submittedSession || currentContextRef.current !== consultationContext) throw new Error('The patient or signed-in session changed. Reopen this consultation from the queue.');
    };
    savingRef.current = true;
    setSaving(true);
    setLabsOpen(false);
    setRecoveryNotice('');
    let stage: 'consultation' | 'start' | 'complete' | 'queue' | 'lab' = 'consultation';
    let labIndex = -1;
    let pendingWrite: 'consultation' | 'lab' | null = null;
    try {
      let consultationId = createdConsultationIdRef.current;
      if (consultationId === null) {
        const currentToken = await queueAPI.getToken(token.id);
        assertCurrentSession();
        if (currentToken.id !== token.id || Number(currentToken.clinicId) !== Number(token.clinicId)
          || Number(currentToken.patientId) !== Number(token.patientId) || currentToken.status !== 'SERVING') {
          throw new Error('This patient is no longer being served in the selected clinic. Return to the queue and verify their token.');
        }
        createdConsultationPayloadRef.current = {
          patientId: Number(token.patientId),
          doctorId: Number(currentUser?.id),
          clinicId: Number(token.clinicId),
          queueTokenId: token.id,
          ...normalizeConsultation({ chiefComplaint: chief, presentIllness: present, pastMedicalHistory: past, recommendations: recom }),
          sessionNumber: Number(sessionNumber),
          bookedAt: new Date().toISOString(),
        };
        pendingWrite = 'consultation';
        const consultation = await consultationAPI.create(createdConsultationPayloadRef.current);
        assertCurrentSession();
        if (!isPositiveId(consultation.id)) throw new Error('The server did not return a valid consultation ID. Check the consultation history before trying again.');
        consultationId = consultation.id;
        createdConsultationIdRef.current = consultationId;
        pendingWrite = null;
      }
      stage = 'start';
      if (!progressRef.current.started) {
        try {
          await consultationAPI.update(consultationId, { status: 'IN_PROGRESS' });
        } catch (err) {
          if (!(err instanceof ApiError && err.status === 409)) throw err;
          const existing = await consultationAPI.get(consultationId);
          if (existing.status !== 'IN_PROGRESS' && existing.status !== 'COMPLETED') throw err;
          progressRef.current.completed = existing.status === 'COMPLETED';
        }
        assertCurrentSession();
        progressRef.current.started = true;
      }
      stage = 'complete';
      if (!progressRef.current.completed) {
        try {
          await consultationAPI.complete(consultationId);
        } catch (err) {
          if (!(err instanceof ApiError && err.status === 409)) throw err;
          const existing = await consultationAPI.get(consultationId);
          if (existing.status !== 'COMPLETED') throw err;
        }
        assertCurrentSession();
        progressRef.current.completed = true;
      }
      stage = 'queue';
      if (!progressRef.current.queueCompleted) {
        const existing = await queueAPI.getToken(token.id);
        assertCurrentSession();
        if (existing.id !== token.id || Number(existing.clinicId) !== Number(token.clinicId) || Number(existing.patientId) !== Number(token.patientId)) {
          throw new Error('The queue token no longer matches this patient and clinic. Verify the queue before continuing.');
        }
        if (existing.status !== 'COMPLETED') {
          if (existing.status !== 'SERVING') throw new Error('The queue token is no longer being served. Verify the queue before continuing.');
          await queueAPI.updateStatus(token.id, 'COMPLETED');
          assertCurrentSession();
        }
        progressRef.current.queueCompleted = true;
      }
      stage = 'lab';
      if (requestLabTests) {
        for (const [index, test] of labTests.entries()) {
          if (progressRef.current.labOrders.has(index)) continue;
          labIndex = index;
          pendingWrite = 'lab';
          await labTestAPI.create({
            consultationId,
            testName: test.testName.trim(),
            testDescription: test.testDescription.trim() || undefined,
            testInstructions: test.testInstructions.trim() || undefined,
          });
          assertCurrentSession();
          progressRef.current.labOrders.add(index);
          pendingWrite = null;
        }
      }
      toast.success('Consultation saved');
      onSaved(token.id, consultationId);
    } catch (err) {
      if (currentSessionRef.current !== submittedSession || currentContextRef.current !== consultationContext) return;
      if (stage === 'consultation') setFormErrors(getApiFieldErrors(err, [...CONSULTATION_FIELDS, 'sessionNumber']));
      if (stage === 'lab' && labIndex >= 0) {
        const errors = getApiFieldErrors(err, ['testName', 'testDescription', 'testInstructions'] as const);
        setLabErrors(previous => previous.map((value, index) => index === labIndex ? errors : value));
      }
      if (createdConsultationIdRef.current !== null) {
        setPartiallySaved(true);
        const step = stage === 'lab' ? `Lab test ${labIndex + 1} was not confirmed saved.` : stage === 'queue' ? 'The queue update was not confirmed.' : 'The consultation could not be finalized.';
        setSaveError(`Consultation #${createdConsultationIdRef.current} was created. ${step} ${err instanceof Error ? err.message : 'Please try again.'} Retry with Finish Saving; confirmed steps will not be repeated.`);
      } else {
        setSaveError(err instanceof Error ? err.message : 'Failed to create consultation');
      }
      if (pendingWrite !== null && (!(err instanceof ApiError) || err.status === 0 || err.status >= 500 || err.status === 409)) {
        unconfirmedWriteRef.current = true;
        uncertainRef.current = { kind: pendingWrite, labIndex };
        setUnconfirmedWrite(true);
        setSaveError(`${pendingWrite === 'lab' ? `Consultation #${createdConsultationIdRef.current} exists, but lab test ${labIndex + 1}` : 'The consultation'} has an unconfirmed save outcome. Automatic resubmission is blocked to avoid duplicates. Use Check Save Status to confirm what the server saved.`);
      }
      if (formRef.current) focusFirstInvalidField(formRef.current);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const cancel = () => {
    if (savingRef.current) return;
    if (partiallySaved && !unconfirmedWriteRef.current) {
      toast.warn('This consultation was already created. Finish saving it before returning to the queue.');
      return;
    }
    onClose();
  };

  return (
    <>
      {/* Create Consultation modal */}
      <div
        className={`${MODAL_OVERLAY} z-50`}
        onClick={saving || partiallySaved ? undefined : cancel}
      >
        <form
          ref={formRef}
          noValidate
          aria-busy={saving}
          onSubmit={event => { event.preventDefault(); void save(); }}
          className={`${MODAL_PANEL} flex max-h-[90vh] max-w-3xl flex-col overflow-hidden`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#38A3A5] text-white flex items-center justify-center font-semibold text-lg flex-shrink-0">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h1 {...noTranslateProps('text-lg lg:text-xl font-bold text-gray-900', !!patientName)}>
                  {patientName || `Patient #${token.patientId}`}
                </h1>
                <p className="text-sm text-gray-500">
                  Session #{sessionNumber} · Patient ID {token.patientId}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={cancel}
              disabled={saving}
              className={MODAL_CLOSE}
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 min-h-0 overflow-y-auto">
          <fieldset disabled={saving || unconfirmedWrite || recovery === 'checking'} className="p-6 space-y-6">
            {saveError && <div role="alert" className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{saveError}</div>}
            {recovery === 'checking' && (
              <div role="status" className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
                Checking for an earlier saved consultation for this patient...
              </div>
            )}
            {recoveryNotice && (
              <div role="status" className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">{recoveryNotice}</div>
            )}
            {partiallySaved && !unconfirmedWrite && (
              <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                The consultation record exists. Saved clinical details are locked; correct any unsaved test errors, then use Finish Saving to retry the remaining steps.
              </div>
            )}
            {/* Clinical Assessment */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50/60">
                <div className="w-9 h-9 rounded-lg bg-[#38A3A5]/10 flex items-center justify-center flex-shrink-0">
                  <Stethoscope className="w-4.5 h-4.5 text-[#38A3A5]" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Clinical Assessment</h2>
                  <p className="text-xs text-gray-500">Symptoms and relevant medical background</p>
                </div>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <label htmlFor="consultation-chiefComplaint" className="block text-sm font-medium text-gray-700 mb-2">
                    Chief Complaint <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...clinicalProps('chiefComplaint')}
                    value={chief}
                    onChange={e => changeClinicalField('chiefComplaint', e.target.value)}
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent transition-colors ${
                      formErrors.chiefComplaint ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="What is the patient's main concern today?"
                  />
                  {fieldError('chiefComplaint')}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="consultation-presentIllness" className="block text-sm font-medium text-gray-700 mb-2">
                      Present Illness
                    </label>
                    <textarea
                      {...clinicalProps('presentIllness')}
                      value={present}
                      onChange={e => changeClinicalField('presentIllness', e.target.value)}
                      rows={4}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent resize-none transition-colors"
                      placeholder="Describe the current illness in detail..."
                    />
                    {fieldError('presentIllness')}
                  </div>
                  <div>
                    <label htmlFor="consultation-pastMedicalHistory" className="block text-sm font-medium text-gray-700 mb-2">
                      Past Medical History
                    </label>
                    <textarea
                      {...clinicalProps('pastMedicalHistory')}
                      value={past}
                      onChange={e => changeClinicalField('pastMedicalHistory', e.target.value)}
                      rows={4}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent resize-none transition-colors"
                      placeholder="Relevant medical history, allergies, etc..."
                    />
                    {fieldError('pastMedicalHistory')}
                  </div>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50/60">
                <div className="w-9 h-9 rounded-lg bg-[#38A3A5]/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4.5 h-4.5 text-[#38A3A5]" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Recommendations &amp; Notes</h2>
                  <p className="text-xs text-gray-500">Treatment plan and follow-up guidance</p>
                </div>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <label htmlFor="consultation-recommendations" className="block text-sm font-medium text-gray-700 mb-2">
                    Recommendations <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    {...clinicalProps('recommendations')}
                    value={recom}
                    onChange={e => changeClinicalField('recommendations', e.target.value)}
                    rows={4}
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent resize-none transition-colors ${
                      formErrors.recommendations ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Treatment plan, prescriptions, follow-up advice..."
                  />
                  {fieldError('recommendations')}
                </div>

                <div>
                  <label htmlFor="consultation-sessionNumber" className="block text-sm font-medium text-gray-700 mb-2">
                    Session Number
                  </label>
                  <input
                    type="number"
                    id="consultation-sessionNumber"
                    min={1}
                    max={MAX_SESSION_NUMBER}
                    step={1}
                    disabled={partiallySaved}
                    aria-invalid={!!formErrors.sessionNumber}
                    aria-describedby={formErrors.sessionNumber ? 'consultation-sessionNumber-error' : undefined}
                    value={sessionNumber}
                    onChange={e => {
                      setSessionNumber(e.target.value);
                      setFormErrors(previous => ({ ...previous, sessionNumber: previous.sessionNumber ? getSessionNumberError(e.target.value) : undefined }));
                    }}
                    onBlur={() => setFormErrors(previous => ({ ...previous, sessionNumber: getSessionNumberError(sessionNumber) ?? previous.sessionNumber }))}
                    className="w-32 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent transition-colors"
                  />
                  {fieldError('sessionNumber')}
                </div>
              </div>
            </div>

            {/* Lab Test Request Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/60">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#38A3A5]/10 flex items-center justify-center flex-shrink-0">
                    <FlaskConical className="w-4.5 h-4.5 text-[#38A3A5]" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">Lab Tests</h2>
                    <p className="text-xs text-gray-500">Order tests for the technician to run</p>
                  </div>
                </div>
                <label htmlFor="requestLabTests" className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="requestLabTests"
                    disabled={partiallySaved && !labsOpen}
                    checked={requestLabTests}
                    onChange={(e) => {
                      setRequestLabTests(e.target.checked);
                      if (e.target.checked && labTests.length === 0) {
                        addLabTest();
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="form-control-focus w-11 h-6 bg-gray-200 peer-checked:bg-[#38A3A5] rounded-full transition-colors" />
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
                  <span className="ml-3 text-sm font-medium text-gray-700">Request tests</span>
                </label>
              </div>

              {requestLabTests && (
                <div className="p-6 space-y-4">
                  {labTests.map((test, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200 relative">
                      <div className="flex items-center justify-between mb-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2d8284] bg-[#38A3A5]/10 px-2.5 py-1 rounded-full">
                          Test {index + 1}
                        </span>
                        <button
                          type="button"
                          disabled={partiallySaved && !labsOpen}
                          onClick={() => removeLabTest(index)}
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                          title="Remove test"
                          aria-label={`Remove test ${index + 1}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label htmlFor={`consultation-test-${index}-testName`} className="block text-sm font-medium text-gray-700 mb-1">
                            Test Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            id={`consultation-test-${index}-testName`}
                            maxLength={LAB_TEST_NAME_MAX_LENGTH}
                            disabled={progressRef.current.labOrders.has(index)}
                            aria-invalid={!!labErrors[index]?.testName}
                            aria-describedby={labErrors[index]?.testName ? `consultation-test-${index}-testName-error` : undefined}
                            value={test.testName}
                            onChange={(e) => updateLabTest(index, 'testName', e.target.value)}
                            placeholder="e.g., Complete Blood Count, Blood Sugar Test"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent text-sm transition-colors"
                          />
                          {labErrors[index]?.testName && <p id={`consultation-test-${index}-testName-error`} role="alert" className="text-red-500 text-xs mt-1.5">{labErrors[index].testName}</p>}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label htmlFor={`consultation-test-${index}-testDescription`} className="block text-sm font-medium text-gray-700 mb-1">
                              Test Description
                            </label>
                            <textarea
                              id={`consultation-test-${index}-testDescription`}
                              disabled={progressRef.current.labOrders.has(index)}
                              aria-invalid={!!labErrors[index]?.testDescription}
                              aria-describedby={labErrors[index]?.testDescription ? `consultation-test-${index}-testDescription-error` : undefined}
                              value={test.testDescription}
                              onChange={(e) => updateLabTest(index, 'testDescription', e.target.value)}
                              rows={2}
                              placeholder="What does this test check for?"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent resize-none text-sm transition-colors"
                            />
                            {labErrors[index]?.testDescription && <p id={`consultation-test-${index}-testDescription-error`} role="alert" className="text-red-500 text-xs mt-1.5">{labErrors[index].testDescription}</p>}
                          </div>

                          <div>
                            <label htmlFor={`consultation-test-${index}-testInstructions`} className="block text-sm font-medium text-gray-700 mb-1">
                              Instructions for Technician
                            </label>
                            <textarea
                              id={`consultation-test-${index}-testInstructions`}
                              disabled={progressRef.current.labOrders.has(index)}
                              aria-invalid={!!labErrors[index]?.testInstructions}
                              aria-describedby={labErrors[index]?.testInstructions ? `consultation-test-${index}-testInstructions-error` : undefined}
                              value={test.testInstructions}
                              onChange={(e) => updateLabTest(index, 'testInstructions', e.target.value)}
                              rows={2}
                              placeholder="Special instructions or requirements..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent resize-none text-sm transition-colors"
                            />
                            {labErrors[index]?.testInstructions && <p id={`consultation-test-${index}-testInstructions-error`} role="alert" className="text-red-500 text-xs mt-1.5">{labErrors[index].testInstructions}</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    disabled={partiallySaved && !labsOpen}
                    onClick={addLabTest}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-[#38A3A5] border-2 border-dashed border-[#38A3A5]/40 rounded-lg hover:border-[#38A3A5] hover:bg-[#38A3A5]/5 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Another Test
                  </button>
                </div>
              )}
            </div>
          </fieldset>
          </div>

          {/* Modal footer */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 flex-shrink-0">
            <button
              type="button"
              className={BUTTON_SECONDARY}
              onClick={cancel}
              disabled={saving}
            >
              {unconfirmedWrite ? 'Return to Queue' : 'Cancel'}
            </button>
            {(unconfirmedWrite || recovery === 'failed') && (
              <button
                type="button"
                className={BUTTON_OUTLINE}
                onClick={() => void verify()}
                disabled={saving || verifying}
              >
                {verifying ? 'Checking...' : 'Check Save Status'}
              </button>
            )}
            <button
              type="submit"
              className={BUTTON_PRIMARY}
              disabled={saving || unconfirmedWrite || recovery !== 'ready' || verifying}
            >
              {saving ? 'Saving...' : partiallySaved ? 'Finish Saving' : 'Save Consultation'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
