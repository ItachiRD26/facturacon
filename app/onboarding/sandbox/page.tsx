"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function RedirectAFacturas() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const t = searchParams.get("t");
    router.replace(`/onboarding/sandbox/facturas${t ? `?t=${t}` : ""}`);
  }, [router, searchParams]);

  return null;
}

export default function SandboxIndexPage() {
  return (
    <Suspense>
      <RedirectAFacturas />
    </Suspense>
  );
}
