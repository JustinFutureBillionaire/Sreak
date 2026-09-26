"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Briefing, Home } from "@/components/Home";
import Play from "@/components/Play";
import { useGame, type Stage } from "./useGame";

type Screen = { name: "home" } | { name: "brief"; stage: Stage } | { name: "play"; stage: Stage };

export default function Game({ stages }: { stages: Stage[] }) {
  const [screen, setScreen] = useState<Screen>({ name: "home" });
  const home = () => setScreen({ name: "home" });
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={screen.name + ("stage" in screen ? screen.stage.id : "")}
        className="flex flex-1 flex-col"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.02 }}
        transition={{ duration: 0.2 }}
      >
        {screen.name === "home" && <Home stages={stages} onPick={(stage) => setScreen({ name: "brief", stage })} />}
        {screen.name === "brief" && (
          <Briefing stage={screen.stage} onBack={home} onStart={() => setScreen({ name: "play", stage: screen.stage })} />
        )}
        {screen.name === "play" && <PlayStage stage={screen.stage} onExit={home} />}
      </motion.div>
    </AnimatePresence>
  );
}

function PlayStage({ stage, onExit }: { stage: Stage; onExit: () => void }) {
  const g = useGame(stage);
  return <Play g={g} stageId={stage.id} onExit={onExit} />;
}
