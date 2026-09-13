import React, { useState, useEffect } from 'react';
import AnimationStyles from './components/AnimationStyles';
import RoleSelection from './components/RoleSelection';
import CitizenView from './components/CitizenView';
import OperationsView from './components/OperationsView';

// Đường dẫn API (Sửa nếu cần)
const API_URL = 'http://localhost:8080/SosBackend/api/sos';

const App = () => {
  const [view, setView] = useState('landing');
  const [requests, setRequests] = useState([]);

  // --- HÀM 1: Lấy dữ liệu từ Backend ---
  const fetchRequests = async () => {
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      setRequests(data);
    } catch (error) {
      console.log("Đang kết nối Backend...", error);
    }
  };

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 2000); // Polling 2s
    return () => clearInterval(interval);
  }, []);

  // --- HÀM 2: Gửi dữ liệu lên Backend ---
  const handleCreateRequest = async (newRequest) => {
    await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRequest)
    });
    fetchRequests(); // Cập nhật ngay
  };

  // --- HÀM 3: Xóa ---
  const handleDeleteRequest = async (id) => {
      await fetch(`${API_URL}?id=${id}`, { method: 'DELETE' });
      fetchRequests();
  };

  // --- HÀM 4: Cập nhật ---
  const handleUpdateRequest = async (updatedReq) => {
      await fetch(API_URL, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedReq)
      });
      fetchRequests();
  };

  return (
    <div className="font-sans text-gray-900 bg-gray-50 h-screen w-full overflow-hidden">
      <AnimationStyles />
      
      {view === 'landing' && (
        <RoleSelection onSelect={setView} />
      )}

      {view === 'citizen' && (
        <CitizenView 
          requests={requests} 
          onSubmitRequest={handleCreateRequest}
          onBack={() => setView('landing')}
        />
      )}

      {view === 'operations' && (
        <OperationsView
          requests={requests}
          onAddRequest={handleCreateRequest}
          onUpdateRequest={handleUpdateRequest}
          onDeleteRequest={handleDeleteRequest}
          onBack={() => setView('landing')}
        />
      )}
    </div>
  );
};

export default App;