import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from '../../components/doctor/Sidebar';
import { Header } from '../../components/doctor/Header';
import { consultationAPI } from '../../services/consultationService';
import { labTestAPI } from '../../services/labTestService';
import { LabTestFormData } from '../../types/labTest';
import { getCurrentUser } from '../../utils/auth';
import { ArrowLeft, Plus, Trash2, FlaskConical } from 'lucide-react';

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
          <div className="mb-6">
            <button 
              onClick={() => navigate('/doctor/queue')}
              className="flex items-center text-gray-600 hover:text-gray-900 mb-2 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Queue
            </button>
            <p className="text-gray-600 text-sm mb-1">Dashboard / Patient Queue / Create Consultation</p>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
              Create Consultation for {patientName || `User #${token.patientId}`}
            </h1>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 max-w-3xl">
            <div className="space-y-5">
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                  placeholder="Enter chief complaint..."
                />
                {formErrors.diagnosis && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.diagnosis}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Past Medical History
                </label>
                <textarea 
                  value={past} 
                  onChange={e => setPast(e.target.value)} 
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent resize-none"
                  placeholder="Enter past medical history..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Present Illness
                </label>
                <textarea 
                  value={present} 
                  onChange={e => setPresent(e.target.value)} 
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent resize-none"
                  placeholder="Enter present illness..."
                />
              </div>

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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent resize-none"
                  placeholder="Enter recommendations..."
                />
                {formErrors.notes && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.notes}</p>
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
                  className="w-40 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                />
              </div>

              {/* Lab Test Request Section */}
              <div className="pt-4 border-t">
                <div className="flex items-center gap-3 mb-4">
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
                    className="w-4 h-4 text-[#38A3A5] border-gray-300 rounded focus:ring-[#38A3A5]"
                  />
                  <label htmlFor="requestLabTests" className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                    <FlaskConical className="w-5 h-5 text-[#38A3A5]" />
                    Request Lab Tests
                  </label>
                </div>

                {requestLabTests && (
                  <div className="space-y-4 pl-7">
                    {labTests.map((test, index) => (
                      <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200 relative">
                        <button
                          type="button"
                          onClick={() => removeLabTest(index)}
                          className="absolute top-2 right-2 p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                          title="Remove test"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

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
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Test Description
                            </label>
                            <textarea
                              value={test.testDescription}
                              onChange={(e) => updateLabTest(index, 'testDescription', e.target.value)}
                              rows={2}
                              placeholder="What does this test check for?"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent resize-none text-sm"
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
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent resize-none text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={addLabTest}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-[#38A3A5] border-2 border-dashed border-[#38A3A5] rounded-lg hover:bg-[#38A3A5] hover:text-white transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Another Test
                    </button>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button 
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium" 
                  onClick={cancel} 
                  disabled={saving}
                >
                  Cancel
                </button>
                <button 
                  className="px-6 py-2 bg-[#38A3A5] text-white rounded-lg hover:bg-[#2d8284] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed" 
                  onClick={save} 
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
