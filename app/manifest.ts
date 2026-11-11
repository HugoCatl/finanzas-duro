import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Finanzas',
    short_name: 'Finanzas',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0b',
    theme_color: '#0a0a0b',
    // Al mantener pulsado el icono (Android y escritorio; el iPhone no los muestra en apps web).
    shortcuts: [
      { name: 'Nuevo gasto', short_name: 'Gasto', url: '/?nuevo=gasto', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
      { name: 'Nuevo ingreso', short_name: 'Ingreso', url: '/?nuevo=ingreso', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
      { name: 'Nuevo traspaso', short_name: 'Traspaso', url: '/?nuevo=traspaso', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
    ],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
