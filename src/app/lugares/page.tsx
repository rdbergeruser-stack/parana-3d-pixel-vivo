import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PLACES, PLACE_CATEGORIES, PlaceCategory } from '@/data/places';
import { ROUTES } from '@/data/routes';
import {
  Compass,
  MapPin,
  Sparkles,
  ArrowLeft,
  ExternalLink,
  ChevronRight,
  Layers,
  Search
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Catálogo de Lugares Emblemáticos | Paraná Pixelado',
  description: 'Guía y catálogo completo de los 35+ lugares históricos, culturales y naturales de Paraná, Entre Ríos.',
};

export default function LugaresCatalogPage() {
  const categories = Object.keys(PLACE_CATEGORIES) as PlaceCategory[];

  return (
    <div className="min-h-screen bg-[#f6f2ea] text-[#1c1917] font-sans selection:bg-[#c2410c] selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-[#faf6f0]/90 backdrop-blur-xl border-b border-[#e2d9c8]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-semibold text-[#1c1917] hover:text-[#c2410c] transition-colors bg-[#ede3d4] px-3.5 py-2 rounded-xl border border-[#e2d9c8]"
          >
            <ArrowLeft className="w-4 h-4 text-[#c2410c]" />
            <span>Volver a la Maqueta 3D</span>
          </Link>

          <div className="flex items-center gap-2 text-right">
            <div className="w-8 h-8 rounded-lg bg-[#c2410c]/15 text-[#c2410c] border border-[#c2410c]/30 flex items-center justify-center font-bold text-sm">
              P
            </div>
            <div className="hidden sm:block text-left">
              <span className="text-sm font-bold block leading-tight text-[#1c1917]">Paraná Pixelado</span>
              <span className="text-[10px] text-[#78716c] block leading-tight">Catálogo General de Hitos</span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="border-b border-[#e2d9c8] bg-gradient-to-b from-[#faf6f0] to-[#f6f2ea] px-4 py-12">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c2410c]/10 border border-[#c2410c]/20 text-[#c2410c] text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-[#c2410c]" />
            <span>Patrimonio Vivo de Entre Ríos</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-[#1c1917]">
            Lugares Emblemáticos de Paraná
          </h1>
          <p className="text-[#78716c] max-w-2xl text-sm md:text-base leading-relaxed">
            Explorá el patrimonio histórico de la Capital de la Confederación Argentina, los miradores
            panorámicos sobre las barrancas del Parque Urquiza y las playas del Río Paraná.
          </p>

          {/* KPI Summary */}
          <div className="flex flex-wrap items-center gap-6 pt-3 text-xs text-[#78716c] font-mono">
            <span><strong>{PLACES.length}</strong> Lugares Verificados</span>
            <span>•</span>
            <span><strong>{ROUTES.length}</strong> Circuitos Turísticos</span>
            <span>•</span>
            <span><strong>5</strong> Categorías Oficiales</span>
          </div>
        </div>
      </section>

      {/* Catalog Grouped by Categories */}
      <main className="max-w-6xl mx-auto px-4 py-10 space-y-14">
        {categories.map(catKey => {
          const cat = PLACE_CATEGORIES[catKey];
          const catPlaces = PLACES.filter(p => p.category === catKey);

          if (catPlaces.length === 0) return null;

          return (
            <section key={catKey} id={catKey} className="space-y-6">
              {/* Category Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#e2d9c8] gap-2">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-8 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold text-[#1c1917]">
                      {cat.name}
                    </h2>
                    <p className="text-xs text-[#78716c]">{cat.description}</p>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#faf6f0] border border-[#e2d9c8] text-[#1c1917] self-start sm:self-auto font-mono">
                  {catPlaces.length} lugares
                </span>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {catPlaces.map((place) => {
                  const placeIndex = PLACES.findIndex(p => p.id === place.id) + 1;
                  const numberStr = String(placeIndex).padStart(2, '0');

                  return (
                    <article
                      key={place.id}
                      className="group bg-[#faf6f0] hover:bg-white border border-[#e2d9c8] hover:border-[#c2410c]/40 rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5"
                    >
                      <div className="space-y-3">
                        {/* Top Badge & Number */}
                        <div className="flex items-center justify-between">
                          <span
                            className="w-7 h-7 rounded-xl flex items-center justify-center font-mono font-bold text-xs text-white shadow-sm"
                            style={{ backgroundColor: cat.color }}
                          >
                            {numberStr}
                          </span>
                          <span className="text-[11px] font-mono text-[#78716c] flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[#78716c]" />
                            {place.zone}
                          </span>
                        </div>

                        {/* Title & Subtitle */}
                        <div>
                          <h3 className="text-base font-bold text-[#1c1917] group-hover:text-[#c2410c] transition-colors">
                            {place.name}
                          </h3>
                          <p className="text-xs text-[#78716c] font-medium">
                            {place.subtitle}
                          </p>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-[#44403c] leading-relaxed line-clamp-3">
                          {place.description}
                        </p>

                        {/* Curiosity box */}
                        {place.curiosity && (
                          <div className="bg-[#fffbeb] border border-[#fef3c7] rounded-xl p-2.5 text-[11px] text-[#92400e] flex items-start gap-2">
                            <Sparkles className="w-3.5 h-3.5 text-[#b45309] shrink-0 mt-0.5" />
                            <p className="line-clamp-2 leading-snug">{place.curiosity}</p>
                          </div>
                        )}
                      </div>

                      {/* Action Links */}
                      <div className="pt-4 mt-4 border-t border-[#e2d9c8] flex items-center justify-between gap-2">
                        <Link
                          href={`/lugar/${place.id}`}
                          className="text-xs text-[#1c1917] hover:text-[#c2410c] font-semibold flex items-center gap-1 transition-colors"
                        >
                          <span>Ficha completa</span>
                          <ChevronRight className="w-3.5 h-3.5 text-[#78716c]" />
                        </Link>

                        <Link
                          href={`/?lugar=${place.id}`}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-[#c2410c]/10 text-[#c2410c] hover:bg-[#c2410c] hover:text-white transition-colors border border-[#c2410c]/25"
                        >
                          <Compass className="w-3.5 h-3.5" />
                          <span>Ver en 3D</span>
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e2d9c8] bg-[#faf6f0] px-4 py-8 text-xs text-[#78716c]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Paraná Pixelado • Inspirado en santafepixelado.com</p>
          <p>
            Datos geográficos cortesía de{' '}
            <a href="https://www.openstreetmap.org" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#1c1917]">
              OpenStreetMap
            </a>{' '}
            y Archivo Histórico de Entre Ríos.
          </p>
        </div>
      </footer>
    </div>
  );
}
