import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from '../../components/doctor/Sidebar';
import { Header } from '../../components/doctor/Header';
import { consultationAPI } from '../../services/consultationService';
import { labTestAPI } from '../../services/labTestService';
import { queueAPI } from '../../services/queueService';
import { LabTestFormData } from '../../types/labTest';
import { getCurrentUser } from '../../utils/auth';
import { Plus, Trash2, FlaskConical, Stethoscope, FileText, User } from 'lucide-react';

export function CreateConsultation() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { token, patientName, clinicId } = location.state || {};
  
  const currentUser = getCurrentUser();
  const [chief, setChief] = useState<string>('');
  const [present, setPresent] = useState<string>('');
  const [past, setPast] = useState<string>('');
  const [recom, setRecom] = useState<string>('');
  const [sessionNumber, setSessionNumber] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<{ diagnosis?: string; notes?: string }>({});

  // Lab test states
  const [requestLabTests, setRequestLabTests] = useState(false);
  const [labTests, setLabTests] = useState<LabTestFormData[]>([]);

  useEffect(() => {
    if (!token) {
      navigate('/doctor/queue');
    }
  }, [token, navigate]);

  const addLabTest = () => {
    setLabTests([...labTests, { testName: '', testDescription: '', testInstructions: '' }]);
  };

  const removeLabTest = (index: number) => {
    setLabTests(labTests.filter((_, i) => i !== index));
  };

  const updateLabTest = (index: number, field: keyof LabTestFormData, value: string) => {
    const updated = [...labTests];
    updated[index][field] = value;
    setLabTests(updated);
  };

  const save = async () => {
    if (!token) return;
    
    // Validate form
    const errors: { diagnosis?: string; notes?: string } = {};
    if (!chief.trim()) {
      errors.diagnosis = 'Diagnosis is required';
    }
    if (!recom.trim()) {
      errors.notes = 'Notes are required';
    }
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    setSaving(true);
    try {
      // Create consultation with COMPLETED status
      const payload = {
        patientId: Number(token.patientId),
        doctorId: Number(currentUser?.id || 0),
        clinicId: Number(clinicId || token.clinicId || 0),
        queueTokenId: token.id,
        chiefComplaint: chief,
        presentIllness: present,
        pastMedicalHistory: past,
        recommendations: recom,
        sessionNumber: sessionNumber || 1,
        bookedAt: new Date().toISOString(),
        status: 'COMPLETED',
        completedAt: new Date().toISOString(),
      };
      console.debug('Creating consultation payload:', payload);
      const consultation = await consultationAPI.create({
        ...payload,
      });

      // Mark the queue token as served now that the consultation is recorded
      try {
        await queueAPI.updateStatus(token.id, 'COMPLETED');
      } catch (queueError) {
        console.error('Failed to update queue token status:', queueError);
      }

      // If lab tests are requested, try to create them (but don't fail if API not ready)
      if (requestLabTests && labTests.length > 0) {
        try {
          const labTestPromises = labTests
            .filter(test => test.testName.trim()) // Only create tests with names
            .map(test => 
              labTestAPI.create({
                consultationId: consultation.id,
                testName: test.testName,
                testDescription: test.testDescription || undefined,
                testInstructions: test.testInstructions || undefined,
              })
            );
          
          await Promise.all(labTestPromises);
        } catch (labError) {
          // Lab test creation failed (likely backend not ready) - warn but continue
          console.error('Failed to create lab tests:', labError);
          alert('⚠️ Consultation created successfully, but lab tests could not be saved.\n\nThe backend lab test API is not available yet. Please implement the /lab-tests endpoint.');
        }
      }
      
      // Navigate back to queue with success status
      navigate('/doctor/queue', { state: { consultationCreated: true, tokenId: token.id, consultationId: consultation.id } });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      alert('Failed to create consultation: ' + errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    navigate('/doctor/queue');
  };

  if (!token) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <div className={`flex flex-col transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : 'md:ml-0'}`}>
        <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        <main className="flex-1 p-4 lg:p-6">
          <p className="text-gray-500 text-xs uppercase tracking-wide font-medium">
            Dashboard / Patient Queue / Create Consultation
          </p>
        </main>
      </div>

      {/* Create Consultation modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        onClick={cancel}
      >
        <div
          className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#38A3A5] text-white flex items-center justify-center font-semibold text-lg flex-shrink-0">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg lg:text-xl font-bold text-gray-900">
                  {patientName || `Patient #${token.patientId}`}
                </h1>
                <p className="text-sm text-gray-500">
                  Session #{sessionNumber} · Patient ID {token.patientId}
                </p>
              </div>
            </div>
            <button
              onClick={cancel}
              disabled={saving}
              className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-40"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chief Complaint <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={chief}
                    onChange={e => {
                      setChief(e.target.value);
                      if (formErrors.diagnosis) {
                        setFormErrors(prev => ({ ...prev, diagnosis: undefined }));
                      }
                    }}
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent transition-colors ${
                      formErrors.diagnosis ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="What is the patient's main concern today?"
                  />
                  {formErrors.diagnosis && (
                    <p className="text-red-500 text-xs mt-1.5">{formErrors.diagnosis}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Present Illness
                    </label>
                    <textarea
                      value={present}
                      onChange={e => setPresent(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent resize-none transition-colors"
                      placeholder="Describe the current illness in detail..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Past Medical History
                    </label>
                    <textarea
                      value={past}
                      onChange={e => setPast(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent resize-none transition-colors"
                      placeholder="Relevant medical history, allergies, etc..."
                    />
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recommendations <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={recom}
                    onChange={e => {
                      setRecom(e.target.value);
                      if (formErrors.notes) {
                        setFormErrors(prev => ({ ...prev, notes: undefined }));
                      }
                    }}
                    rows={4}
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent resize-none transition-colors ${
                      formErrors.notes ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Treatment plan, prescriptions, follow-up advice..."
                  />
                  {formErrors.notes && (
                    <p className="text-red-500 text-xs mt-1.5">{formErrors.notes}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Session Number
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={sessionNumber}
                    onChange={e => setSessionNumber(Number(e.target.value || 1))}
                    className="w-32 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent transition-colors"
                  />
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
                    checked={requestLabTests}
                    onChange={(e) => {
                      setRequestLabTests(e.target.checked);
                      if (e.target.checked && labTests.length === 0) {
                        addLabTest();
                      } else if (!e.target.checked) {
                        setLabTests([]);
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-checked:bg-[#38A3A5] rounded-full transition-colors" />
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
                          onClick={() => removeLabTest(index)}
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                          title="Remove test"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Test Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={test.testName}
                            onChange={(e) => updateLabTest(index, 'testName', e.target.value)}
                            placeholder="e.g., Complete Blood Count, Blood Sugar Test"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent text-sm transition-colors"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Test Description
                            </label>
                            <textarea
                              value={test.testDescription}
                              onChange={(e) => updateLabTest(index, 'testDescription', e.target.value)}
                              rows={2}
                              placeholder="What does this test check for?"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent resize-none text-sm transition-colors"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Instructions for Technician
                            </label>
                            <textarea
                              value={test.testInstructions}
                              onChange={(e) => updateLabTest(index, 'testInstructions', e.target.value)}
                              rows={2}
                              placeholder="Special instructions or requirements..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent resize-none text-sm transition-colors"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addLabTest}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-[#38A3A5] border-2 border-dashed border-[#38A3A5]/40 rounded-lg hover:border-[#38A3A5] hover:bg-[#38A3A5]/5 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Another Test
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Modal footer */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 flex-shrink-0">
            <button
              className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              onClick={cancel}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              className="px-6 py-2.5 bg-[#38A3A5] text-white rounded-lg hover:bg-[#2d8284] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              onClick={save}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Consultation'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
