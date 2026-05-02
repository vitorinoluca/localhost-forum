export function getContactEmail(): string | undefined {
  const value = import.meta.env.VITE_CONTACT_EMAIL?.trim();
  return value === '' ? undefined : value;
}

export function getSiteOperatorLabel(): string {
  const value = import.meta.env.VITE_SITE_OPERATOR_NAME?.trim();
  return value || 'el responsable del sitio';
}

export function getLegalJurisdictionClause(): string {
  const value = import.meta.env.VITE_LEGAL_JURISDICTION?.trim();
  return (
    value ||
    'las normas aplicables según el domicilio del responsable del tratamiento o del prestador del servicio'
  );
}
