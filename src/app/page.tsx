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
    <main className="w-full h-screen overflow-hidden bg-[#f3ede2]">
      {/* Accessible Noscript Fallback for Screen Readers & Non-JS Browsers */}
      <noscript>
        <div className="fixed inset-0 z-50 bg-[#faf6f0] text-[#1c1917] p-8 overflow-y-auto">
          <div className="max-w-2xl mx-auto space-y-4">
            <h1 className="text-3xl font-bold text-[#c2410c]">Paraná Pixelado</h1>
            <p className="text-[#78716c]">
              Paraná Pixelado es un mapa y maqueta 3D interactiva que recrea la topografía y los edificios
              icónicos de la ciudad de Paraná (Entre Ríos, Argentina).
            </p>
            <p className="text-[#78716c]">
              Para visualizar el mapa tridimensional se requiere habilitar JavaScript y compatibilidad con WebGL.
            </p>
            <div className="pt-4">
              <Link
                href="/lugares"
                className="inline-block px-5 py-3 rounded-xl bg-[#c2410c] text-white font-bold hover:bg-[#9a3412]"
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
