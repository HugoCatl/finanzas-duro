// Se muestra al instante al cambiar de pantalla mientras llegan los datos: la forma de la página en gris
// plano, para que nada salte cuando se pinta de verdad.
function Bar({ className }: { className: string }) {
  return <div className={`rounded-md bg-line ${className}`} />;
}

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Cargando" className="animate-fade-in pt-4 lg:pt-0">
      <Bar className="h-7 w-36" />
      <Bar className="mt-5 h-10 w-56" />
      <Bar className="mt-3 h-4 w-44" />
      <div className="mt-7 grid gap-4 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-card bg-surface p-5">
            <Bar className="h-5 w-32" />
            <div className="mt-5 flex flex-col gap-4">
              <Bar className="h-4 w-full" />
              <Bar className="h-4 w-4/5" />
              <Bar className="h-4 w-3/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
