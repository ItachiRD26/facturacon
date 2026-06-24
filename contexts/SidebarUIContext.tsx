"use client";

import { createContext, useContext } from "react";

export const SidebarCtx = createContext<{ open: boolean; setOpen: (v: boolean) => void }>({
  open: false, setOpen: () => {},
});

export const useSidebarCtx = () => useContext(SidebarCtx);
