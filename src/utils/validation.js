export const VALID_TYPES = ['medical', 'food', 'isolated'];
export const VALID_STATUSES = ['pending', 'in_progress', 'completed'];

/**
 * Chuẩn hóa số điện thoại về dạng chữ số bắt đầu bằng 0 để đối chiếu khi tra cứu.
 */
export function normalizePhoneDigits(rawPhone) {
  const digits = String(rawPhone ?? '').replace(/\D/g, '');
  if (digits.startsWith('84') && digits.length >= 11) {
    return `0${digits.slice(2)}`;
  }
  return digits;
}

/**
 * Chuẩn hóa và kiểm tra số điện thoại Việt Nam (9-11 chữ số, không chứa chữ cái).
 */
export function validatePhone(rawPhone) {
  const trimmed = String(rawPhone ?? '').trim();
  if (!trimmed) {
    return { valid: false, value: '', error: 'Vui lòng nhập số điện thoại!' };
  }
  if (/[^\d\s+().-]/.test(trimmed)) {
    return { valid: false, value: trimmed, error: 'Số điện thoại không được chứa chữ cái hoặc ký tự lạ!' };
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 9 || digits.length > 11) {
    return { valid: false, value: trimmed, error: 'Số điện thoại phải có từ 9 đến 11 chữ số!' };
  }
  return { valid: true, value: trimmed, error: null };
}

/**
 * Kiểm tra tọa độ địa lý (lat: -90..90, lng: -180..180).
 */
export function validateCoords(lat, lng) {
  if (lat === '' || lat === null || lat === undefined || lng === '' || lng === null || lng === undefined) {
    return { valid: false, error: 'Vui lòng nhập đầy đủ vĩ độ và kinh độ!' };
  }
  const numLat = Number(lat);
  const numLng = Number(lng);
  if (!Number.isFinite(numLat) || numLat < -90 || numLat > 90) {
    return { valid: false, error: 'Vĩ độ (Lat) phải là số trong khoảng -90 đến 90!' };
  }
  if (!Number.isFinite(numLng) || numLng < -180 || numLng > 180) {
    return { valid: false, error: 'Kinh độ (Lng) phải là số trong khoảng -180 đến 180!' };
  }
  return { valid: true, lat: Number(numLat.toFixed(5)), lng: Number(numLng.toFixed(5)), error: null };
}

/**
 * Kiểm tra bản ghi có tọa độ số hợp lệ để render bản đồ hay không.
 */
export function hasValidCoords(req) {
  const lat = Number(req?.lat);
  const lng = Number(req?.lng);
  return (
    req?.lat !== null &&
    req?.lat !== '' &&
    req?.lng !== null &&
    req?.lng !== '' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Định dạng tọa độ an toàn cho giao diện.
 */
export function formatCoord(value, digits = 5) {
  if (value === null || value === undefined || value === '') return 'N/A';
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(digits) : 'N/A';
}

