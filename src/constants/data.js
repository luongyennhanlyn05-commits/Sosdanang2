import { Ambulance, Package, Home } from 'lucide-react';

export const REQUEST_TYPES = {
  MEDICAL: { id: 'medical', label: 'Cần y tế gấp', icon: Ambulance, color: 'bg-red-500', textColor: 'text-red-600' },
  FOOD: { id: 'food', label: 'Thiếu lương thực', icon: Package, color: 'bg-orange-500', textColor: 'text-orange-600' },
  ISOLATED: { id: 'isolated', label: 'Nhà bị cô lập', icon: Home, color: 'bg-yellow-500', textColor: 'text-yellow-600' },
};

export const STATUS = {
  PENDING: { id: 'pending', label: 'Chờ tiếp nhận', color: 'bg-gray-400', badge: 'bg-gray-100 text-gray-600' },
  IN_PROGRESS: { id: 'in_progress', label: 'Đang cứu hộ', color: 'bg-blue-500', badge: 'bg-blue-100 text-blue-600' },
  COMPLETED: { id: 'completed', label: 'Đã hoàn thành', color: 'bg-green-500', badge: 'bg-green-100 text-green-600' },
};