import React, { useState, useEffect, useCallback, useRef } from 'react';
import AnimationStyles from './components/AnimationStyles';
import RoleSelection from './components/RoleSelection';
import CitizenView from './components/CitizenView';
import OperationsView from './components/OperationsView';
import { normalizePhoneDigits } from './utils/validation';

const API_URL = '/api/sos';
const DIRECT_BASE_URL = 'http://localhost:5000';
const IS_LOCALHOST =
  typeof window !== 'undefined' &&
  ['localhost', '127.0.0.1'].includes(window.location.hostname);
const CACHE_KEY = 'sos_requests_cache';
const OFFLINE_QUEUE_KEY = 'sos_offline_queue';
const TOKEN_KEY = 'sos_admin_token';

const DEFAULT_REQUESTS = [
  {
    id: 1700000001,
    name: 'Nguyễn Văn An',
    phone: '0905123456',
    type: 'medical',
    desc: 'Người già khó thở cần oxy khẩn cấp, nước bắt đầu tràn vào nhà.',
    status: 'pending',
    lat: 16.0611,
    lng: 108.2208,
    time: '08:30:15'
  },
  {
    id: 1700000002,
    name: 'Trần Thị Bình',
    phone: '0914987654',
    type: 'food',
    desc: 'Gia đình 4 người (có 2 trẻ nhỏ) hết lương thực và nước ngọt ngày thứ 2.',
    status: 'in_progress',
    lat: 16.0289,
    lng: 108.1972,
    time: '09:15:40'
  },
  {
    id: 1700000003,
    name: 'Lê Hoàng Cường',
    phone: '0935555666',
    type: 'isolated',
    desc: 'Nhà cấp 4 vùng trũng bị ngập sâu hơn 1m, cần ca nô hỗ trợ di dời.',
    status: 'pending',
    lat: 16.0125,
    lng: 108.1450,
    time: '09:45:10'
  },
  {
    id: 1700000004,
    name: 'Phạm Thị Dung',
    phone: '0905999888',
    type: 'medical',
    desc: 'Phụ nữ mang thai tháng thứ 8 có dấu hiệu chuyển dạ, cần cano y tế tiếp cận.',
    status: 'completed',
    lat: 16.0820,
    lng: 108.2435,
    time: '07:10:00'
  }
];

function readStorageJson(storage, key, fallback) {
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

async function buildHttpError(res) {
  let message = `HTTP error! status: ${res.status}`;
  try {
    const body = await res.json();
    if (body?.error) message = body.error;
  } catch {
    // Ignore non-JSON error body
  }
  const err = new Error(message);
  err.status = res.status;
  err.isNetworkError = false;
  return err;
}

const App = () => {
  const [view, setView] = useState('landing');
  const [citizenTab, setCitizenTab] = useState('form');
  const [requests, setRequests] = useState(() => readStorageJson(localStorage, CACHE_KEY, DEFAULT_REQUESTS));
  const [isServerConnected, setIsServerConnected] = useState(false);
  const [authToken, setAuthToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) || '');

  const inFlightMutationsRef = useRef(0);
  const isSyncingOfflineRef = useRef(false);

  // Gọi API kèm fallback sang http://localhost:5000 nếu proxy Vite gặp lỗi kết nối
  const apiFetch = useCallback(async (endpoint, options = {}) => {
    const isRelativeApi = endpoint.startsWith('/api');
    try {
      const res = await fetch(endpoint, options);
      if (res.ok) return res;
      // Vite proxy trả 500/502/503/504 khi backend cổng 5000 chưa chạy -> thử gọi trực tiếp để phân biệt lỗi kết nối
      if (isRelativeApi && IS_LOCALHOST && res.status >= 500) {
        throw new Error('Proxy gateway error');
      }
      throw await buildHttpError(res);
    } catch (err) {
      if (err && err.isNetworkError === false) {
        throw err;
      }
      if (isRelativeApi && IS_LOCALHOST) {
        try {
          const fallbackRes = await fetch(`${DIRECT_BASE_URL}${endpoint}`, options);
          if (fallbackRes.ok) return fallbackRes;
          throw await buildHttpError(fallbackRes);
        } catch (fallbackErr) {
          if (fallbackErr && fallbackErr.isNetworkError === false) {
            throw fallbackErr;
          }
          const networkErr = new Error('Không thể kết nối tới máy chủ backend');
          networkErr.isNetworkError = true;
          throw networkErr;
        }
      }
      const networkErr = new Error('Không thể kết nối tới máy chủ');
      networkErr.isNetworkError = true;
      throw networkErr;
    }
  }, []);

  const clearAuthSession = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    setAuthToken('');
  }, []);

  // Đồng bộ các tin báo được tạo lúc offline lên server khi kết nối trở lại
  const syncOfflineQueue = useCallback(async () => {
    if (isSyncingOfflineRef.current) return;
    const queue = readStorageJson(localStorage, OFFLINE_QUEUE_KEY, []);
    if (!Array.isArray(queue) || queue.length === 0) return;

    isSyncingOfflineRef.current = true;
    const remaining = [];
    try {
      for (const item of queue) {
        try {
          await apiFetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item),
          });
        } catch (err) {
          if (err?.isNetworkError !== false) {
            remaining.push(item);
          }
          // Nếu lỗi 400 (dữ liệu không hợp lệ), bỏ khỏi hàng đợi để tránh kẹt vĩnh viễn
        }
      }
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
    } finally {
      isSyncingOfflineRef.current = false;
    }
  }, [apiFetch]);

  // --- HÀM 1: Lấy danh sách tin cứu trợ từ Backend ---
  const fetchRequests = useCallback(async () => {
    if (inFlightMutationsRef.current > 0) return;

    try {
      await syncOfflineQueue();
      const res = await apiFetch(API_URL);
      const data = await res.json();
      if (Array.isArray(data) && inFlightMutationsRef.current === 0) {
        const offlineQueue = readStorageJson(localStorage, OFFLINE_QUEUE_KEY, []);
        const merged = offlineQueue.length > 0
          ? [...offlineQueue, ...data.filter((d) => !offlineQueue.some((q) => String(q.id) === String(d.id)))]
          : data;
        setRequests(merged);
        localStorage.setItem(CACHE_KEY, JSON.stringify(merged));
        setIsServerConnected(true);
      }
    } catch (err) {
      if (err?.isNetworkError !== false) {
        setIsServerConnected(false);
      }
    }
  }, [apiFetch, syncOfflineQueue]);

  // Xác thực lại token nếu đang lưu trong sessionStorage
  useEffect(() => {
    if (!authToken) return;
    apiFetch('/api/auth/verify', {
      headers: { Authorization: `Bearer ${authToken}` },
    }).catch((err) => {
      if (err?.status === 401) {
        clearAuthSession();
      }
    });
  }, [authToken, apiFetch, clearAuthSession]);

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 2000);
    return () => clearInterval(interval);
  }, [fetchRequests]);

  // --- ĐĂNG NHẬP / ĐĂNG XUẤT ADMIN ---
  const handleLogin = async (password) => {
    try {
      const res = await apiFetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password }),
      });
      const data = await res.json();
      if (data?.token) {
        sessionStorage.setItem(TOKEN_KEY, data.token);
        setAuthToken(data.token);
        setIsServerConnected(true);
        return { success: true };
      }
      return { success: false, error: 'Không nhận được token xác thực từ máy chủ.' };
    } catch (err) {
      if (err?.isNetworkError) {
        setIsServerConnected(false);
        return {
          success: false,
          error: 'Máy chủ Backend (cổng 5000) đang tắt. Vui lòng khởi chạy server để đăng nhập điều hành!',
        };
      }
      return { success: false, error: err?.message || 'Sai mật khẩu điều hành!' };
    }
  };

  const handleLogout = async () => {
    if (authToken) {
      apiFetch('/api/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      }).catch(() => {});
    }
    clearAuthSession();
  };

  // --- HÀM 2: Gửi tin cứu trợ mới ---
  const handleCreateRequest = async (newRequest) => {
    const candidateItem = {
      ...newRequest,
      id: newRequest.id || Date.now(),
      status: newRequest.status || 'pending',
      time: newRequest.time || new Date().toLocaleTimeString('vi-VN', { hour12: false }),
    };

    inFlightMutationsRef.current += 1;
    try {
      const res = await apiFetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(candidateItem),
      });
      const createdItem = await res.json();
      setIsServerConnected(true);
      setRequests((prev) => {
        const updated = [createdItem, ...prev.filter((r) => String(r.id) !== String(createdItem.id))];
        localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
        return updated;
      });
      return { ...createdItem, syncedToServer: true };
    } catch (err) {
      if (err?.isNetworkError === false) {
        throw err;
      }
      console.warn('Server offline: Lưu tin báo vào hàng đợi cục bộ');
      setIsServerConnected(false);

      const offlineItem = { ...candidateItem, pendingSync: true };
      const queue = readStorageJson(localStorage, OFFLINE_QUEUE_KEY, []);
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify([offlineItem, ...queue]));

      setRequests((prev) => {
        const updated = [offlineItem, ...prev.filter((r) => String(r.id) !== String(offlineItem.id))];
        localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
        return updated;
      });
      return { ...offlineItem, syncedToServer: false };
    } finally {
      inFlightMutationsRef.current = Math.max(0, inFlightMutationsRef.current - 1);
    }
  };

  // --- HÀM 3: Cập nhật trạng thái hoặc thông tin ---
  const handleUpdateRequest = async (updatedReq) => {
    inFlightMutationsRef.current += 1;
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      };
      const res = await apiFetch(`${API_URL}/${updatedReq.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updatedReq),
      });
      const savedItem = await res.json();
      setIsServerConnected(true);
      setRequests((prev) => {
        const updated = prev.map((r) => (String(r.id) === String(savedItem.id) ? savedItem : r));
        localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
        return updated;
      });
      return savedItem;
    } catch (err) {
      if (err?.status === 401) {
        clearAuthSession();
        alert(err.message);
        throw err;
      }
      if (err?.isNetworkError === false) {
        alert(err.message);
        throw err;
      }
      setIsServerConnected(false);
      setRequests((prev) => {
        const updated = prev.map((r) => (String(r.id) === String(updatedReq.id) ? { ...r, ...updatedReq } : r));
        localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
        return updated;
      });
      return updatedReq;
    } finally {
      inFlightMutationsRef.current = Math.max(0, inFlightMutationsRef.current - 1);
    }
  };

  // --- HÀM 4: Xóa tin cứu trợ ---
  const handleDeleteRequest = async (id) => {
    inFlightMutationsRef.current += 1;
    try {
      const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
      await apiFetch(`${API_URL}/${id}`, { method: 'DELETE', headers });
      setIsServerConnected(true);
    } catch (err) {
      if (err?.status === 401) {
        clearAuthSession();
        alert(err.message);
        inFlightMutationsRef.current = Math.max(0, inFlightMutationsRef.current - 1);
        throw err;
      }
      if (err?.isNetworkError === false && err?.status !== 404) {
        alert(err.message);
        inFlightMutationsRef.current = Math.max(0, inFlightMutationsRef.current - 1);
        throw err;
      }
      if (err?.isNetworkError !== false) {
        setIsServerConnected(false);
      }
    }

    try {
      const queue = readStorageJson(localStorage, OFFLINE_QUEUE_KEY, []);
      if (Array.isArray(queue) && queue.length > 0) {
        localStorage.setItem(
          OFFLINE_QUEUE_KEY,
          JSON.stringify(queue.filter((q) => String(q.id) !== String(id)))
        );
      }
      setRequests((prev) => {
        const updated = prev.filter((r) => String(r.id) !== String(id));
        localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
        return updated;
      });
    } finally {
      inFlightMutationsRef.current = Math.max(0, inFlightMutationsRef.current - 1);
    }
  };

  // --- HÀM 5: Tra cứu đơn cứu trợ theo số điện thoại ---
  const handleLookupByPhone = useCallback(async (phone) => {
    try {
      const res = await apiFetch(`${API_URL}/lookup?phone=${encodeURIComponent(phone)}`);
      const data = await res.json();
      setIsServerConnected(true);
      return Array.isArray(data) ? data : [];
    } catch (err) {
      if (err?.isNetworkError === false) {
        throw err;
      }
      setIsServerConnected(false);
      const target = normalizePhoneDigits(phone);
      return requests.filter((r) => normalizePhoneDigits(r.phone) === target);
    }
  }, [apiFetch, requests]);

  return (
    <div className="font-sans text-gray-900 bg-gray-50 min-h-screen w-full flex flex-col relative selection:bg-red-500 selection:text-white">
      <AnimationStyles />

      {/* Thanh trạng thái kết nối máy chủ gọn nhẹ */}
      <div className="fixed bottom-3 left-4 z-40 pointer-events-none opacity-80 hover:opacity-100 transition">
        <div className="bg-slate-900/90 text-white backdrop-blur text-[11px] px-3 py-1 rounded-full shadow-md flex items-center gap-2 border border-slate-700/60">
          <span className={`w-2 h-2 rounded-full ${isServerConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
          <span>{isServerConnected ? 'Máy chủ: Đang kết nối trực tuyến' : 'Chế độ Cục bộ (Offline)'}</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col w-full">
        {view === 'landing' && (
          <RoleSelection
            onSelect={(selectedView) => {
              if (selectedView === 'citizen') setCitizenTab('form');
              setView(selectedView);
            }}
            onLookup={() => {
              setCitizenTab('lookup');
              setView('citizen');
            }}
            requests={requests}
          />
        )}

        {view === 'citizen' && (
          <CitizenView
            requests={requests}
            initialTab={citizenTab}
            isServerConnected={isServerConnected}
            onSubmitRequest={handleCreateRequest}
            onLookupByPhone={handleLookupByPhone}
            onBack={() => setView('landing')}
          />
        )}

        {view === 'operations' && (
          <OperationsView
            requests={requests}
            isAuthenticated={Boolean(authToken)}
            onLogin={handleLogin}
            onLogout={handleLogout}
            onAddRequest={handleCreateRequest}
            onUpdateRequest={handleUpdateRequest}
            onDeleteRequest={handleDeleteRequest}
            onBack={() => setView('landing')}
          />
        )}
      </div>
    </div>
  );
};

export default App;
