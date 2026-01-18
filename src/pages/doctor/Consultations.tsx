import { useEffect, useState } from "react";
import { consultationAPI, Consultation } from "../../services/consultationService";
import { userAPI } from "../../services/userService";

type PatientInfo = {
  id: number;
  name: string;
};

export default function Consultations() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [patients, setPatients] = useState<Record<number, PatientInfo>>({});

  useEffect(() => {
    setLoading(true);
    consultationAPI
      .list({ page: 0, size: 20 })
      .then(async (data) => {
        setConsultations(data);
        // Fetch patient info for all consultations
        const ids = Array.from(new Set(data.map((c: Consultation) => c.patientId)));
        const patientMap: Record<number, PatientInfo> = {};
        await Promise.all(
          ids.map(async (id) => {
            try {
              const user = await userAPI.getUser(id);
              patientMap[id] = { id, name: user.name || `Patient #${id}` };
            } catch {
              patientMap[id] = { id, name: `Patient #${id}` };
            }
          })
        );
        setPatients(patientMap);
      })
      .catch(() => setError("Failed to load consultations"))
      .finally(() => setLoading(false));
  }, []);

  const handleComplete = async (id: number) => {
    await consultationAPI.complete(id);
    setConsultations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "COMPLETED" } : c))
    );
  };
  const handleCancel = async (id: number) => {
    await consultationAPI.cancel(id);
    setConsultations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "CANCELLED" } : c))
    );
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Consultations</h2>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500">{error}</div>}
      <table className="min-w-full border text-sm">
        <thead>
          <tr>
            <th className="border px-2">ID</th>
            <th className="border px-2">Patient</th>
            <th className="border px-2">Clinic</th>
            <th className="border px-2">Complaint</th>
            <th className="border px-2">Status</th>
            <th className="border px-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {consultations.map((c) => (
            <tr key={c.id} className={c.status === "COMPLETED" ? "bg-green-50" : c.status === "CANCELLED" ? "bg-red-50" : ""}>
              <td className="border px-2">{c.id}</td>
              <td className="border px-2">{patients[c.patientId]?.name || c.patientId}</td>
              <td className="border px-2">{c.clinicId}</td>
              <td className="border px-2">{c.chiefComplaint}</td>
              <td className="border px-2">{c.status}</td>
              <td className="border px-2 space-x-2">
                {c.status === "PENDING" && (
                  <>
                    <button className="bg-green-500 text-white px-2 py-1 rounded" onClick={() => handleComplete(c.id)}>
                      Complete
                    </button>
                    <button className="bg-red-500 text-white px-2 py-1 rounded" onClick={() => handleCancel(c.id)}>
                      Cancel
                    </button>
                  </>
                )}
                {c.status !== "PENDING" && <span>-</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
