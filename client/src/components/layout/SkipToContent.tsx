/**
 * Enlace al contenido principal: mejora accesibilidad (teclado / lectores de pantalla) y buenas prácticas WCAG.
 */
export function SkipToContent() {
  return (
    <a
      className='pointer-events-none fixed left-4 top-4 z-[100] -translate-y-24 rounded-sm bg-[#3b82f6] px-4 py-2 text-xs font-bold uppercase tracking-widest text-white opacity-0 outline-none ring-2 ring-white transition focus:pointer-events-auto focus:translate-y-0 focus:opacity-100'
      href='#main-content'
    >
      Saltar al contenido
    </a>
  );
}
