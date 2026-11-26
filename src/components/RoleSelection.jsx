import React from 'react';
import { Activity, User, Shield, Search } from 'lucide-react';

const RoleSelection = ({ onSelect, onLookup, requests = [] }) => {
  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 py-10 pb-24 text-white relative font-sans w-full">
      {/* Hiệu ứng nền */}
      <div className="absolute inset-0 opacity-25 pointer-events-none">
        <div className="absolute top-10 left-10 w-48 h-48 bg-red-600 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-64 h-64 bg-blue-600 rounded-full blur-[120px] animate-pulse delay-700"></div>
      </div>

      {/* Header */}
      <div className="mb-8 md:mb-10 text-center z-10 animate-fade-in-up">
        <div className="inline-flex p-3.5 md:p-4 rounded-3xl bg-red-600/90 mb-3.5 animate-pulse ring-8 ring-red-600/20 shadow-2xl shadow-red-600/40">
          <Activity size={40} className="text-white" />
        </div>
        <h1 className="text-3xl md:text-5xl font-black mb-2.5 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
          SOS ĐÀ NẴNG
        </h1>
        <p className="text-slate-400 text-xs md:text-base max-w-md mx-auto leading-relaxed">
          Hệ thống điều phối cứu trợ bão lũ & khẩn cấp thông minh theo thời gian thực
        </p>

        {/* Live Status Badge */}
        <div className="mt-3.5 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          <span>Đang có <strong className="text-red-400 font-bold">{pendingCount}</strong> tin báo khẩn cấp cần tiếp nhận</span>
        </div>
      </div>

      {/* 2 Lựa chọn vai trò */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 w-full max-w-2xl z-10 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
        {/* Vai trò 1: Người dân */}
        <button
          onClick={() => onSelect('citizen')}
          className="flex flex-col items-center p-6 md:p-8 bg-slate-900/80 backdrop-blur-md rounded-3xl hover:bg-slate-800/90 transition-all duration-300 border-2 border-slate-800 hover:border-red-500 group shadow-xl hover:shadow-red-900/30 cursor-pointer transform hover:-translate-y-1 text-center"
        >
          <div className="p-4 md:p-5 bg-red-600/10 rounded-2xl mb-4 md:mb-5 group-hover:scale-110 group-hover:bg-red-600 text-red-500 group-hover:text-white transition duration-300">
            <User size={34} />
          </div>
          <span className="text-xl md:text-2xl font-black text-white group-hover:text-red-400 transition">Tôi Cần Giúp Đỡ</span>
          <span className="text-xs text-slate-400 mt-2 leading-relaxed">
            Gửi tín hiệu SOS khẩn cấp kèm tọa độ GPS trực tiếp tới đội cứu hộ
          </span>
          <span className="mt-3.5 px-3 py-1 bg-red-500/10 text-red-400 text-[11px] font-bold rounded-full group-hover:bg-red-500/20">
            Dành cho người dân
          </span>
        </button>

        {/* Vai trò 2: Trung tâm Điều hành */}
        <button
          onClick={() => onSelect('operations')}
          className="flex flex-col items-center p-6 md:p-8 bg-slate-900/80 backdrop-blur-md rounded-3xl hover:bg-slate-800/90 transition-all duration-300 border-2 border-slate-800 hover:border-blue-500 group shadow-xl hover:shadow-blue-900/30 cursor-pointer transform hover:-translate-y-1 text-center"
        >
          <div className="p-4 md:p-5 bg-blue-600/10 rounded-2xl mb-4 md:mb-5 group-hover:scale-110 group-hover:bg-blue-600 text-blue-500 group-hover:text-white transition duration-300">
            <Shield size={34} />
          </div>
          <span className="text-xl md:text-2xl font-black text-white group-hover:text-blue-400 transition">Trung Tâm Điều Hành</span>
          <span className="text-xs text-slate-400 mt-2 leading-relaxed">
            Xem bản đồ trực quan, quản lý dữ liệu và điều phối các đội cứu nạn
          </span>
          <span className="mt-3.5 px-3 py-1 bg-blue-500/10 text-blue-400 text-[11px] font-bold rounded-full group-hover:bg-blue-500/20">
            Dành cho Đội cứu hộ (Admin)
          </span>
        </button>
      </div>

      {/* Nút tra cứu nhanh đơn đã gửi */}
      {onLookup && (
        <button
          type="button"
          onClick={onLookup}
          className="mt-6 z-10 inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-amber-400/60 text-slate-200 hover:text-amber-300 text-xs md:text-sm font-bold transition shadow-lg cursor-pointer animate-fade-in-up"
          style={{ animationDelay: '0.25s' }}
        >
          <Search size={16} className="text-amber-400" />
          Đã gửi yêu cầu trước đó? Tra cứu tình trạng bằng Số điện thoại
        </button>
      )}

      {/* Footer */}
      <footer className="mt-8 text-center text-xs text-slate-500 z-10">
        SOS Đà Nẵng — Hệ thống điều phối cứu hộ thông minh
      </footer>
    </div>
  );
};

export default RoleSelection;
