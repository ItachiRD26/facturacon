"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function RedirectAlDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const t = searchParams.get("t");
    router.replace(`/onboarding/sandbox/dashboard${t ? `?t=${t}` : ""}`);
  }, [router, searchParams]);

  return null;
}

export default function SandboxIndexPage() {
  return (
    <Suspense>
      <RedirectAlDashboard />
    </Suspense>
  );
}
