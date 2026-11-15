// Nombres del emisor tal como los exige la DGII en la factura impresa (Norma
// General 06-2018 y Informe Técnico e-CF, sección 18.2.1): arriba el nombre
// comercial "si lo hubiera" y debajo la razón social "como consta en el RNC".
// Ambos vienen del padrón de la DGII (los fija el servidor al crear la empresa);
// las empresas creadas antes de este cambio solo tienen `nombreNegocio`, que se
// usa como razón social.
export interface NombresTenant {
  nombreNegocio: string;
  razonSocial?: string;
  nombreComercial?: string;
}

export function nombresImpresion(t: NombresTenant): { nombre: string; nombreComercial?: string } {
  return {
    nombre: t.razonSocial ?? t.nombreNegocio,
    ...(t.nombreComercial ? { nombreComercial: t.nombreComercial } : {}),
  };
}
