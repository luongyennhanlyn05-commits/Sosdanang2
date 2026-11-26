import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import {
  VALID_TYPES,
  VALID_STATUSES,
  validatePhone,
  validateCoords,
} from './src/utils/validation.js';
import {
  initStorage,
  getStorageMode,
  listRequests,
  getStats,
  lookupRequestsByPhone,
  createRequest,
  findRequestById,
  updateRequest,
  deleteRequest,
  saveSessionToken,
  hasSessionToken,
  deleteSessionToken,
} from './storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const DIST_DIR = path.join(__dirname, 'dist');

const DEFAULT_LAT = 16.0544;
const DEFAULT_LNG = 108.2022;

app.use(cors());
app.use(express.json());

function extractBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7).trim() || null;
}

async function requireAdmin(req, res, next) {
  try {
    const token = extractBearerToken(req);
    const valid = await hasSessionToken(token);
    if (!valid) {
      return res.status(401).json({
        success: false,
        error: 'Phiên đăng nhập điều hành không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại!',
      });
    }
    next();
  } catch (error) {
    console.error('Lỗi xác thực token:', error);
    res.status(500).json({ error: 'Lỗi máy chủ khi xác thực phiên đăng nhập' });
  }
}

// =================== CÁC API ENDPOINTS ===================

// 1. Lấy danh sách tin cứu trợ
app.get('/api/sos', async (req, res) => {
  try {
    const requests = await listRequests();
    res.json(requests);
  } catch (error) {
    console.error('Lỗi lấy danh sách:', error);
    res.status(500).json({ error: 'Không thể tải danh sách tin cứu trợ' });
  }
});

// 1b. Tra cứu đơn cứu trợ theo số điện thoại
app.get('/api/sos/lookup', async (req, res) => {
  try {
    const phoneCheck = validatePhone(req.query.phone);
    if (!phoneCheck.valid) {
      return res.status(400).json({ error: phoneCheck.error });
    }
    const matched = await lookupRequestsByPhone(phoneCheck.value);
    res.json(matched);
  } catch (error) {
    console.error('Lỗi tra cứu SĐT:', error);
    res.status(500).json({ error: 'Không thể tra cứu theo số điện thoại' });
  }
});

// 2. Lấy thống kê
app.get('/api/sos/stats', async (req, res) => {
  try {
    const stats = await getStats();
    res.json(stats);
  } catch (error) {
    console.error('Lỗi thống kê:', error);
    res.status(500).json({ error: 'Không thể lấy thống kê' });
  }
});

// 3. Tạo tin cứu trợ mới
app.post('/api/sos', async (req, res) => {
  try {
    const { name, phone, type, desc, lat, lng, status, id, time, pendingSync } = req.body || {};

    const trimmedName = String(name ?? '').trim();
    if (!trimmedName) {
      return res.status(400).json({ error: 'Họ tên không được để trống' });
    }

    const phoneCheck = validatePhone(phone);
    if (!phoneCheck.valid) {
      return res.status(400).json({ error: phoneCheck.error });
    }

    const trimmedDesc = String(desc ?? '').trim();
    if (!trimmedDesc) {
      return res.status(400).json({ error: 'Mô tả tình trạng cứu trợ không được để trống' });
    }

    const normalizedType = type ?? 'food';
    if (!VALID_TYPES.includes(normalizedType)) {
      return res.status(400).json({ error: 'Loại yêu cầu cứu trợ không hợp lệ' });
    }

    const normalizedStatus = status ?? 'pending';
    if (!VALID_STATUSES.includes(normalizedStatus)) {
      return res.status(400).json({ error: 'Trạng thái xử lý không hợp lệ' });
    }

    let finalLat = DEFAULT_LAT;
    let finalLng = DEFAULT_LNG;
    if (lat !== undefined || lng !== undefined) {
      const coordCheck = validateCoords(lat, lng);
      if (!coordCheck.valid) {
        return res.status(400).json({ error: coordCheck.error });
      }
      finalLat = coordCheck.lat;
      finalLng = coordCheck.lng;
    }

    const now = new Date();
    const timeString = now.toLocaleTimeString('vi-VN', { hour12: false });

    const { item, existed } = await createRequest({
      clientId: id,
      pendingSync: Boolean(pendingSync),
      data: {
        name: trimmedName,
        phone: phoneCheck.value,
        type: normalizedType,
        desc: trimmedDesc,
        status: normalizedStatus,
        lat: finalLat,
        lng: finalLng,
        time: typeof time === 'string' && time.trim() ? time.trim() : timeString,
        createdAt: now.toISOString(),
      },
    });

    if (existed) {
      return res.status(200).json(item);
    }

    console.log(`[SOS MỚI] #${item.id} - ${item.name} (${item.phone}) - Loại: ${item.type}`);
    res.status(201).json(item);
  } catch (error) {
    console.error('Lỗi tạo tin báo:', error);
    res.status(500).json({ error: 'Không thể lưu dữ liệu tin cứu trợ' });
  }
});

// 4. Cập nhật tin cứu trợ (yêu cầu quyền Admin)
const handleUpdate = async (req, res) => {
  try {
    const id = req.params.id || req.body?.id;
    if (!id) {
      return res.status(400).json({ error: 'Thiếu ID tin báo' });
    }

    const current = await findRequestById(id);
    if (!current) {
      return res.status(404).json({ error: 'Không tìm thấy tin báo' });
    }

    const body = req.body || {};
    const updates = {};

    if (body.name !== undefined) {
      const trimmedName = String(body.name).trim();
      if (!trimmedName) {
        return res.status(400).json({ error: 'Họ tên không được để trống' });
      }
      updates.name = trimmedName;
    }

    if (body.phone !== undefined) {
      const phoneCheck = validatePhone(body.phone);
      if (!phoneCheck.valid) {
        return res.status(400).json({ error: phoneCheck.error });
      }
      updates.phone = phoneCheck.value;
    }

    if (body.type !== undefined) {
      if (!VALID_TYPES.includes(body.type)) {
        return res.status(400).json({ error: 'Loại yêu cầu cứu trợ không hợp lệ' });
      }
      updates.type = body.type;
    }

    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status)) {
        return res.status(400).json({ error: 'Trạng thái xử lý không hợp lệ' });
      }
      updates.status = body.status;
    }

    if (body.desc !== undefined) {
      const trimmedDesc = String(body.desc).trim();
      if (!trimmedDesc) {
        return res.status(400).json({ error: 'Mô tả tình trạng không được để trống' });
      }
      updates.desc = trimmedDesc;
    }

    if (body.lat !== undefined || body.lng !== undefined) {
      const nextLat = body.lat !== undefined ? body.lat : current.lat;
      const nextLng = body.lng !== undefined ? body.lng : current.lng;
      const coordCheck = validateCoords(nextLat, nextLng);
      if (!coordCheck.valid) {
        return res.status(400).json({ error: coordCheck.error });
      }
      updates.lat = coordCheck.lat;
      updates.lng = coordCheck.lng;
    }

    const updated = await updateRequest(id, updates);
    if (!updated) {
      return res.status(404).json({ error: 'Không tìm thấy tin báo' });
    }

    console.log(`[CẬP NHẬT] #${id} - Trạng thái: ${updated.status}`);
    res.json(updated);
  } catch (error) {
    console.error('Lỗi cập nhật tin báo:', error);
    res.status(500).json({ error: 'Không thể cập nhật tin cứu trợ' });
  }
};

app.put('/api/sos/:id', requireAdmin, handleUpdate);
app.put('/api/sos', requireAdmin, handleUpdate);

// 5. Xóa tin cứu trợ (yêu cầu quyền Admin)
const handleDelete = async (req, res) => {
  try {
    const id = req.params.id || req.query.id || req.body?.id;
    if (!id) {
      return res.status(400).json({ error: 'Thiếu ID tin báo cần xóa' });
    }

    const deleted = await deleteRequest(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Không tìm thấy tin báo để xóa' });
    }

    console.log(`[ĐÃ XÓA] Tin báo #${id}`);
    res.json({ success: true, message: `Đã xóa tin #${id}` });
  } catch (error) {
    console.error('Lỗi xóa tin báo:', error);
    res.status(500).json({ error: 'Không thể xóa tin cứu trợ' });
  }
};

app.delete('/api/sos/:id', requireAdmin, handleDelete);
app.delete('/api/sos', requireAdmin, handleDelete);

// 6. API Đăng nhập / Xác thực / Đăng xuất Admin
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (password === ADMIN_PASSWORD || (username === 'admin' && password === '123456')) {
      const token = crypto.randomBytes(24).toString('hex');
      await saveSessionToken(token);
      res.json({
        success: true,
        user: { username: username || 'admin', role: 'admin' },
        token,
      });
    } else {
      res.status(401).json({ success: false, error: 'Sai mật khẩu điều hành!' });
    }
  } catch (error) {
    console.error('Lỗi đăng nhập:', error);
    res.status(500).json({ success: false, error: 'Lỗi máy chủ khi đăng nhập' });
  }
});

app.get('/api/auth/verify', requireAdmin, (req, res) => {
  res.json({ valid: true });
});

app.post('/api/logout', async (req, res) => {
  try {
    const token = extractBearerToken(req);
    await deleteSessionToken(token);
    res.json({ success: true });
  } catch {
    res.json({ success: true });
  }
});

// 7. Health check (kiểm tra trạng thái Server & Database)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: getStorageMode(),
    time: new Date().toISOString(),
  });
});

// =================== PHỤC VỤ GIAO DIỆN FRONTEND ===================
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(DIST_DIR, 'index.html'));
    }
    next();
  });
}

// Khởi tạo lưu trữ rồi mới bật Express server
initStorage()
  .then(({ mode }) => {
    app.listen(PORT, () => {
      const localhostUrl = `http://localhost:${PORT}`;
      console.log(`\n============================================================`);
      console.log(`🚀 HỆ THỐNG SOS ĐÀ NẴNG ĐANG CHẠY THÀNH CÔNG!`);
      console.log(`💾 Database:   ${mode === 'mongodb' ? 'MongoDB Cloud' : 'Local JSON (data/requests.json)'}`);
      console.log(`👉 Trình duyệt: ${localhostUrl}`);
      console.log(`👉 API:        ${localhostUrl}/api/sos`);
      console.log(`============================================================\n`);

      if (process.platform === 'win32' && !process.env.NO_OPEN && process.env.NODE_ENV !== 'production') {
        exec(`start ${localhostUrl}`);
      }
    });
  })
  .catch((error) => {
    console.error('❌ Không thể kết nối MongoDB. Kiểm tra lại MONGODB_URI:', error.message);
    process.exit(1);
  });
