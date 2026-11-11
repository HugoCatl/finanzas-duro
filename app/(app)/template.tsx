// Se vuelve a montar en cada navegación: los bloques de la pantalla entran escalonados (ver .stagger).
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <div className="stagger contents">{children}</div>;
}
