/** Cargos con acceso al módulo de KPIs (lo usan el componente y el menú para ocultar la opción). */
export function puedeVerKpis(cargo: string | null | undefined): boolean {
  const c = cargo ?? '';
  return c=='ADMINISTRADOR SISAS' || c=='DIRECTOR INTERNACIONAL' ||
         c.startsWith('DIRECTOR NACIONAL') || c=='JEFE SCOUT NACIONAL' ||
         c=='SUB JEFE SCOUT NACIONAL';
}
