// Interruptor del alta de cuentas nuevas. Por defecto está CERRADO: solo se
// abre con REGISTRO_ABIERTO=1 (o NEXT_PUBLIC_REGISTRO_ABIERTO=1 en local).
// Se usa en la pantalla /registro, en los botones de la landing y, sobre todo,
// en /api/auth/session, que es lo que de verdad impide crear perfiles nuevos
// (el SDK de Firebase en el navegador sí podría crear el usuario de Auth).
export function registroAbierto(): boolean {
  return (process.env.REGISTRO_ABIERTO ?? process.env.NEXT_PUBLIC_REGISTRO_ABIERTO) === "1";
}
