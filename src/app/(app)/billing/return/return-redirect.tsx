"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function ReturnRedirect() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/billing");
      router.refresh();
    }, 2000);
    return () => clearTimeout(timer);
  }, [router]);

  return null;
}
