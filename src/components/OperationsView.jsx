import React, { useState } from 'react';
import {
  Shield,
  Map as MapIcon,
  Table as TableIcon,
  Plus,
  LogOut,
  X,
  Edit,
  Trash2,
  MapPin,
  CheckCircle,
  Navigation,
  Package,
  ExternalLink,
  Search,
  Filter,
  PhoneCall,
  Clock,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { renderToStaticMarkup } from 'react-dom/server';
import { REQUEST_TYPES, STATUS } from '../constants/data';
import { validatePhone, validateCoords, hasValidCoords, formatCoord } from '../utils/validation';

const DANANG_PRESETS = [
  { name: 'Quận Hải Châu', lat: 16.0611, lng: 108.2208 },
  { name: 'Quận Sơn Trà', lat: 16.0820, lng: 108.2435 },
  { name: 'Quận Thanh Khê', lat: 16.0600, lng: 108.1880 },
  { name: 'Quận Cẩm Lệ', lat: 16.0289, lng: 108.1972 },
  { name: 'Quận Liên Chiểu', lat: 16.0850, lng: 108.1400 },
  { name: 'Huyện Hòa Vang', lat: 16.0125, lng: 108.1450 },
];

// Cache icon Leaflet theo (type, isPending) để tránh render lại DOM mỗi chu kỳ polling 2s
const ICON_CACHE = new Map();

const getCustomIcon = (type, isPending) => {
  const typeKey = (type || 'food').toUpperCase();
  const cacheKey = `${typeKey}_${isPending ? 'pending' : 'normal'}`;
  if (ICON_CACHE.has(cacheKey)) {
    return ICON_CACHE.get(cacheKey);
  }

  const TypeConfig = REQUEST_TYPES[typeKey] || REQUEST_TYPES.FOOD;
  const IconComponent = TypeConfig.icon;

  const iconMarkup = renderToStaticMarkup(
    <div className="relative flex flex-col items-center group cursor-pointer">
      <div className={`relative z-10 p-2.5 rounded-full shadow-xl border-[3px] border-white ${TypeConfig.color} text-white transform transition duration-300 group-hover:scale-125 ${isPending ? 'ring-4 ring-red-400/70 animate-bounce' : ''}`}>
        <IconComponent size={22} />
      </div>
      <div className={`w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px] ${TypeConfig.borderTopColor} -mt-1 drop-shadow-sm`}></div>
    </div>
  );

  const icon = L.divIcon({
    html: iconMarkup,
    className: 'custom-leaflet-icon',
    iconSize: [45, 45],
    iconAnchor: [22.5, 45],
  });
  ICON_CACHE.set(cacheKey, icon);
  return icon;
};

const MapFlyTo = ({ center }) => {
  const map = useMap();
  React.useEffect(() => {
    if (center && Number.isFinite(center[0]) && Number.isFinite(center[1])) {
      map.flyTo(center, 15, { duration: 1.2 });
    }
  }, [center, map]);
  return null;
};

const EMPTY_FORM = {
  name: '',
  phone: '',
  type: 'food',
  desc: '',
  lat: '16.0611',
  lng: '108.2208',
  status: 'pending',
};

const OperationsView = ({
  requests,
  isAuthenticated,
  onLogin,
  onLogout,
  onAddRequest,
  onUpdateRequest,
  onDeleteRequest,
  onBack,
}) => {
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [activeTab, setActiveTab] = useState('map');
  const [selectedReqId, setSelectedReqId] = useState(null);
  const [flyTarget, setFlyTarget] = useState(null);
  const [showCompletedOnMap, setShowCompletedOnMap] = useState(false);

  // Bộ lọc bảng
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');

  // Modal tạo/sửa
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [modalError, setModalError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  // Luôn suy xuất selectedReq từ requests mới nhất để không bị dữ liệu lỗi thời khi polling
  const selectedReq = selectedReqId
    ? requests.find((r) => String(r.id) === String(selectedReqId)) || null
    : null;

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (isLoggingIn) return;
    setLoginError('');

    if (!password) {
      setLoginError('Vui lòng nhập mật khẩu điều hành!');
      return;
    }

    setIsLoggingIn(true);
    try {
      const result = await onLogin(password);
      if (!result.success) {
        setLoginError(result.error || 'Sai mật khẩu điều hành!');
      } else {
        setPassword('');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!selectedReq) return;
    try {
      await onUpdateRequest({ ...selectedReq, status: newStatus });
    } catch {
      // Lỗi đã được xử lý ở App
    }
  };

  const openCreateModal = () => {
    setForm(EMPTY_FORM);
    setModalError('');
    setEditMode(false);
    setModalOpen(true);
  };

  const openEditModal = (req) => {
    setForm({
      ...req,
      lat: req.lat !== undefined && req.lat !== null ? String(req.lat) : '',
      lng: req.lng !== undefined && req.lng !== null ? String(req.lng) : '',
    });
    setModalError('');
    setEditMode(true);
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    setModalError('');

    const trimmedName = String(form.name ?? '').trim();
    if (!trimmedName) {
      setModalError('Họ tên không được để trống!');
      return;
    }

    const phoneCheck = validatePhone(form.phone);
    if (!phoneCheck.valid) {
      setModalError(phoneCheck.error);
      return;
    }

    const coordCheck = validateCoords(form.lat, form.lng);
    if (!coordCheck.valid) {
      setModalError(coordCheck.error);
      return;
    }

    const trimmedDesc = String(form.desc ?? '').trim();
    if (!trimmedDesc) {
      setModalError('Vui lòng nhập mô tả tình trạng chi tiết!');
      return;
    }

    const payload = {
      ...form,
      name: trimmedName,
      phone: phoneCheck.value,
      desc: trimmedDesc,
      lat: coordCheck.lat,
      lng: coordCheck.lng,
      time: form.time || new Date().toLocaleTimeString('vi-VN', { hour12: false }),
    };

    setIsSaving(true);
    try {
      if (editMode && form.id) {
        await onUpdateRequest(payload);
      } else {
        await onAddRequest(payload);
      }
      setModalOpen(false);
    } catch (err) {
      setModalError(err?.message || 'Không thể lưu tin báo. Vui lòng thử lại!');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa tin báo #${id} không?`)) {
      try {
        await onDeleteRequest(id);
        if (String(selectedReqId) === String(id)) {
          setSelectedReqId(null);
        }
      } catch {
        // Lỗi đã được xử lý ở App
      }
    }
  };

  const filteredRequests = requests.filter((item) => {
    const query = searchQuery.toLowerCase();
    const matchSearch =
      (item.name || '').toLowerCase().includes(query) ||
      (item.phone || '').includes(searchQuery) ||
      (item.desc || '').toLowerCase().includes(query) ||
      String(item.id).includes(searchQuery);
    const matchStatus = filterStatus === 'ALL' || item.status === filterStatus;
    const matchType = filterType === 'ALL' || item.type === filterType;
    return matchSearch && matchStatus && matchType;
  });

  const countPending = requests.filter((r) => r.status === 'pending').length;
  const countInProgress = requests.filter((r) => r.status === 'in_progress').length;
  const countCompleted = requests.filter((r) => r.status === 'completed').length;

  // --- MÀN HÌNH ĐĂNG NHẬP ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center font-sans p-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600 rounded-full blur-3xl animate-pulse"></div>
        </div>

        <form onSubmit={handleLoginSubmit} className="bg-white/95 backdrop-blur-md p-8 md:p-10 rounded-3xl shadow-2xl w-full max-w-sm text-center relative z-10 border border-white/20 animate-fade-in-up">
          <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center text-white mx-auto mb-5 shadow-lg shadow-blue-500/30">
            <Shield size={32} />
          </div>
          <h2 className="text-2xl font-black text-slate-800">TRUNG TÂM ĐIỀU HÀNH</h2>
          <p className="text-slate-500 text-xs mt-1 mb-5">Đăng nhập tài khoản điều phối viên cứu hộ</p>

          {loginError && (
            <div className="mb-4 p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-start gap-2 text-left">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{loginError}</span>
            </div>
          )}

          <input
            type="password"
            placeholder="Nhập mật khẩu (admin123)"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl mb-4 focus:ring-2 focus:ring-blue-500 outline-none transition font-medium text-slate-800 text-center tracking-wider"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />

          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3.5 rounded-xl transition duration-200 shadow-lg shadow-blue-500/20 active:scale-95 cursor-pointer disabled:opacity-70"
          >
            {isLoggingIn ? 'ĐANG XÁC THỰC...' : 'ĐĂNG NHẬP HỆ THỐNG'}
          </button>

          <button
            type="button"
            onClick={onBack}
            className="mt-4 text-xs text-slate-400 hover:text-blue-600 underline cursor-pointer"
          >
            Quay lại trang chủ
          </button>
        </form>
      </div>
    );
  }

  // --- GIAO DIỆN CHÍNH SAU KHI ĐĂNG NHẬP ---
  return (
    <div className="h-screen flex flex-col bg-slate-100 font-sans overflow-hidden">
      <header className="bg-white px-5 py-3 shadow-sm flex flex-wrap justify-between items-center z-[1001] border-b border-slate-200 gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 text-white p-2.5 rounded-xl shadow-md">
            <Shield size={20} />
          </div>
          <div>
            <h1 className="font-extrabold text-base md:text-lg text-slate-800 leading-tight">
              TRUNG TÂM ĐIỀU PHỐI CỨU HỘ
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Khu vực Thành phố Đà Nẵng
            </p>
          </div>
        </div>

        {/* Tab Switcher: Map vs Table */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('map')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'map' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapIcon size={15} /> Bản đồ cứu hộ
          </button>
          <button
            onClick={() => setActiveTab('table')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'table' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TableIcon size={15} /> Bảng dữ liệu ({requests.length})
          </button>
        </div>

        {/* Badges thống kê nhanh */}
        <div className="hidden lg:flex items-center gap-2 text-xs font-bold">
          <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-lg flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
            Chờ xử lý: {countPending}
          </span>
          <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            Đang cứu: {countInProgress}
          </span>
          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
            Xong: {countCompleted}
          </span>
        </div>

        {/* Nút tác vụ */}
        <div className="flex items-center gap-2">
          <button
            onClick={openCreateModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl flex items-center gap-1.5 text-xs font-bold shadow-md shadow-blue-500/20 transition active:scale-95 cursor-pointer"
          >
            <Plus size={16} /> Thêm Marker
          </button>
          <button
            onClick={() => {
              onLogout();
              onBack();
            }}
            className="bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-500 p-2 rounded-xl transition border border-slate-200 cursor-pointer"
            title="Đăng xuất"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* NỘI DUNG CHÍNH (THEO TAB) */}
      <div className="flex-1 relative overflow-hidden flex">
        {activeTab === 'map' && (
          <div className="flex-1 relative w-full h-full">
            {/* Bộ điều khiển nổi trên góc trái bản đồ */}
            <div className="absolute left-4 top-4 z-[999] bg-white/95 backdrop-blur px-3 py-2 rounded-xl shadow-md border border-slate-200">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showCompletedOnMap}
                  onChange={(e) => setShowCompletedOnMap(e.target.checked)}
                  className="rounded accent-blue-600"
                />
                <Eye size={14} className="text-slate-500" />
                Hiện cả ca đã hoàn thành ({countCompleted})
              </label>
            </div>

            <MapContainer
              center={[16.068, 108.212]}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
              />

              {flyTarget && <MapFlyTo center={flyTarget} />}

              {requests.map((req) => {
                if (!hasValidCoords(req)) return null;
                const isSelected = String(req.id) === String(selectedReqId);
                if (req.status === 'completed' && !showCompletedOnMap && !isSelected) {
                  return null;
                }
                const lat = Number(req.lat);
                const lng = Number(req.lng);
                return (
                  <Marker
                    key={req.id}
                    position={[lat, lng]}
                    icon={getCustomIcon(req.type, req.status === 'pending')}
                    eventHandlers={{
                      click: () => {
                        setSelectedReqId(req.id);
                        setFlyTarget([lat, lng]);
                      },
                    }}
                  />
                );
              })}
            </MapContainer>

            {/* FLOATING CARD - POPUP CHI TIẾT TIN BÁO */}
            {selectedReq && (
              <div className="absolute right-4 top-4 bottom-4 w-96 max-w-[calc(100vw-32px)] bg-white/95 backdrop-blur-md shadow-2xl rounded-3xl z-[1000] border border-slate-200 flex flex-col overflow-hidden animate-fade-in-right">
                <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-white">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 font-mono">ID: #{selectedReq.id}</span>
                    <h3 className="font-extrabold text-slate-800 text-base leading-tight">Chi tiết cứu hộ</h3>
                  </div>
                  <button
                    onClick={() => setSelectedReqId(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="p-5 overflow-y-auto flex-1 space-y-4">
                  <div className={`${REQUEST_TYPES[selectedReq.type?.toUpperCase()]?.color || 'bg-slate-700'} p-4 rounded-2xl text-white shadow-md flex items-center gap-3`}>
                    <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-sm">
                      {React.createElement(REQUEST_TYPES[selectedReq.type?.toUpperCase()]?.icon || Package, { size: 28 })}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-lg leading-tight">
                        {REQUEST_TYPES[selectedReq.type?.toUpperCase()]?.label || 'Cứu trợ'}
                      </h4>
                      <p className="text-white/90 text-sm font-medium">{selectedReq.name}</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Số điện thoại:</span>
                      <a href={`tel:${selectedReq.phone}`} className="font-bold text-blue-600 font-mono text-sm flex items-center gap-1">
                        <PhoneCall size={13} /> {selectedReq.phone}
                      </a>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Thời gian báo:</span>
                      <span className="font-bold text-slate-700 font-mono flex items-center gap-1">
                        <Clock size={13} /> {selectedReq.time}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Tọa độ GPS:</span>
                      <span className="font-bold text-slate-700 font-mono">
                        {formatCoord(selectedReq.lat, 5)}, {formatCoord(selectedReq.lng, 5)}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-slate-200">
                      <span className="text-slate-400 uppercase font-bold text-[10px] block mb-1">MÔ TẢ TÌNH TRẠNG:</span>
                      <p className="text-slate-800 text-sm italic font-medium leading-relaxed bg-white p-2.5 rounded-xl border border-slate-200/60">
                        "{selectedReq.desc}"
                      </p>
                    </div>
                  </div>

                  {hasValidCoords(selectedReq) && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${Number(selectedReq.lat)},${Number(selectedReq.lng)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition"
                    >
                      <Navigation size={15} /> Chỉ đường tới vị trí nạn nhân (Google Maps) <ExternalLink size={13} />
                    </a>
                  )}

                  <div className="space-y-2 pt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Thao tác điều phối:
                    </span>
                    {selectedReq.status === 'pending' && (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleUpdateStatus('in_progress')}
                          className="py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-blue-500/20 transition cursor-pointer"
                        >
                          Tiếp nhận ngay
                        </button>
                        <button
                          onClick={() => handleUpdateStatus('completed')}
                          className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-500/20 transition cursor-pointer"
                        >
                          Đã hoàn thành
                        </button>
                      </div>
                    )}

                    {selectedReq.status === 'in_progress' && (
                      <button
                        onClick={() => handleUpdateStatus('completed')}
                        className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-500/20 transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle size={16} /> Xác nhận đã hoàn thành cứu hộ
                      </button>
                    )}

                    {selectedReq.status === 'completed' && (
                      <button
                        onClick={() => handleUpdateStatus('in_progress')}
                        className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                      >
                        Mở lại ca cứu hộ này
                      </button>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <button
                        onClick={() => openEditModal(selectedReq)}
                        className="py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Edit size={14} /> Sửa tin
                      </button>
                      <button
                        onClick={() => handleDelete(selectedReq.id)}
                        className="py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Trash2 size={14} /> Xóa tin
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- CHẾ ĐỘ 2: BẢNG DỮ LIỆU --- */}
        {activeTab === 'table' && (
          <div className="flex-1 p-6 overflow-y-auto bg-slate-50 flex flex-col">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 flex flex-col flex-1">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-100">
                <div className="relative flex-1 min-w-[260px] max-w-md">
                  <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm theo tên, SĐT, mô tả hoặc ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                    <Filter size={14} />
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="ALL">Tất cả trạng thái</option>
                      <option value="pending">Chờ xử lý</option>
                      <option value="in_progress">Đang cứu hộ</option>
                      <option value="completed">Đã hoàn thành</option>
                    </select>
                  </div>

                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ALL">Tất cả loại tin</option>
                    <option value="medical">Cần y tế gấp</option>
                    <option value="food">Thiếu lương thực</option>
                    <option value="isolated">Nhà bị cô lập</option>
                  </select>
                </div>
              </div>

              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 uppercase font-black tracking-wider border-b border-slate-200">
                      <th className="py-3.5 px-4 rounded-l-xl">Mã ID</th>
                      <th className="py-3.5 px-4">Thời gian</th>
                      <th className="py-3.5 px-4">Người báo / SĐT</th>
                      <th className="py-3.5 px-4">Loại yêu cầu</th>
                      <th className="py-3.5 px-4">Tọa độ & Nội dung</th>
                      <th className="py-3.5 px-4">Trạng thái</th>
                      <th className="py-3.5 px-4 rounded-r-xl text-center">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRequests.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          Không tìm thấy tin báo nào phù hợp với bộ lọc.
                        </td>
                      </tr>
                    ) : (
                      filteredRequests.map((req) => {
                        const typeInfo = REQUEST_TYPES[req.type?.toUpperCase()] || REQUEST_TYPES.FOOD;
                        return (
                          <tr key={req.id} className="hover:bg-slate-50/80 transition">
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-500">
                              #{req.id}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-slate-600">
                              {req.time}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-extrabold text-slate-800 block">{req.name}</span>
                              <a href={`tel:${req.phone}`} className="text-blue-600 font-mono font-bold hover:underline">
                                {req.phone}
                              </a>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-white font-bold text-[11px] ${typeInfo.color}`}>
                                {React.createElement(typeInfo.icon, { size: 14 })}
                                {typeInfo.label}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 max-w-xs">
                              <p className="text-slate-700 font-medium truncate" title={req.desc}>
                                {req.desc}
                              </p>
                              <span className="text-[10px] text-slate-400 font-mono">
                                📍 {formatCoord(req.lat, 4)}, {formatCoord(req.lng, 4)}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <select
                                value={req.status}
                                onChange={(e) => onUpdateRequest({ ...req, status: e.target.value }).catch(() => {})}
                                className={`text-[11px] font-extrabold px-2.5 py-1 rounded-lg border outline-none cursor-pointer ${
                                  req.status === 'completed'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : req.status === 'in_progress'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : 'bg-red-50 text-red-700 border-red-200'
                                }`}
                              >
                                <option value="pending">Chờ tiếp nhận</option>
                                <option value="in_progress">Đang cứu hộ</option>
                                <option value="completed">Đã hoàn thành</option>
                              </select>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => {
                                    setSelectedReqId(req.id);
                                    if (hasValidCoords(req)) {
                                      setFlyTarget([Number(req.lat), Number(req.lng)]);
                                    }
                                    setActiveTab('map');
                                  }}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                                  title="Xem vị trí trên bản đồ"
                                >
                                  <MapPin size={16} />
                                </button>
                                <button
                                  onClick={() => openEditModal(req)}
                                  className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                  title="Chỉnh sửa"
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  onClick={() => handleDelete(req.id)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                                  title="Xóa"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL THÊM / CẬP NHẬT MARKER */}
      {modalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in-up border border-slate-100">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-xl text-slate-800">
                {editMode ? 'Cập Nhật Tin Báo Cứu Trợ' : 'Thêm Marker Cứu Trợ Mới'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            {modalError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSave} noValidate className="space-y-4 text-xs font-medium">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Họ tên *</label>
                  <input
                    className="w-full border border-slate-200 p-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Nguyễn Văn A"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Số điện thoại *</label>
                  <input
                    className="w-full border border-slate-200 p-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="0905..."
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Loại hỗ trợ</label>
                  <select
                    className="w-full border border-slate-200 p-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  >
                    {Object.values(REQUEST_TYPES).map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Trạng thái</label>
                  <select
                    className="w-full border border-slate-200 p-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    {Object.values(STATUS).map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tọa độ và Preset nhanh */}
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                  Chọn nhanh tọa độ tại Đà Nẵng:
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {DANANG_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setForm({ ...form, lat: String(preset.lat), lng: String(preset.lng) })}
                      className="px-2 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-[10px] font-bold text-slate-600 transition cursor-pointer"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    step="0.0001"
                    className="w-full border border-slate-200 p-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                    placeholder="Vĩ độ (Lat)"
                    value={form.lat}
                    onChange={(e) => setForm({ ...form, lat: e.target.value })}
                    required
                  />
                  <input
                    type="number"
                    step="0.0001"
                    className="w-full border border-slate-200 p-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                    placeholder="Kinh độ (Lng)"
                    value={form.lng}
                    onChange={(e) => setForm({ ...form, lng: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Mô tả tình trạng chi tiết *</label>
                <textarea
                  className="w-full border border-slate-200 p-2.5 rounded-xl h-20 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  placeholder="Mô tả cụ thể người cần cứu trợ, tình trạng ngập lụt..."
                  value={form.desc}
                  onChange={(e) => setForm({ ...form, desc: e.target.value })}
                  required
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 text-slate-500 hover:bg-slate-100 rounded-xl font-bold transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-500/20 transition cursor-pointer disabled:opacity-70"
                >
                  {isSaving ? 'Đang lưu...' : editMode ? 'Lưu thay đổi' : 'Tạo marker mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperationsView;
