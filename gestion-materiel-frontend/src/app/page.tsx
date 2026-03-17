"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { tokenStorage } from "@/lib/auth/token";

export default function RootPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace(tokenStorage.get() ? "/dashboard" : "/login");
  }, [router]);
  return null;
}


