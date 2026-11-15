import { registroAbierto } from "@/lib/registro";
import RegistroForm from "./registro-form";
import RegistroCerrado from "@/components/auth/registro-cerrado";

export default function RegistroPage() {
  return registroAbierto() ? <RegistroForm /> : <RegistroCerrado />;
}
