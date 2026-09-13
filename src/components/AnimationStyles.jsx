import React from 'react';

const AnimationStyles = () => (
  <style>{`
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .animate-fade-in-up { animation: fadeInUp 0.5s ease-out forwards; }
    
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
    
    @keyframes fadeInRight { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
    .animate-fade-in-right { animation: fadeInRight 0.3s ease-out forwards; }

    /* CSS cho bản đồ Leaflet */
    .leaflet-container { background: #e5e5f7; width: 100%; height: 100%; z-index: 0; }
    .custom-leaflet-icon { background: transparent !important; border: none !important; }

    .scrollbar-hide::-webkit-scrollbar { display: none; }
    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
  `}</style>
);

export default AnimationStyles;