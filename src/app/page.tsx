import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import MapViewerWrapper from '@/components/map/MapViewerWrapper';

export const metadata: Metadata = {
  title: 'Paraná Pixelado | Maqueta 3D Interactiva & Topografía',
  description: 'Explorá la ciudad de Paraná (Entre Ríos, Argentina) en una maqueta 3D interactiva con sus barrancas, el Río Paraná y sus hitos históricos.',
};

export default function Home() {
  return (
    <main className="w-full h-screen overflow-hidden bg-slate-950">
      {/* Accessible Noscript Fallback for Screen Readers & Non-JS Browsers */}
      <noscript>
        <div className="fixed inset-0 z-50 bg-slate-950 text-white p-8 overflow-y-auto">
          <div className="max-w-2xl mx-auto space-y-4">
            <h1 className="text-3xl font-bold text-amber-400">Paraná Pixelado</h1>
            <p className="text-slate-300">
              Paraná Pixelado es un mapa y maqueta 3D interactiva que recrea la topografía y los edificios
              icónicos de la ciudad de Paraná (Entre Ríos, Argentina).
            </p>
            <p className="text-slate-300">
              Para visualizar el mapa tridimensional se requiere habilitar JavaScript y compatibilidad con WebGL.
            </p>
            <div className="pt-4">
              <Link
                href="/lugares"
                className="inline-block px-5 py-3 rounded-xl bg-amber-500 text-slate-950 font-bold hover:bg-amber-400"
              >
                Ver Catálogo Accesible de Lugares →
              </Link>
            </div>
          </div>
        </div>
      </noscript>

      <MapViewerWrapper />
    </main>
  );
}
