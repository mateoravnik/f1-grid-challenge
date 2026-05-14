import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], weight: ['400', '600', '700', '900'] });

export const metadata: Metadata = {
  title: 'F1 Grid Challenge',
  description: 'El juego de Fórmula 1 tipo Immaculate Grid. ¿Cuánto sabes de los pilotos de F1?',
  openGraph: {
    title: 'F1 Grid Challenge',
    description: '¿Puedes completar la grilla de F1?',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body className={`${inter.className} bg-f1dark text-white min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
