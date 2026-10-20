import { Suspense } from "react";
import GameScreen from "@/components/GameScreen";

export default function PlayPage() {
  return (
    <Suspense fallback={null}>
      <GameScreen />
    </Suspense>
  );
}
