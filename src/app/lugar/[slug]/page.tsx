import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PLACES, PLACE_CATEGORIES, Place } from '@/data/places';
import { ROUTES } from '@/data/routes';
import {
  Compass,
  MapPin,
  Sparkles,
  ArrowLeft,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Route,
  Navigation,
  Calendar,
  Layers
} from 'lucide-react';

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

// Generate static routes for all 35+ places at build time (SSG)
export async function generateStaticParams() {
  return PLACES.map(place => ({
    slug: place.id
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const place = PLACES.find(p => p.id === slug);
  if (!place) {
    return { title: 'Lugar no encontrado | Paraná Pixelado' };
  }
  return {
    title: `${place.name} | Paraná Pixelado`,
    description: place.description
  };
}

export default async function LugarDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const placeIndex = PLACES.findIndex(p => p.id === slug);

  if (placeIndex === -1) {
    notFound();
  }

  const place = PLACES[placeIndex];
  const cat = PLACE_CATEGORIES[place.category];
  const numberStr = String(placeIndex + 1).padStart(2, '0');

  // Prev & Next places for cyclical navigation
  const prevPlace = placeIndex > 0 ? PLACES[placeIndex - 1] : PLACES[PLACES.length - 1];
  const nextPlace = placeIndex < PLACES.length - 1 ? PLACES[placeIndex + 1] : PLACES[0];

  // Check if place is part of any tourist route
  const relatedRoutes = ROUTES.filter(r => r.places.includes(place.id));

  // Related places of the same category
  const relatedPlaces = PLACES
    .filter(p => p.category === place.category && p.id !== place.id)
    .slice(0, 3);

  // Google Maps navigation link
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${place.coordinates.lat},${place.coordinates.lng}`;

  return (
    <div className="min-h-screen bg-[#f6f2ea] text-[#1c1917] font-sans selection:bg-[#c2410c] selection:text-white">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-[#faf6f0]/90 backdrop-blur-xl border-b border-[#e2d9c8]">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link
            href="/lugares"
            className="flex items-center gap-2 text-xs font-semibold text-[#1c1917] hover:text-[#c2410c] transition-colors bg-[#ede3d4] px-3.5 py-2 rounded-xl border border-[#e2d9c8]"
          >
            <ArrowLeft className="w-4 h-4 text-[#c2410c]" />
            <span>Ver Catálogo Completo</span>
          </Link>

          <Link
            href={`/?lugar=${place.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-[#c2410c] text-white hover:bg-[#9a3412] transition-colors shadow"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Ver en la Maqueta 3D</span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 py-10 space-y-10">
        {/* Breadcrumb & Number */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[#78716c]">
            <Link href="/" className="hover:text-[#1c1917]">Inicio</Link>
            <span>/</span>
            <Link href="/lugares" className="hover:text-[#1c1917]">Lugares</Link>
            <span>/</span>
            <span
              className="px-2 py-0.5 rounded-md font-semibold text-[11px]"
              style={{ backgroundColor: `${cat.color}15`, color: cat.color }}
            >
              {cat.name}
            </span>
          </div>

          <span
            className="w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-sm text-white shadow-md"
            style={{ backgroundColor: cat.color }}
          >
            {numberStr}
          </span>
        </div>

        {/* Hero Title Section */}
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-[#1c1917]">
            {place.name}
          </h1>
          <p className="text-base sm:text-lg text-[#c2410c] font-semibold">
            {place.subtitle}
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs text-[#78716c] pt-2 font-mono">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#78716c]" />
              {place.zone}
            </span>
            {place.year && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#78716c]" />
                Año: {place.year}
              </span>
            )}
            <span className="flex items-center gap-1.5 text-[#15803d]">
              <Navigation className="w-3.5 h-3.5" />
              {place.coordinates.lat.toFixed(4)}, {place.coordinates.lng.toFixed(4)}
            </span>
          </div>
        </div>

        {/* Main Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link
            href={`/?lugar=${place.id}`}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#c2410c] hover:bg-[#9a3412] text-white font-bold text-sm transition-all shadow-md hover:-translate-y-0.5"
          >
            <Compass className="w-4 h-4" />
            <span>Explorar en la Maqueta 3D</span>
          </Link>

          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-[#faf6f0] hover:bg-[#ede3d4] text-[#1c1917] border border-[#e2d9c8] font-semibold text-sm transition-colors shadow-sm"
          >
            <ExternalLink className="w-4 h-4 text-[#78716c]" />
            <span>Cómo llegar ↗ (Google Maps)</span>
          </a>
        </div>

        {/* Detailed Description */}
        <section className="bg-[#faf6f0] border border-[#e2d9c8] rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#78716c] mb-2 font-mono">
              Reseña Histórica y Arquitectónica
            </h2>
            <p className="text-sm sm:text-base text-[#44403c] leading-relaxed">
              {place.description}
            </p>
          </div>

          {/* Curiosity Highlight Box */}
          {place.curiosity && (
            <div className="bg-[#fffbeb] border border-[#fef3c7] rounded-2xl p-4 sm:p-5 flex items-start gap-3.5">
              <Sparkles className="w-5 h-5 text-[#b45309] shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs font-bold text-[#b45309] uppercase tracking-wide mb-1 font-mono">
                  Dato Curioso Entrerriano
                </h3>
                <p className="text-xs sm:text-sm text-[#92400e] leading-relaxed">
                  {place.curiosity}
                </p>
              </div>
            </div>
          )}
        </section>

        {/* In which route does this place appear? */}
        {relatedRoutes.length > 0 && (
          <section className="bg-[#faf6f0] border border-[#e2d9c8] rounded-3xl p-6 space-y-4 shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#78716c] font-mono flex items-center gap-2">
              <Route className="w-4 h-4 text-[#15803d]" />
              Circuitos Turísticos que incluyen este hito
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {relatedRoutes.map(route => (
                <div
                  key={route.id}
                  className="bg-[#f6f2ea] border border-[#e2d9c8] rounded-2xl p-4 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1c1917]">{route.name}</span>
                    <span className="text-[10px] text-[#78716c] font-mono">{route.duration}</span>
                  </div>
                  <p className="text-xs text-[#78716c] leading-snug">{route.subtitle}</p>
                  <div className="text-[10px] text-[#15803d] font-mono pt-1">
                    Transporte recomendado: {route.transport}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Next / Previous Cyclical Navigation Bar */}
        <nav className="flex items-center justify-between border-y border-[#e2d9c8] py-4 gap-3 text-xs">
          <Link
            href={`/lugar/${prevPlace.id}`}
            className="flex items-center gap-2 text-[#78716c] hover:text-[#1c1917] transition-colors group text-left"
          >
            <ChevronLeft className="w-4 h-4 text-[#c2410c] group-hover:-translate-x-0.5 transition-transform" />
            <div>
              <span className="text-[10px] text-[#a8a29e] block">← Anterior</span>
              <span className="font-semibold text-[#1c1917] group-hover:text-[#c2410c] truncate max-w-[140px] sm:max-w-none block">
                {prevPlace.name}
              </span>
            </div>
          </Link>

          <Link
            href={`/lugar/${nextPlace.id}`}
            className="flex items-center gap-2 text-[#78716c] hover:text-[#1c1917] transition-colors group text-right"
          >
            <div>
              <span className="text-[10px] text-[#a8a29e] block">Siguiente →</span>
              <span className="font-semibold text-[#1c1917] group-hover:text-[#c2410c] truncate max-w-[140px] sm:max-w-none block">
                {nextPlace.name}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-[#c2410c] group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </nav>

        {/* More from this category */}
        {relatedPlaces.length > 0 && (
          <section className="space-y-4 pt-4">
            <h2 className="text-base font-bold text-[#1c1917]">
              Más lugares en {cat.name}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {relatedPlaces.map(rPlace => (
                <Link
                  key={rPlace.id}
                  href={`/lugar/${rPlace.id}`}
                  className="bg-[#faf6f0] hover:bg-white border border-[#e2d9c8] hover:border-[#c2410c]/40 rounded-2xl p-4 transition-all duration-200 block group shadow-sm hover:shadow"
                >
                  <span className="text-[10px] font-mono text-[#78716c] block mb-1">
                    {rPlace.zone}
                  </span>
                  <h3 className="text-sm font-bold text-[#1c1917] group-hover:text-[#c2410c] transition-colors line-clamp-1">
                    {rPlace.name}
                  </h3>
                  <p className="text-xs text-[#78716c] line-clamp-2 mt-1">
                    {rPlace.subtitle}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e2d9c8] bg-[#faf6f0] px-4 py-8 text-xs text-[#78716c] mt-16">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Paraná Pixelado • Inspirado en santafepixelado.com</p>
          <p>
            Información y cartografía libre de{' '}
            <a href="https://www.openstreetmap.org" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#1c1917]">
              OpenStreetMap
            </a>{' '}
            y Wikimedia Commons.
          </p>
        </div>
      </footer>
    </div>
  );
}
