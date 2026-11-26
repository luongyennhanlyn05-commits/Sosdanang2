import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  LogOut,
  MapPin,
  CheckCircle2,
  Clock,
  Phone,
  User,
  FileText,
  Compass,
  RefreshCw,
  AlertCircle,
  Search,
  Send,
  ArrowRight,
} from 'lucide-react';
import { REQUEST_TYPES, STATUS } from '../constants/data';
import { validatePhone, normalizePhoneDigits, formatCoord } from '../utils/validation';

const DEFAULT_COORDS = { lat: 16.0544, lng: 108.2022, label: 'Đà Nẵng' };
const SUBMITTED_ID_KEY = 'sos_citizen_submitted_id';
const SUBMITTED_SNAPSHOT_KEY = 'sos_citizen_snapshot';

function readSnapshot() {
  try {
    const raw = localStorage.getItem(SUBMITTED_SNAPSHOT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const CitizenView = ({
  requests,
  initialTab = 'form',
  isServerConnected,
  onSubmitRequest,
  onLookupByPhone,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [formData, setFormData] = useState({ name: '', phone: '', type: 'food', desc: '' });
  const [coords, setCoords] = useState(DEFAULT_COORDS);
  const [locState, setLocState] = useState('loading');
  const [locStatus, setLocStatus] = useState('Đang lấy vị trí GPS...');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [submittedId, setSubmittedId] = useState(() => localStorage.getItem(SUBMITTED_ID_KEY) || null);
  const [submittedSnapshot, setSubmittedSnapshot] = useState(readSnapshot);

  // State cho chức năng tra cứu bằng SĐT
  const [lookupInput, setLookupInput] = useState(() => readSnapshot()?.phone || '');
  const [activeLookupDigits, setActiveLookupDigits] = useState('');
  const [lookupError, setLookupError] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [serverLookupResults, setServerLookupResults] = useState(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setCoords(DEFAULT_COORDS);
      setLocState('fallback');
      setLocStatus('Trình duyệt không hỗ trợ GPS, đang dùng tọa độ mặc định trung tâm Đà Nẵng.');
      return;
    }

    setLocState('loading');
    setLocStatus('Đang lấy vị trí GPS...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: 'Vị trí hiện tại của bạn',
        });
        setLocState('success');
        setLocStatus('Đã định vị thành công vị trí GPS của bạn.');
      },
      () => {
        setCoords(DEFAULT_COORDS);
        setLocState('fallback');
        setLocStatus('Không lấy được GPS tự động — đang dùng tọa độ trung tâm Đà Nẵng (vui lòng ghi rõ địa chỉ trong mô tả).');
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  const saveTrackedRequest = (reqItem, syncedToServer = true) => {
    const finalId = String(reqItem.id);
    const snapshot = { ...reqItem, syncedToServer };
    localStorage.setItem(SUBMITTED_ID_KEY, finalId);
    localStorage.setItem(SUBMITTED_SNAPSHOT_KEY, JSON.stringify(snapshot));
    setSubmittedId(finalId);
    setSubmittedSnapshot(snapshot);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setFormError('');

    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      setFormError('Vui lòng nhập họ và tên người cần hỗ trợ (không chỉ là khoảng trắng)!');
      return;
    }

    const phoneCheck = validatePhone(formData.phone);
    if (!phoneCheck.valid) {
      setFormError(phoneCheck.error);
      return;
    }

    const trimmedDesc = formData.desc.trim();
    if (!trimmedDesc) {
      setFormError('Vui lòng mô tả tình trạng cần cứu trợ để đội điều phối nắm rõ thông tin!');
      return;
    }

    setIsSubmitting(true);

    const newRequest = {
      id: Date.now(),
      name: trimmedName,
      phone: phoneCheck.value,
      type: formData.type,
      desc: trimmedDesc,
      lat: Number(coords.lat.toFixed(5)),
      lng: Number(coords.lng.toFixed(5)),
      status: 'pending',
      time: new Date().toLocaleTimeString('vi-VN', { hour12: false }),
    };

    try {
      const res = await onSubmitRequest(newRequest);
      const merged = { ...newRequest, ...(res || {}), id: res?.id || newRequest.id };
      saveTrackedRequest(merged, res?.syncedToServer !== false);
      setLookupInput(phoneCheck.value);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setFormError(err?.message || 'Không thể gửi yêu cầu cứu trợ. Vui lòng thử lại!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLookupSubmit = async (e) => {
    e.preventDefault();
    if (isSearching) return;
    setLookupError('');

    const phoneCheck = validatePhone(lookupInput);
    if (!phoneCheck.valid) {
      setLookupError(phoneCheck.error);
      setActiveLookupDigits('');
      setServerLookupResults(null);
      return;
    }

    const digits = normalizePhoneDigits(phoneCheck.value);
    setActiveLookupDigits(digits);
    setIsSearching(true);

    try {
      if (onLookupByPhone) {
        const results = await onLookupByPhone(phoneCheck.value);
        setServerLookupResults(results);
      }
    } catch (err) {
      setLookupError(err?.message || 'Không thể tra cứu lúc này. Vui lòng thử lại!');
    } finally {
      setIsSearching(false);
    }
  };

  const resetSubmission = () => {
    localStorage.removeItem(SUBMITTED_ID_KEY);
    localStorage.removeItem(SUBMITTED_SNAPSHOT_KEY);
    setSubmittedId(null);
    setSubmittedSnapshot(null);
    setFormError('');
    setFormData({ name: '', phone: '', type: 'food', desc: '' });
  };

  // Tìm yêu cầu hiện tại để cập nhật realtime theo polling từ Admin
  const matchedRequest = submittedId
    ? requests.find((r) => String(r.id) === String(submittedId))
    : null;

  const isDeletedFromServer =
    Boolean(submittedId) &&
    !matchedRequest &&
    isServerConnected &&
    Boolean(submittedSnapshot?.syncedToServer);

  const myRequest = matchedRequest || submittedSnapshot || {
    ...formData,
    id: submittedId,
    status: 'pending',
    lat: coords.lat,
    lng: coords.lng,
    time: 'Vừa xong',
  };

  const currentTypeConfig = REQUEST_TYPES[(myRequest.type || 'food').toUpperCase()] || REQUEST_TYPES.FOOD;
  const currentStatusConfig = STATUS[(myRequest.status || 'pending').toUpperCase()] || STATUS.PENDING;

  // Kết quả tra cứu luôn ưu tiên đồng bộ realtime từ requests (được polling mỗi 2s)
  const liveLookupResults = activeLookupDigits
    ? requests.filter((r) => normalizePhoneDigits(r.phone) === activeLookupDigits)
    : [];
  const displayedLookupResults =
    liveLookupResults.length > 0 || isServerConnected
      ? liveLookupResults
      : (serverLookupResults || []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans w-full">
      {/* Header cố định trên cùng */}
      <header className="bg-red-600 text-white px-5 py-3.5 shadow-md flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2.5 font-bold text-base md:text-lg uppercase tracking-wider">
          <div className="p-1.5 bg-red-700 rounded-lg">
            <AlertTriangle size={18} className="animate-pulse" />
          </div>
          <span>SOS VIỆT NAM — CỨU TRỢ KHẨN CẤP</span>
        </div>
        <button
          onClick={onBack}
          className="bg-white/20 hover:bg-white/30 text-white px-3.5 py-1.5 rounded-xl text-xs md:text-sm font-semibold transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
        >
          <LogOut size={15} /> Trang chủ
        </button>
      </header>

      {/* Thanh chuyển đổi chế độ cho người dân */}
      <div className="w-full flex justify-center px-4 pt-5">
        <div className="inline-flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('form')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition cursor-pointer ${
              activeTab === 'form'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Send size={15} />
            {submittedId ? 'Đơn đang theo dõi' : 'Gửi yêu cầu SOS'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('lookup')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition cursor-pointer ${
              activeTab === 'lookup'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Search size={15} />
            Tra cứu theo SĐT
          </button>
        </div>
      </div>

      <main className="flex-1 w-full flex items-start justify-center px-4 py-5 md:py-7 pb-32">
        {activeTab === 'lookup' ? (
          /* MÀN HÌNH TRA CỨU ĐƠN CỨU TRỢ BẰNG SỐ ĐIỆN THOẠI */
          <div className="w-full max-w-lg space-y-5 animate-fade-in-up">
            <form
              onSubmit={handleLookupSubmit}
              noValidate
              className="bg-white rounded-3xl shadow-xl border border-slate-100 p-5 md:p-7"
            >
              <div className="text-center mb-5">
                <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 text-[11px] font-bold rounded-full uppercase tracking-wider mb-1.5">
                  Kiểm tra tiến độ cứu hộ
                </span>
                <h2 className="text-xl md:text-2xl font-extrabold text-slate-800">
                  Tra Cứu Bằng Số Điện Thoại
                </h2>
                <p className="text-slate-500 text-xs mt-1">
                  Nhập số điện thoại đã đăng ký để xem trạng thái xử lý mới nhất từ đội cứu hộ
                </p>
              </div>

              {lookupError && (
                <div className="mb-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-start gap-2">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{lookupError}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    placeholder="Nhập SĐT (VD: 0905123456)"
                    value={lookupInput}
                    onChange={(e) => setLookupInput(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:bg-white outline-none transition font-semibold text-slate-800 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-70"
                >
                  <Search size={16} />
                  {isSearching ? 'Đang tìm...' : 'Tra cứu'}
                </button>
              </div>
            </form>

            {activeLookupDigits && (
              <div className="space-y-3">
                {displayedLookupResults.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 text-center space-y-2 shadow-sm">
                    <AlertCircle size={28} className="mx-auto text-slate-400" />
                    <p className="font-bold text-slate-700 text-sm">
                      Không tìm thấy đơn cứu trợ nào với SĐT này
                    </p>
                    <p className="text-xs text-slate-500">
                      Vui lòng kiểm tra lại số điện thoại đã nhập hoặc gửi yêu cầu SOS mới.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between px-1 text-xs font-bold text-slate-500">
                      <span>Tìm thấy {displayedLookupResults.length} yêu cầu cứu trợ</span>
                      <span className="text-emerald-600 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Cập nhật tự động
                      </span>
                    </div>

                    {displayedLookupResults.map((item) => {
                      const typeInfo = REQUEST_TYPES[(item.type || 'food').toUpperCase()] || REQUEST_TYPES.FOOD;
                      const statusInfo = STATUS[(item.status || 'pending').toUpperCase()] || STATUS.PENDING;
                      const headerBg =
                        item.status === 'completed'
                          ? 'bg-emerald-600'
                          : item.status === 'in_progress'
                          ? 'bg-blue-600'
                          : 'bg-amber-600';

                      return (
                        <div
                          key={item.id}
                          className="bg-white rounded-3xl shadow-md border border-slate-200 overflow-hidden"
                        >
                          <div className={`${headerBg} text-white px-5 py-3 flex items-center justify-between`}>
                            <div className="flex items-center gap-2 font-black text-sm uppercase tracking-wide">
                              {item.status === 'completed' ? (
                                <CheckCircle2 size={18} />
                              ) : item.status === 'in_progress' ? (
                                <Compass size={18} />
                              ) : (
                                <Clock size={18} />
                              )}
                              <span>{statusInfo.label}</span>
                            </div>
                            <span className="font-mono text-xs bg-black/20 px-2.5 py-0.5 rounded-full">
                              #{item.id}
                            </span>
                          </div>

                          <div className="p-4 space-y-3 text-xs">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-extrabold text-slate-800 text-sm">{item.name}</span>
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-white font-bold text-[11px] ${typeInfo.color}`}>
                                {React.createElement(typeInfo.icon, { size: 13 })}
                                {typeInfo.label}
                              </span>
                            </div>

                            <p className="text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic">
                              "{item.desc}"
                            </p>

                            <div className="flex items-center justify-between text-slate-500 font-mono text-[11px]">
                              <span>Gửi lúc: {item.time}</span>
                              <span>GPS: {formatCoord(item.lat, 4)}, {formatCoord(item.lng, 4)}</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                saveTrackedRequest(item, !item.pendingSync);
                                setActiveTab('form');
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                            >
                              Theo dõi trực tiếp đơn này <ArrowRight size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            )}
          </div>
        ) : !submittedId ? (
          <form
            onSubmit={handleSubmit}
            noValidate
            className="bg-white rounded-3xl shadow-xl border border-slate-100 w-full max-w-lg p-5 md:p-8 animate-fade-in-up"
          >
            <div className="text-center mb-5">
              <span className="inline-block px-3 py-1 bg-red-100 text-red-700 text-[11px] font-bold rounded-full uppercase tracking-wider mb-1.5">
                Dành cho người dân
              </span>
              <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800">Gửi Yêu Cầu Cứu Trợ</h2>
              <p className="text-slate-500 text-xs md:text-sm mt-0.5">Thông tin sẽ được gửi ngay đến Đội điều phối cứu hộ</p>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* 1. Chọn loại cứu trợ */}
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                  Loại hỗ trợ cần thiết *
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {Object.values(REQUEST_TYPES).map((type) => {
                    const Icon = type.icon;
                    const isSelected = formData.type === type.id;
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, type: type.id })}
                        className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition duration-200 cursor-pointer ${
                          isSelected
                            ? 'border-red-500 bg-red-50 text-red-600 shadow-md scale-102 font-bold'
                            : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <Icon size={24} className={isSelected ? 'text-red-500' : 'text-slate-500'} />
                        <span className="text-[11px] mt-1.5 text-center leading-tight font-medium">
                          {type.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Thông tin cá nhân */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <User size={13} /> Họ và tên *
                  </label>
                  <input
                    required
                    type="text"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:bg-white outline-none transition font-medium text-slate-800 text-sm"
                    placeholder="Nguyễn Văn A"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Phone size={13} /> Số điện thoại *
                  </label>
                  <input
                    required
                    type="tel"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:bg-white outline-none transition font-medium text-slate-800 text-sm"
                    placeholder="0905 xxx xxx"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              {/* 3. Tọa độ GPS */}
              <div className={`border rounded-2xl p-3 ${
                locState === 'success'
                  ? 'bg-emerald-50/70 border-emerald-200'
                  : 'bg-amber-50/80 border-amber-200'
              }`}>
                <div className="flex items-center justify-between mb-1 gap-2">
                  <div className={`flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider ${
                    locState === 'success' ? 'text-emerald-800' : 'text-amber-800'
                  }`}>
                    <MapPin size={15} className={locState === 'success' ? 'text-emerald-600' : 'text-amber-600'} />
                    Tọa độ cứu hộ
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                      locState === 'success'
                        ? 'text-emerald-700 bg-emerald-100'
                        : 'text-amber-700 bg-amber-100'
                    }`}>
                      {formatCoord(coords.lat, 4)}, {formatCoord(coords.lng, 4)}
                    </span>
                    <button
                      type="button"
                      onClick={requestLocation}
                      className="text-[11px] font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
                      title="Lấy lại vị trí GPS"
                    >
                      <RefreshCw size={11} className={locState === 'loading' ? 'animate-spin' : ''} />
                      Định vị lại
                    </button>
                  </div>
                </div>
                <p className={`text-[11px] leading-snug ${
                  locState === 'success' ? 'text-emerald-900' : 'text-amber-900'
                }`}>
                  {locStatus}
                </p>
              </div>

              {/* 4. Mô tả tình trạng */}
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <FileText size={13} /> Mô tả tình trạng & địa chỉ cụ thể *
                </label>
                <textarea
                  required
                  rows={3}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:bg-white outline-none transition resize-none font-medium text-slate-800 text-sm min-h-[85px]"
                  placeholder="Ví dụ: Số nhà/Kiệt..., nước ngập sâu ngang ngực, có 1 người già khó thở..."
                  value={formData.desc}
                  onChange={(e) => setFormData({ ...formData, desc: e.target.value })}
                />
              </div>

              {/* 5. Nút gửi tín hiệu */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-extrabold py-3.5 px-4 rounded-2xl text-sm md:text-base shadow-lg shadow-red-500/25 transition duration-150 active:scale-98 flex justify-center items-center gap-2 cursor-pointer disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <>Đang gửi tín hiệu SOS...</>
                  ) : (
                    <>
                      <MapPin size={18} /> GỬI TÍN HIỆU CỨU TRỢ NGAY
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        ) : isDeletedFromServer ? (
          <div className="w-full max-w-md animate-fade-in-up bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 md:p-8 text-center space-y-4">
            <div className="inline-flex p-3.5 rounded-full bg-slate-100 text-slate-600">
              <AlertCircle size={32} />
            </div>
            <h2 className="text-xl font-black text-slate-800">Tin báo #{submittedId} không còn trên hệ thống</h2>
            <p className="text-xs md:text-sm text-slate-500 leading-relaxed">
              Tin cứu trợ này đã bị điều phối viên gỡ bỏ hoặc không còn tồn tại. Nếu bạn vẫn cần hỗ trợ khẩn cấp, hãy gửi lại yêu cầu mới.
            </p>
            <button
              type="button"
              onClick={resetSubmission}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl text-xs md:text-sm transition cursor-pointer"
            >
              Gửi yêu cầu cứu trợ mới
            </button>
          </div>
        ) : (
          /* MÀN HÌNH THEO DÕI TIẾN ĐỘ THỜI GIAN THỰC */
          <div className="w-full max-w-md animate-fade-in-up">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden text-center">
              <div className={`p-6 md:p-8 text-white ${
                myRequest.status === 'completed'
                  ? 'bg-emerald-600'
                  : myRequest.status === 'in_progress'
                  ? 'bg-blue-600'
                  : 'bg-amber-600'
              }`}>
                <div className="inline-block p-3 rounded-full bg-white/20 mb-2.5 backdrop-blur-sm animate-pulse">
                  {myRequest.status === 'completed' ? (
                    <CheckCircle2 size={32} />
                  ) : myRequest.status === 'in_progress' ? (
                    <Compass size={32} />
                  ) : (
                    <Clock size={32} />
                  )}
                </div>
                <h2 className="text-xl md:text-2xl font-black uppercase tracking-wider mb-1">
                  {currentStatusConfig.label}
                </h2>
                <p className="text-white/90 text-xs md:text-sm">
                  {myRequest.status === 'completed'
                    ? 'Ca cứu hộ của bạn đã hoàn thành an toàn!'
                    : myRequest.status === 'in_progress'
                    ? 'Đội cứu trợ đã tiếp nhận và đang triển khai tới vị trí của bạn'
                    : myRequest.pendingSync
                    ? 'Đang mất kết nối máy chủ — tin đã được lưu cục bộ và sẽ tự gửi khi có mạng'
                    : 'Đã nhận tín hiệu. Trung tâm điều phối đang điều động đội gần nhất'}
                </p>
                <div className="mt-3 inline-block bg-black/20 text-white font-mono text-xs px-3 py-1 rounded-full">
                  Mã tin báo: #{myRequest.id}
                </div>
              </div>

              <div className="p-5 md:p-6 space-y-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left text-xs space-y-2">
                  <div className="flex justify-between items-center text-slate-500">
                    <span>Loại yêu cầu:</span>
                    <span className="font-bold text-slate-800">{currentTypeConfig.label}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-500">
                    <span>Người gửi:</span>
                    <span className="font-bold text-slate-800">{myRequest.name}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-500">
                    <span>Số điện thoại:</span>
                    <span className="font-bold text-blue-600 font-mono text-sm">{myRequest.phone}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-500">
                    <span>Thời gian gửi:</span>
                    <span className="font-bold text-slate-800 font-mono">{myRequest.time}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-slate-400 font-bold block mb-1">MÔ TẢ TÌNH TRẠNG:</span>
                    <p className="text-slate-800 italic font-medium leading-relaxed bg-white p-2.5 rounded-xl border border-slate-200/60">
                      "{myRequest.desc}"
                    </p>
                  </div>
                </div>

                <div className="py-1 text-left">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2.5">
                    Tiến trình điều phối:
                  </span>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-emerald-600 font-bold">
                      <CheckCircle2 size={16} /> 1. Đã tiếp nhận tin báo khẩn cấp
                    </div>
                    <div className={`flex items-center gap-2 font-bold ${
                      myRequest.status === 'in_progress' || myRequest.status === 'completed'
                        ? 'text-blue-600'
                        : 'text-slate-400'
                    }`}>
                      <span className="w-4 h-4 rounded-full border-2 border-current flex items-center justify-center text-[10px]">2</span>
                      2. Đội cứu hộ tiếp nhận & đang di chuyển
                    </div>
                    <div className={`flex items-center gap-2 font-bold ${
                      myRequest.status === 'completed' ? 'text-emerald-600' : 'text-slate-400'
                    }`}>
                      <span className="w-4 h-4 rounded-full border-2 border-current flex items-center justify-center text-[10px]">3</span>
                      3. Hoàn tất cứu trợ
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={resetSubmission}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl text-xs md:text-sm transition cursor-pointer"
                >
                  Gửi yêu cầu hỗ trợ khác
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default CitizenView;
