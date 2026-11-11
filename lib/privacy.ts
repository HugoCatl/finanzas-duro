// Compartido por el layout raíz (servidor) y el botón (cliente): no puede vivir en un módulo 'use client'.
export const PRIVACY_KEY = 'finanzas:privado';

/** Se ejecuta antes de pintar para que las cifras no se vean ni un instante al abrir en modo privado. */
export const PRIVACY_BOOT = `try{if(localStorage.getItem('${PRIVACY_KEY}')==='1')document.documentElement.dataset.private=''}catch(e){}`;
