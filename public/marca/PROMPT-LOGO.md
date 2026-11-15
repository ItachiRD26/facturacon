# Brief para el logo oficial de Facturacon

El logo que está en el sitio (`public/marca/logo-facturacon.svg`, componente
`components/ui/logo.tsx`) es una **versión de trabajo** dibujada a mano en SVG.
No pude generar el oficial con Gemini desde aquí (no hay acceso a un generador
de imágenes), así que este documento deja listo el pedido para hacerlo.

## Qué es Facturacon
Plataforma dominicana que certifica a pequeños y medianos negocios (colmados,
ferreterías, farmacias, salones, talleres) como emisores de facturación
electrónica ante la DGII y les da el sistema para facturar. La certificación es
gratis; se paga una mensualidad cuando ya están certificados.

## Idea del símbolo
Un **comprobante térmico** (papel de ticket, borde inferior dentado) con
renglones, y encima un **sello redondo rojo con un check**: el sello de
"verificado por la DGII". Debe leerse como "factura + validación" a 24 px.

## Reglas
- Nombre siempre en minúscula: **facturacon**, tipografía grotesca gruesa,
  compacta (referencia: Schibsted Grotesk ExtraBold, tracking apretado).
- Colores: tinta `#0F1A30`, sello rojo `#D92D3A`, papel `#F3F4F1`, blanco.
  El rojo solo vive en el sello.
- Formas simples y geométricas, sin degradés, sin sombras, sin QR ni engranajes.
- Debe funcionar en una sola tinta (negro) y en negativo sobre fondo oscuro.
- Entregables: SVG vectorial (símbolo solo, símbolo + nombre horizontal,
  versión negativa), PNG 512 px del símbolo, y favicon 32/180/512 px.

## Prompt para Gemini / Imagen
> Logo vectorial plano para una empresa dominicana de facturación electrónica
> llamada "facturacon". Símbolo: un comprobante de papel térmico visto de
> frente, con tres renglones de texto abstractos y el borde inferior en
> zigzag; sobre su esquina inferior derecha, un sello circular rojo (#D92D3A)
> con un check blanco grueso de puntas redondeadas, con un aro del color del
> fondo que lo separa del papel. El comprobante es azul tinta oscuro (#0F1A30).
> Junto al símbolo, el nombre "facturacon" en minúsculas, tipografía grotesca
> extra negrita, compacta, color #0F1A30. Estilo: geométrico, limpio, sin
> degradados, sin sombras, sin efectos 3D, fondo blanco liso. Que se lea bien
> a tamaño de favicon. Proporción horizontal 4:1.

Variantes a pedir después: "versión negativa sobre fondo #0F1A30 con el
comprobante en blanco" y "solo el símbolo dentro de un cuadrado redondeado
oscuro, para ícono de app".

## Cuando tengas el logo final
1. Reemplaza `public/marca/logo-facturacon.svg` y `app/icon.svg`.
2. Si cambia el dibujo del símbolo, actualiza `MarcaFacturacon` en
   `components/ui/logo.tsx` (es lo que ven el header, el footer y el login).
