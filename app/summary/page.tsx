import { Suspense } from "react";
import SummaryScreen from "@/components/SummaryScreen";

export default function SummaryPage() {
  return (
    <Suspense fallback={null}>
      <SummaryScreen />
    </Suspense>
  );
}
