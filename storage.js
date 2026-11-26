import fs from 'fs';
import path from 'path';
import dns from 'dns';
import { fileURLToPath } from 'url';
import { MongoClient } from 'mongodb';
import { normalizePhoneDigits } from './src/utils/validation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'requests.json');

const SEED_DATA = [
  {
    id: 1700000001,
    name: 'Nguyễn Văn An',
    phone: '0905123456',
    type: 'medical',
    desc: 'Người già khó thở cần oxy khẩn cấp, nước bắt đầu tràn vào nhà.',
    status: 'pending',
    lat: 16.0611,
    lng: 108.2208,
    time: '08:30:15',
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
    time: '09:15:40',
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
    time: '09:45:10',
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
    time: '07:10:00',
  },
];

let storageMode = 'json-file';
let mongoClient = null;
let requestsCol = null;
let sessionsCol = null;
const localTokens = new Set();

function initJsonFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(SEED_DATA, null, 2), 'utf-8');
    console.log('✅ Đã tạo dữ liệu mẫu ban đầu tại data/requests.json');
  }
}

function readJsonRequests() {
  try {
    initJsonFile();
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Lỗi đọc file dữ liệu:', error);
    return [];
  }
}

function writeJsonRequests(requests) {
  try {
    initJsonFile();
    const tempFile = `${DATA_FILE}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(requests, null, 2), 'utf-8');
    fs.renameSync(tempFile, DATA_FILE);
    return true;
  } catch (error) {
    console.error('Lỗi ghi file dữ liệu:', error);
    return false;
  }
}

function generateUniqueId(existingIds) {
  let candidate = Date.now();
  while (existingIds.has(String(candidate))) {
    candidate += 1;
  }
  return candidate;
}

export async function initStorage() {
  const uri = (process.env.MONGODB_URI || '').trim();
  if (!uri) {
    initJsonFile();
    storageMode = 'json-file';
    console.log('ℹ️  Chưa cấu hình MONGODB_URI — đang dùng lưu trữ cục bộ (data/requests.json)');
    return { mode: storageMode };
  }

  const dbName = (process.env.MONGODB_DB || 'sos_danang').trim();
  mongoClient = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
  try {
    await mongoClient.connect();
  } catch (err) {
    // Một số mạng/router tại VN chặn hoặc lỗi phân giải DNS SRV (_mongodb._tcp) -> thử lại với Google/Cloudflare DNS
    if (String(err?.message || '').includes('querySrv')) {
      dns.setServers(['8.8.8.8', '1.1.1.1']);
      mongoClient = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
      await mongoClient.connect();
    } else {
      throw err;
    }
  }

  const db = mongoClient.db(dbName);
  requestsCol = db.collection('requests');
  sessionsCol = db.collection('sessions');

  await requestsCol.createIndex({ id: 1 }, { unique: true });
  await sessionsCol.createIndex({ token: 1 }, { unique: true });
  await sessionsCol.createIndex({ createdAt: 1 }, { expireAfterSeconds: 86400 });

  const count = await requestsCol.countDocuments();
  if (count === 0) {
    const initialDocs = fs.existsSync(DATA_FILE) ? readJsonRequests() : SEED_DATA;
    if (initialDocs.length > 0) {
      await requestsCol.insertMany(initialDocs.map((doc) => ({ ...doc })));
      console.log(`✅ Đã nạp ${initialDocs.length} tin mẫu lên MongoDB (${dbName}.requests)`);
    }
  }

  storageMode = 'mongodb';
  console.log(`✅ Đã kết nối MongoDB Cloud thành công (Database: ${dbName})`);
  return { mode: storageMode, dbName };
}

export function getStorageMode() {
  return storageMode;
}

export async function listRequests() {
  if (storageMode === 'mongodb') {
    return await requestsCol.find({}, { projection: { _id: 0 } }).sort({ id: -1 }).toArray();
  }
  return readJsonRequests();
}

export async function getStats() {
  const requests = await listRequests();
  return {
    total: requests.length,
    pending: requests.filter((r) => r.status === 'pending').length,
    in_progress: requests.filter((r) => r.status === 'in_progress').length,
    completed: requests.filter((r) => r.status === 'completed').length,
  };
}

export async function lookupRequestsByPhone(phone) {
  const targetPhone = normalizePhoneDigits(phone);
  const requests = await listRequests();
  return requests.filter((r) => normalizePhoneDigits(r.phone) === targetPhone);
}

export async function createRequest({ clientId, pendingSync, data }) {
  const numericId = Number(clientId);
  const hasValidClientId = Number.isInteger(numericId) && numericId > 0;

  if (storageMode === 'mongodb') {
    if (hasValidClientId) {
      const existing = await requestsCol.findOne({ id: numericId }, { projection: { _id: 0 } });
      if (existing) {
        return { item: existing, existed: true };
      }
    }

    let finalId = pendingSync && hasValidClientId ? numericId : Date.now();
    // Tránh trùng ID nếu 2 yêu cầu tới trong cùng 1 ms
    while (await requestsCol.findOne({ id: finalId }, { projection: { _id: 1 } })) {
      finalId += 1;
    }

    const newRequest = { id: finalId, ...data };
    await requestsCol.insertOne({ ...newRequest });
    return { item: newRequest, existed: false };
  }

  const requests = readJsonRequests();
  if (hasValidClientId) {
    const existing = requests.find((r) => String(r.id) === String(numericId));
    if (existing) {
      return { item: existing, existed: true };
    }
  }

  const existingIds = new Set(requests.map((r) => String(r.id)));
  const finalId = pendingSync && hasValidClientId ? numericId : generateUniqueId(existingIds);
  const newRequest = { id: finalId, ...data };

  requests.unshift(newRequest);
  if (!writeJsonRequests(requests)) {
    throw new Error('Không thể lưu dữ liệu tin cứu trợ');
  }
  return { item: newRequest, existed: false };
}

export async function findRequestById(id) {
  if (storageMode === 'mongodb') {
    const numId = Number(id);
    return await requestsCol.findOne(
      Number.isFinite(numId) ? { $or: [{ id: numId }, { id: String(id) }] } : { id: String(id) },
      { projection: { _id: 0 } }
    );
  }
  const requests = readJsonRequests();
  return requests.find((r) => String(r.id) === String(id)) || null;
}

export async function updateRequest(id, updates) {
  if (storageMode === 'mongodb') {
    const numId = Number(id);
    const filter = Number.isFinite(numId)
      ? { $or: [{ id: numId }, { id: String(id) }] }
      : { id: String(id) };

    const result = await requestsCol.findOneAndUpdate(
      filter,
      { $set: { ...updates, updatedAt: new Date().toISOString() } },
      { returnDocument: 'after', projection: { _id: 0 } }
    );
    return result || null;
  }

  const requests = readJsonRequests();
  const index = requests.findIndex((r) => String(r.id) === String(id));
  if (index === -1) return null;

  requests[index] = {
    ...requests[index],
    ...updates,
    id: requests[index].id,
    updatedAt: new Date().toISOString(),
  };

  if (!writeJsonRequests(requests)) {
    throw new Error('Không thể lưu cập nhật tin cứu trợ');
  }
  return requests[index];
}

export async function deleteRequest(id) {
  if (storageMode === 'mongodb') {
    const numId = Number(id);
    const filter = Number.isFinite(numId)
      ? { $or: [{ id: numId }, { id: String(id) }] }
      : { id: String(id) };
    const result = await requestsCol.deleteOne(filter);
    return result.deletedCount > 0;
  }

  const requests = readJsonRequests();
  const initialLength = requests.length;
  const filtered = requests.filter((r) => String(r.id) !== String(id));
  if (filtered.length === initialLength) return false;

  if (!writeJsonRequests(filtered)) {
    throw new Error('Không thể lưu thay đổi khi xóa tin báo');
  }
  return true;
}

export async function saveSessionToken(token) {
  if (storageMode === 'mongodb') {
    await sessionsCol.insertOne({ token, createdAt: new Date() });
    return;
  }
  localTokens.add(token);
}

export async function hasSessionToken(token) {
  if (!token) return false;
  if (storageMode === 'mongodb') {
    const doc = await sessionsCol.findOne({ token }, { projection: { _id: 1 } });
    return Boolean(doc);
  }
  return localTokens.has(token);
}

export async function deleteSessionToken(token) {
  if (!token) return;
  if (storageMode === 'mongodb') {
    await sessionsCol.deleteOne({ token });
    return;
  }
  localTokens.delete(token);
}
