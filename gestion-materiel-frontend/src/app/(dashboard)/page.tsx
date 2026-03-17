"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { me } from "@/lib/api/auth";
import { tokenStorage } from "@/lib/auth/token";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    me().then(setData).catch((err) => setData({ error: err?.response?.data || err?.message }));
  }, []);

  const logout = () => {
    tokenStorage.clear();
    router.push("/login");
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <Button variant="outline" onClick={logout}>Logout</Button>
      </div>

      <pre className="text-sm bg-muted p-4 rounded-md overflow-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}