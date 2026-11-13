'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';

const ParanaMap3D = dynamic(() => import('./ParanaMap3D'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-3">
      <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm font-medium text-slate-300">
        Iniciando motor 3D y cargando maqueta de Paraná...
      </p>
    </div>
  )
});

export default function MapViewerWrapper() {
  return (
    <Suspense
      fallback={
        <div className="w-full h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-3">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-300">
            Cargando Paraná Pixelado...
          </p>
        </div>
      }
    >
      <ParanaMap3D />
    </Suspense>
  );
}
