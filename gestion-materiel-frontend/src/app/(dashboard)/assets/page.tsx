import { RequireAuth } from "@/components/app/RequireAuth";
import AssetsClient from "./AssetsClient";

export default function Page() {
  return (
    <RequireAuth>
      <AssetsClient />
    </RequireAuth>
  );
}