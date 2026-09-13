import React, { useState } from 'react';
import { AlertTriangle, LogOut, MapPin, Ambulance, Package, Home } from 'lucide-react';
import { REQUEST_TYPES, STATUS } from '../constants/data';

const CitizenView = ({ requests, onSubmitRequest, onBack }) => {
  const [formData, setFormData] = useState({ name: '', phone: '', type: 'food', desc: '' });
  const [submittedId, setSubmittedId] = useState(null);
  const [isLocating, setIsLocating] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLocating(true);

    if (!navigator.geolocation) {
      alert("Trình duyệt không hỗ trợ định vị!");
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newRequest = {
          id: Date.now(),
          ...formData,
          lat: position.coords.latitude, 
          lng: position.coords.longitude,
          status: 'pending',
          time: new Date().toLocaleTimeString('vi-VN')
        };
        onSubmitRequest(newRequest).then(res => {
            setSubmittedId(res ? res.id : newRequest.id);
            setIsLocating(false);
        });
      },
      () => {
        if (window.confirm("Không lấy được vị trí. Dùng tọa độ mặc định?")) {
             const newRequest = {
              id: Date.now(),
              ...formData,
              lat: 16.0544,
              lng: 108.2022,
              status: 'pending',
              time: new Date().toLocaleTimeString('vi-VN')
            };
            onSubmitRequest(newRequest).then(res => {
                setSubmittedId(res ? res.id : newRequest.id);
                setIsLocating(false);
            });
        }
        setIsLocating(false);
      }
    );
  };

  const myRequest = requests.find(r => r.id === submittedId) || { ...formData, id: submittedId, status: 'pending' };

  // Màu Header Thẻ thành công
  const getHeaderColor = (status) => {
      if (status === 'in_progress') return 'bg-blue-600';
      if (status === 'completed') return 'bg-green-600';
      return 'bg-[#FF6F00]'; // Màu cam mặc định
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans">
      <header className="bg-[#D32F2F] text-white p-4 shadow-md flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2 font-bold text-lg uppercase tracking-wider">
          <AlertTriangle size={24} /> SOS Center
        </div>
        <button onClick={onBack} className="bg-white/20 hover:bg-white/30 px-4 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-2">
            <LogOut size={16}/> Thoát
        </button>
      </header>
      
      <div className="flex-1 flex items-start justify-center pt-10 p-4">
        {!submittedId ? (
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8 animate-fade-in-up">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-extrabold text-gray-800 mb-1">Yêu cầu cứu trợ</h2>
                <p className="text-gray-500 text-sm">Hệ thống sẽ tự động lấy vị trí của bạn</p>
            </div>

            <div className="space-y-5">
                <div>
                    <label className="text-sm font-bold text-gray-700 block mb-3">Loại hỗ trợ khẩn cấp</label>
                    <div className="grid grid-cols-3 gap-3">
                        {Object.values(REQUEST_TYPES).map((type) => (
                        <button 
                            key={type.id} type="button" onClick={() => setFormData({...formData, type: type.id})} 
                            className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all duration-200 
                                ${formData.type === type.id ? 'border-red-500 bg-red-50 text-red-600 shadow-lg scale-105' : 'border-gray-100 bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                        >
                            <type.icon size={32} className="mb-2" />
                            <span className="text-xs font-bold text-center leading-tight">{type.label}</span>
                        </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 block mb-1">Họ tên</label>
                        <input required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition font-medium" 
                            placeholder="Nguyễn Văn A" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} 
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 block mb-1">Số điện thoại</label>
                        <input required type="tel" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition font-medium" 
                            placeholder="090..." value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} 
                        />
                    </div>
                </div>
                
                <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">Mô tả tình trạng</label>
                    <textarea required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl h-24 focus:ring-2 focus:ring-red-500 outline-none transition resize-none font-medium" 
                        placeholder="Ví dụ: Nhà ngập sâu..." value={formData.desc} onChange={e => setFormData({...formData, desc: e.target.value})} 
                    />
                </div>

                <button type="submit" disabled={isLocating} className="w-full bg-[#D32F2F] hover:bg-red-700 text-white font-bold py-4 rounded-2xl text-lg shadow-lg shadow-red-200 transition active:scale-95 flex justify-center items-center gap-2">
                    {isLocating ? "Đang định vị..." : <><MapPin size={20} /> GỬI YÊU CẦU & VỊ TRÍ</>}
                </button>
                <p className="text-xs text-center text-gray-400 mt-2">*Vui lòng chọn "Cho phép" khi trình duyệt hỏi vị trí</p>
            </div>
          </form>
        ) : (
          /* --- THẺ THÀNH CÔNG (MÀU CAM) --- */
          <div className="w-full max-w-[400px] animate-fade-in-up pt-10">
            <div className="bg-white rounded-[24px] shadow-2xl overflow-hidden text-center relative">
                <div className={`${getHeaderColor(myRequest.status)} p-10 pb-12`}>
                    <h2 className="text-2xl font-extrabold text-white uppercase tracking-wider mb-2 drop-shadow-sm">
                        {STATUS[myRequest.status?.toUpperCase()]?.label || 'ĐÃ GỬI'}
                    </h2>
                    <div className="inline-block bg-black/10 px-3 py-1 rounded text-white/90 text-sm font-mono tracking-wide">
                        ID: #{myRequest.id}
                    </div>
                </div>

                <div className="relative px-8 pb-8 -mt-8">
                    <div className="mx-auto w-20 h-20 bg-white rounded-full flex items-center justify-center text-orange-500 shadow-lg mb-4 p-1">
                        <div className={`w-full h-full rounded-full ${REQUEST_TYPES[myRequest.type?.toUpperCase()]?.color} flex items-center justify-center text-white`}>
                             {React.createElement(REQUEST_TYPES[myRequest.type?.toUpperCase()]?.icon || Package, {size: 32})}
                        </div>
                    </div>

                    <h3 className="font-bold text-gray-800 text-xl mb-1">{REQUEST_TYPES[myRequest.type?.toUpperCase()]?.label}</h3>
                    <p className="text-gray-500 font-medium mb-6">{myRequest.name}</p>

                    <button onClick={() => setSubmittedId(null)} className="w-full border-2 border-gray-100 hover:border-gray-200 bg-white hover:bg-gray-50 text-gray-600 font-bold py-4 rounded-2xl transition shadow-sm">
                        Gửi yêu cầu hỗ trợ khác
                    </button>
                </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CitizenView;