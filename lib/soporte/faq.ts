export interface PreguntaFrecuente {
  id:            string;
  pregunta:      string;
  respuesta:     string;
  palabrasClave: string[];
}

export const FAQ: PreguntaFrecuente[] = [
  {
    id: "que-es-sandbox",
    pregunta: "¿Qué es el entorno de prueba (sandbox)?",
    respuesta: "Es una copia funcional del sistema donde puedes crear clientes, productos, facturas y cotizaciones de ejemplo. Nada se envía a la DGII real — te sirve para conocer el sistema antes de certificarte.",
    palabrasClave: ["sandbox", "prueba", "pruebas", "entorno", "demo", "probar", "simulado", "simulacion"],
  },
  {
    id: "cuando-certificacion",
    pregunta: "¿Cuándo voy a poder certificarme ante la DGII?",
    respuesta: "Estamos terminando de construir el asistente de certificación (carga de tu certificado digital, validación de cédula y los 15 pasos ante la DGII). Mientras tanto puedes seguir probando el sistema. Te avisamos por correo en cuanto esté disponible.",
    palabrasClave: ["certificar", "certificacion", "certificarme", "dgii", "activar", "cuando"],
  },
  {
    id: "costo-servicio",
    pregunta: "¿Cuánto cuesta el servicio?",
    respuesta: "Los precios de certificación y suscripción mensual todavía no están publicados — los anunciaremos antes de que se active el cobro. El entorno de prueba que estás usando ahora es completamente gratuito.",
    palabrasClave: ["costo", "precio", "cuanto", "cuesta", "pagar", "tarifa", "plan", "suscripcion"],
  },
  {
    id: "datos-prueba",
    pregunta: "¿Qué pasa con los datos que creé en el entorno de prueba?",
    respuesta: "Los clientes, productos y facturas de ejemplo que creaste en el entorno de prueba no se trasladan a tu sistema real al certificarte — son solo para que conozcas la interfaz. Tu información real la cargarás cuando tu cuenta esté activa.",
    palabrasClave: ["datos", "prueba", "borran", "se pierden", "guardar", "informacion"],
  },
  {
    id: "limite-sandbox",
    pregunta: "¿Por qué no puedo seguir agregando clientes/facturas de prueba?",
    respuesta: "El entorno de prueba tiene límites (por ejemplo, 40 clientes, 60 productos y 100 comprobantes) para evitar el uso indebido. Estos límites no aplican a tu sistema real una vez certificado.",
    palabrasClave: ["limite", "tope", "no puedo agregar", "maximo", "bloqueado"],
  },
  {
    id: "metodo-pago",
    pregunta: "¿Cómo agrego o cambio mi método de pago?",
    respuesta: "Desde \"Métodos de pago\" en el menú puedes agregar una tarjeta (solo guardamos la marca, los últimos 4 dígitos y el vencimiento, nunca el número completo). El cobro real se activa cuando tu cuenta quede certificada y tu suscripción inicie.",
    palabrasClave: ["pago", "tarjeta", "metodo", "cobro", "facturar"],
  },
  {
    id: "documentos-certificacion",
    pregunta: "¿Qué documentos necesito para certificarme?",
    respuesta: "Necesitarás tu certificado de firma digital (.p12) emitido por una entidad autorizada y tu cédula vigente. Te guiaremos paso a paso cuando el asistente de certificación esté disponible.",
    palabrasClave: ["documentos", "requisitos", "p12", "certificado digital", "cedula"],
  },
  {
    id: "varias-empresas",
    pregunta: "¿Puedo administrar más de una empresa con mi cuenta?",
    respuesta: "Sí, si elegiste el tipo de cuenta \"gestor\" al registrarte. Cada empresa tiene su propia certificación, suscripción y subdominio. Si elegiste cuenta individual, tu cuenta queda asociada a una sola empresa.",
    palabrasClave: ["varias empresas", "multiples", "gestor", "otra empresa", "agregar empresa"],
  },
  {
    id: "codigo-barras",
    pregunta: "¿Cómo imprimo y escaneo códigos de barra para mis productos?",
    respuesta: "En Inventario, cualquier producto que controle stock tiene un botón \"🏷 Etiqueta\" para imprimir su código de barras (o usa \"Imprimir etiquetas\" para varias a la vez). Para escanear, conecta un lector USB normal (funciona como teclado) y, desde \"Nueva factura\", escanea el producto — se agrega solo, sin necesidad de hacer clic en ningún campo.",
    palabrasClave: ["codigo de barras", "barras", "escanear", "etiqueta", "imprimir etiqueta", "lector", "pistola"],
  },
  {
    id: "seguridad-certificado",
    pregunta: "¿Es seguro subir mi certificado digital?",
    respuesta: "Sí. Tu certificado y su contraseña se cifran con Google Cloud KMS antes de guardarse — nunca se almacenan en texto plano ni se exponen a otros usuarios.",
    palabrasClave: ["seguro", "seguridad", "cifrado", "certificado", "privacidad"],
  },
];

export function buscarRespuesta(textoUsuario: string): PreguntaFrecuente | null {
  const q = textoUsuario.toLowerCase();
  let mejor: { item: PreguntaFrecuente; score: number } | null = null;

  for (const item of FAQ) {
    let score = 0;
    for (const palabra of item.palabrasClave) if (q.includes(palabra)) score++;
    if (score > 0 && (!mejor || score > mejor.score)) mejor = { item, score };
  }
  return mejor?.item ?? null;
}
