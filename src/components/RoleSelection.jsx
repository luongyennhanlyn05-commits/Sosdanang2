import React from 'react';
import { Activity, User, Shield } from 'lucide-react';

const RoleSelection = ({ onSelect }) => (
  <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white relative overflow-hidden font-sans">
    <div className="absolute inset-0 opacity-20 pointer-events-none">
       <div className="absolute top-10 left-10 w-32 h-32 bg-red-500 rounded-full blur-3xl animate-pulse"></div>
       <div className="absolute bottom-10 right-10 w-40 h-40 bg-blue-500 rounded-full blur-3xl animate-pulse delay-700"></div>
    </div>

    <div className="mb-8 text-center z-10 animate-fade-in-up">
      <div className="inline-block p-4 rounded-full bg-red-600 mb-4 animate-pulse ring-4 ring-red-900/50">
        <Activity size={48} />
      </div>
      <h1 className="text-5xl font-extrabold mb-2 tracking-tight">SOS VIETNAM</h1>
      <p className="text-slate-400 text-lg">Hệ thống điều phối cứu trợ khẩn cấp thông minh</p>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl z-10 animate-fade-in-up" style={{animationDelay: '0.2s'}}>
      <button onClick={() => onSelect('citizen')} className="flex flex-col items-center p-8 bg-slate-800/80 backdrop-blur rounded-2xl hover:bg-slate-700 transition border-2 border-transparent hover:border-red-500 group shadow-lg hover:shadow-red-900/20">
        <div className="p-4 bg-slate-900 rounded-full mb-4 group-hover:scale-110 transition duration-300">
           <User size={40} className="text-red-500" />
        </div>
        <span className="text-2xl font-bold">Tôi cần giúp đỡ</span>
        <span className="text-sm text-slate-400 mt-2 text-center">Gửi tín hiệu SOS</span>
      </button>

      <button onClick={() => onSelect('operations')} className="flex flex-col items-center p-8 bg-slate-800/80 backdrop-blur rounded-2xl hover:bg-slate-700 transition border-2 border-transparent hover:border-blue-500 group shadow-lg hover:shadow-blue-900/20">
         <div className="p-4 bg-slate-900 rounded-full mb-4 group-hover:scale-110 transition duration-300">
            <Shield size={40} className="text-blue-500" />
        </div>
        <span className="text-2xl font-bold">Trung tâm Điều hành</span>
        <span className="text-sm text-slate-400 mt-2 text-center">Quản lý & Điều phối cứu hộ</span>
      </button>
    </div>
  </div>
);

export default RoleSelection;