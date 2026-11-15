// Iconos del producto: Phosphor (https://phosphoricons.com). Reemplazan a los
// trazos finos tipo Feather que había antes, que se veían fríos y mecánicos.
// Phosphor tiene formas más redondeadas y pesos (bold para acciones pequeñas,
// duotone para navegación), con lo que el producto gana carácter.
//
// Se mantiene la API de siempre — <Icon name="invoice" size={14} /> — para no
// tocar los ~20 sitios donde se usa. Se importa desde /dist/ssr para que sirva
// igual en Server y Client Components.
import {
  SquaresFour, Receipt, UsersThree, Package, ClipboardText, GearSix, Plus, Eye, Check, X,
  Trash, Printer, DownloadSimple, UploadSimple, Warning, MagnifyingGlass, ArrowsLeftRight,
  PencilSimple, SignOut, User, ChartBar, CaretDown, Barcode, SealCheck, List, Wallet, Tray,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";

const ICONOS: Record<string, PhosphorIcon> = {
  dashboard: SquaresFour,
  invoice: Receipt,
  clients: UsersThree,
  products: Package,
  quotes: ClipboardText,
  settings: GearSix,
  plus: Plus,
  eye: Eye,
  check: Check,
  x: X,
  trash: Trash,
  print: Printer,
  download: DownloadSimple,
  upload: UploadSimple,
  alert: Warning,
  search: MagnifyingGlass,
  convert: ArrowsLeftRight,
  edit: PencilSimple,
  logout: SignOut,
  user: User,
  chart: ChartBar,
  "chevron-down": CaretDown,
  scan: Barcode,
  sello: SealCheck,
  menu: List,
  wallet: Wallet,
  tray: Tray,
};

interface IconProps {
  name:   string;
  size?:  number;
  style?: React.CSSProperties;
  // Por defecto: bold en tamaños chicos (botones, tablas) y duotone en grandes (navegación).
  peso?:  "regular" | "bold" | "duotone" | "fill";
}

export default function Icon({ name, size = 15, style, peso }: IconProps) {
  const Cmp = ICONOS[name];
  if (!Cmp) return null;
  return <Cmp size={size} weight={peso ?? (size <= 15 ? "bold" : "duotone")} style={style} aria-hidden="true" />;
}
