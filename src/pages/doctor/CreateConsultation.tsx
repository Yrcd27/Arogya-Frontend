import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from '../../components/doctor/Sidebar';
import { Header } from '../../components/doctor/Header';
import { consultationAPI } from '../../services/consultationService';
import { getCurrentUser } from '../../utils/auth';
import { ArrowLeft } from 'lucide-react';

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

  useEffect(() => {
    if (!token) {
      navigate('/doctor/queue');
    }
  }, [token, navigate]);

  const save = async () => {
    if (!token) return;
    
    setSaving(true);
    try {
      // Create consultation with COMPLETED status
      const consultation = await consultationAPI.create({
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
        status: 'COMPLETED', // Directly set status to COMPLETED
        completedAt: new Date().toISOString(), // Set completion time
      });
      
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
                  Chief Complaint
                </label>
                <input 
                  value={chief} 
                  onChange={e => setChief(e.target.value)} 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                  placeholder="Enter chief complaint..."
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
                  Recommendations
                </label>
                <textarea 
                  value={recom} 
                  onChange={e => setRecom(e.target.value)} 
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent resize-none"
                  placeholder="Enter recommendations..."
                />
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
