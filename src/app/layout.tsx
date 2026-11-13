import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Paraná Pixelado | Arquitectura GIS & Topografía',
  description: 'Exploración voxelizada e interactiva de la Ciudad de Paraná, Entre Ríos, Argentina.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-slate-950 text-slate-100 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
