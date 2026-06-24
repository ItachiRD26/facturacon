export type MarcaTarjeta = "visa" | "mastercard" | "amex" | "otra";

export interface MetodoPago {
  id:             string;
  marca:          MarcaTarjeta;
  ultimos4:       string;
  vencimiento:    string; // "MM/YY"
  predeterminado: boolean;
  creadoEn?:      string;
}
