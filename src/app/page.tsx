'use client';

import dynamic from 'next/dynamic';

// Dynamically import the 3D Map without SSR to prevent WebGL hydration mismatches
const ParanaMap3D = dynamic(() => import('@/components/map/ParanaMap3D'), {
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

export default function Home() {
  return (
    <main className="w-full h-screen overflow-hidden bg-slate-950">
      <ParanaMap3D />
    </main>
  );
}
