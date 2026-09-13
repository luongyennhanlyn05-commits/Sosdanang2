import React, { useState } from 'react';
import { Shield, List, Plus, LogOut, X, Edit, Trash2, MapPin, CheckCircle, Navigation, Package, ExternalLink } from 'lucide-react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import { renderToStaticMarkup } from 'react-dom/server';
import { REQUEST_TYPES, STATUS } from '../constants/data';

// --- ICON MAP CUSTOM ---
const createCustomIcon = (type) => {
    const TypeConfig = REQUEST_TYPES[type.toUpperCase()] || REQUEST_TYPES.FOOD;
    const IconComponent = TypeConfig.icon;
    const iconMarkup = renderToStaticMarkup(
        <div className="relative flex flex-col items-center group">
            <div className={`relative z-10 p-2.5 rounded-full shadow-lg border-[3px] border-white ${TypeConfig.color} text-white transform transition-transform group-hover:scale-110`}>
                <IconComponent size={22} />
            </div>
            <div className={`w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px] ${TypeConfig.textColor.replace('text', 'border-t')} -mt-1 drop-shadow-sm`}></div>
        </div>
    );
    return L.divIcon({ html: iconMarkup, className: 'custom-leaflet-icon', iconSize: [45, 45], iconAnchor: [22.5, 45] });
};

const OperationsView = ({ requests, onAddRequest, onUpdateRequest, onDeleteRequest, onBack }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    
    // Chỉ còn chế độ Map, không cần switch view nữa
    const [selectedReq, setSelectedReq] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [form, setForm] = useState({ name: '', phone: '', type: 'food', desc: '', lat: 16.0611, lng: 108.2208, status: 'pending' });

    // --- ĐĂNG NHẬP ---
    const handleLogin = (e) => {
        e.preventDefault();
        if (password === 'admin123') setIsAuthenticated(true);
        else alert('Sai mật khẩu! (Gợi ý: admin123)');
    };

    // --- XỬ LÝ TRẠNG THÁI ---
    const handleUpdateStatus = (newStatus) => {
        if (!selectedReq) return;
        const updatedReq = { ...selectedReq, status: newStatus };
        setSelectedReq(updatedReq); 
        onUpdateRequest(updatedReq);
    };

    const handleSave = (e) => {
        e.preventDefault();
        const payload = { ...form, time: new Date().toLocaleTimeString('vi-VN') };
        if (editMode) {
            onUpdateRequest({ ...payload, id: form.id });
            if (selectedReq?.id === form.id) setSelectedReq(payload);
        } else {
            onAddRequest({ ...payload, id: Date.now() });
        }
        setModalOpen(false);
    };

    const handleDelete = (id) => {
        if(window.confirm('Bạn chắc chắn muốn xóa tin báo này?')) {
            onDeleteRequest(id);
            if (selectedReq?.id === id) setSelectedReq(null);
        }
    }

    const getHeaderColor = (type) => REQUEST_TYPES[type?.toUpperCase()]?.color || 'bg-gray-500';

    // --- MÀN HÌNH ĐĂNG NHẬP ---
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center font-sans p-4">
                <form onSubmit={handleLogin} className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-sm text-center animate-fade-in-up">
                    <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center text-white mx-auto mb-6 shadow-lg shadow-blue-200">
                        <Shield size={32} />
                    </div>
                    <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Admin Map</h2>
                    <p className="text-slate-400 text-sm mb-8">Hệ thống theo dõi bản đồ trực quan</p>
                    <input type="password" placeholder="Mật khẩu (admin123)" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl mb-4 focus:ring-2 focus:ring-blue-500 outline-none transition" value={password} onChange={e=>setPassword(e.target.value)}/>
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-blue-200 active:scale-95">ĐĂNG NHẬP</button>
                    <button type="button" onClick={onBack} className="mt-4 text-sm text-slate-400 hover:text-blue-600 underline decoration-dotted">Quay lại trang chủ</button>
                </form>
            </div>
        );
    }

    // --- GIAO DIỆN CHÍNH (CHỈ CÒN MAP) ---
    return (
        <div className="h-screen flex flex-col bg-slate-50 font-sans">
            {/* HEADER */}
            <header className="bg-white px-6 py-3 shadow-sm flex justify-between items-center z-[1001] border-b border-gray-100 h-16">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 text-white p-2 rounded-lg shadow-md"><Shield size={20}/></div>
                    <div>
                        <h1 className="font-bold text-lg text-slate-800 leading-tight">TRUNG TÂM ĐIỀU HÀNH</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Khu vực Đà Nẵng</p>
                    </div>
                </div>
                
                {/* Nút chuyển sang JSP */}
                <div className="flex-1 flex justify-center">
                    <a href="http://localhost:8080/SosBackend/admin-list.jsp" target="_blank" rel="noreferrer" 
                       className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold transition">
                        <List size={18}/> Quản lý Dữ liệu (JSP) <ExternalLink size={14} className="opacity-50"/>
                    </a>
                </div>

                <div className="flex gap-2">
                    <button onClick={()=>{setForm({name:'', phone:'', type:'food', desc:'', lat:16.0611, lng:108.2022, status:'pending'}); setEditMode(false); setModalOpen(true);}} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold shadow-lg shadow-blue-200 transition active:scale-95"><Plus size={18}/> Thêm marker</button>
                    <button onClick={onBack} className="bg-white border border-gray-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200 text-slate-400 p-2 rounded-xl transition" title="Đăng xuất"><LogOut size={20}/></button>
                </div>
            </header>

            <div className="flex-1 relative flex overflow-hidden">
                {/* --- MAP VIEW --- */}
                <div className="flex-1 relative z-0">
                    <MapContainer center={[16.068, 108.212]} zoom={14} style={{ height: "100%", width: "100%" }} zoomControl={false}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                        {requests.filter(r => r.status !== 'completed').map(req => (
                            <Marker key={req.id} position={[req.lat, req.lng]} icon={createCustomIcon(req.type)} eventHandlers={{ click: () => setSelectedReq(req) }} />
                        ))}
                    </MapContainer>
                </div>

                {/* --- FLOATING CARD (POPUP NỔI) --- */}
                {selectedReq && (
                    <div className="absolute right-6 top-6 w-[400px] bg-white shadow-2xl rounded-3xl z-[1000] animate-fade-in-right overflow-hidden border border-gray-100">
                        {/* Header Popup */}
                        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-white">
                            <div>
                                <h3 className="font-extrabold text-gray-800 text-lg">Chi tiết tin báo</h3>
                                <p className="text-xs text-gray-400 font-mono mt-0.5">#{selectedReq.id}</p>
                            </div>
                            <button onClick={()=>setSelectedReq(null)} className="bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-600 p-2 rounded-full transition"><X size={20}/></button>
                        </div>

                        <div className="p-5 space-y-5">
                            <div className={`${getHeaderColor(selectedReq.type)} p-5 rounded-2xl text-white shadow-lg flex items-center gap-4 relative overflow-hidden`}>
                                <div className="bg-white/20 p-3.5 rounded-xl backdrop-blur-sm relative z-10">
                                    {React.createElement(REQUEST_TYPES[selectedReq.type.toUpperCase()]?.icon || Package, {size: 32})}
                                </div>
                                <div className="relative z-10">
                                    <h4 className="font-bold text-2xl leading-none mb-1">{REQUEST_TYPES[selectedReq.type.toUpperCase()]?.label}</h4>
                                    <p className="text-white/90 font-medium">{selectedReq.name}</p>
                                </div>
                                <div className="absolute -right-4 -bottom-4 opacity-20 transform rotate-12 scale-150">
                                    {React.createElement(REQUEST_TYPES[selectedReq.type.toUpperCase()]?.icon || Package, {size: 80})}
                                </div>
                            </div>

                            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">MÔ TẢ TÌNH TRẠNG</label>
                                <p className="text-slate-700 font-medium text-sm leading-relaxed">"{selectedReq.desc}"</p>
                                <div className="mt-4 pt-3 border-t border-slate-200 flex items-center gap-2 text-blue-600 text-xs font-bold">
                                    <MapPin size={14}/> {selectedReq.lat.toFixed(5)}, {selectedReq.lng.toFixed(5)}
                                </div>
                            </div>

                            <div className="space-y-3">
                                {selectedReq.status === 'completed' ? (
                                    <div className="w-full py-4 bg-green-50 text-green-600 font-extrabold text-center rounded-2xl border-2 border-green-100 flex items-center justify-center gap-2">
                                        <CheckCircle size={24}/> ĐÃ HOÀN THÀNH
                                    </div>
                                ) : selectedReq.status === 'in_progress' ? (
                                    <div className="space-y-3">
                                        <div className="w-full py-3 bg-blue-50 text-blue-600 font-bold text-center rounded-2xl border-2 border-blue-100 flex items-center justify-center gap-2">
                                            <Navigation size={20}/> ĐANG CỨU HỘ
                                        </div>
                                        <button onClick={()=>handleUpdateStatus('completed')} className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-2xl shadow-lg shadow-green-200 transition active:scale-95">
                                            Xác nhận Hoàn thành
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3">
                                        <button onClick={()=>handleUpdateStatus('in_progress')} className="py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition active:scale-95">
                                            Tiếp nhận
                                        </button>
                                        <button onClick={()=>handleUpdateStatus('completed')} className="py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg shadow-green-200 transition active:scale-95">
                                            Hoàn thành
                                        </button>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <button onClick={()=>{setForm(selectedReq); setEditMode(true); setModalOpen(true)}} className="py-2.5 rounded-xl border-2 border-slate-100 hover:border-slate-300 text-slate-600 font-bold text-sm transition">Sửa tin</button>
                                    <button onClick={()=>handleDelete(selectedReq.id)} className="py-2.5 rounded-xl border-2 border-red-50 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-sm transition">Xóa tin</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL FORM */}
            {modalOpen && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-lg animate-fade-in-up">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-2xl text-slate-800">{editMode ? 'Cập nhật tin báo' : 'Thêm tin báo mới'}</h3>
                            <button onClick={()=>setModalOpen(false)}><X className="text-slate-400 hover:text-slate-600"/></button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <input className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Họ tên" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} required/>
                                <input className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Số điện thoại" value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})} required/>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <select className="border p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white" value={form.type} onChange={e=>setForm({...form, type:e.target.value})}>{Object.values(REQUEST_TYPES).map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select>
                                <select className="border p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white" value={form.status} onChange={e=>setForm({...form, status:e.target.value})}>{Object.values(STATUS).map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <input type="number" step="0.0001" className="border p-3 rounded-xl" placeholder="Vĩ độ (Lat)" value={form.lat} onChange={e=>setForm({...form, lat:Number(e.target.value)})}/>
                                <input type="number" step="0.0001" className="border p-3 rounded-xl" placeholder="Kinh độ (Lng)" value={form.lng} onChange={e=>setForm({...form, lng:Number(e.target.value)})}/>
                            </div>
                            <textarea className="w-full border p-3 rounded-xl h-24 focus:ring-2 focus:ring-blue-500 outline-none resize-none" placeholder="Mô tả chi tiết..." value={form.desc} onChange={e=>setForm({...form, desc:e.target.value})}/>
                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                                <button type="button" onClick={()=>setModalOpen(false)} className="px-6 py-3 text-slate-500 hover:bg-slate-100 rounded-xl font-bold transition">Hủy</button>
                                <button type="submit" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition">Lưu lại</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
export default OperationsView;