"use client";

import { motion } from "framer-motion";
import type { GameEvent } from "@/app/useGame";
import Face, { type Look } from "./Face";

type Props = {
  stageId: string;
  progress: number;
  risk: number;
  nervous: number;
  looking: boolean;
  event: GameEvent;
  eventKey: number;
};

const dale: Look = { skin: "#f5c59f", shirt: "#3d4fb8", hair: "cap", hairColor: "#c9c3bd", mustache: true };
const dana: Look = { skin: "#9a6445", shirt: "#ff7aa8", hair: "curly", hairColor: "#2b1a14", glasses: true };
// The other three partners echo Dana's mood a beat behind, each with their own bias.
const panel: { look: Look; p: number; r: number }[] = [
  { look: { skin: "#ffd9bd", shirt: "#4cc3ff", hair: "bald", hairColor: "#000" }, p: 0.7, r: 1.2 },
  { look: { skin: "#f1b98f", shirt: "#b9a6ff", hair: "bob", hairColor: "#e0612f" }, p: 0.9, r: 0.8 },
  { look: { skin: "#c68a62", shirt: "#2fd4a3", hair: "swoop", hairColor: "#3a2a20", beard: true }, p: 0.6, r: 1.1 },
];

export default function Scene(props: Props) {
  return props.stageId.startsWith("pitch") ? <PitchRoom {...props} /> : <Lobby {...props} />;
}

function Lobby({ progress, risk, nervous, looking, event, eventKey }: Props) {
  const open = progress / 100;
  return (
    <div className="relative h-full w-full overflow-hidden bg-[linear-gradient(180deg,#3a2787_0%,#6b4bd8_70%,#8f74ff_100%)]">
      {/* rain */}
      <div className="absolute inset-0 opacity-40 [background-image:repeating-linear-gradient(105deg,transparent_0_14px,rgba(255,255,255,.5)_14px_15px,transparent_15px_40px)] animate-[rain_0.6s_linear_infinite]" />
      {/* streetlight glow */}
      <div className="absolute -left-10 top-6 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(255,210,63,.75),transparent_65%)]" />
      <svg viewBox="0 0 60 200" className="absolute left-6 top-10 h-[70%]" aria-hidden>
        <path d="M30 200 V40 Q30 20 50 20" fill="none" stroke="var(--ink)" strokeWidth={7} strokeLinecap="round" />
        <circle cx={50} cy={26} r={10} fill="var(--lemon)" stroke="var(--ink)" strokeWidth={4} />
      </svg>

      {/* the door: light spills out as it opens */}
      <div className="absolute right-[8%] bottom-[18%] h-[62%] w-[26%] rounded-t-[40px] border-[5px] border-ink bg-lemon [perspective:600px]">
        <div className="absolute inset-0 rounded-t-[34px] bg-[radial-gradient(circle_at_30%_60%,#fff7c2,var(--lemon))]" />
        <motion.div
          className="absolute inset-0 origin-left rounded-t-[34px] border-r-[5px] border-ink bg-[#e46f9e]"
          animate={{ rotateY: -open * 78 }}
          transition={{ type: "spring", stiffness: 60, damping: 12 }}
        >
          <div className="absolute right-3 top-1/2 h-4 w-4 rounded-full border-[3px] border-ink bg-lemon" />
          <div className="absolute inset-x-4 top-5 h-[35%] rounded-2xl border-[3px] border-ink bg-[#f59bbd]" />
        </motion.div>
      </div>

      {/* floor + desk */}
      <div className="absolute inset-x-0 bottom-0 h-[20%] border-t-[5px] border-ink bg-[#4c3a9e]" />
      <Face
        look={dale}
        progress={progress}
        risk={risk}
        nervous={nervous}
        looking={looking}
        event={event}
        eventKey={eventKey}
        className="absolute bottom-[4%] left-1/2 h-[82%] -translate-x-[62%]"
      />
      <div className="absolute bottom-0 left-[18%] h-[22%] w-[50%] rounded-t-2xl border-[5px] border-b-0 border-ink bg-[#ffb86b]">
        <div className="absolute left-4 top-3 h-3 w-24 rounded-full bg-ink/25" />
      </div>
      <style>{`@keyframes rain { to { background-position: -40px 40px; } }`}</style>
    </div>
  );
}

function PitchRoom({ progress, risk, nervous, looking, event, eventKey }: Props) {
  const clamp = (n: number) => Math.max(0, Math.min(100, n));
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#c9f6e6]">
      {/* window wall */}
      <div className="absolute inset-x-[6%] top-[6%] h-[46%] rounded-3xl border-[5px] border-ink bg-[linear-gradient(180deg,#9fe3ff,#e7f9ff)]">
        <div className="absolute inset-y-0 left-1/3 w-[5px] bg-ink" />
        <div className="absolute inset-y-0 left-2/3 w-[5px] bg-ink" />
        <div className="absolute bottom-3 left-6 h-10 w-24 rounded-full bg-white/80" />
      </div>

      {/* four across the desk; Dana (second from left) leads, partners echo her mood */}
      {panel.map((m, i) => (
        <Face
          key={i}
          look={m.look}
          progress={clamp(progress * m.p)}
          risk={clamp(risk * m.r)}
          event={event}
          eventKey={eventKey}
          className={`absolute bottom-[25%] h-[40%] -translate-x-1/2 ${["left-[13%]", "left-[63%]", "left-[87%]"][i]}`}
        />
      ))}
      <Face
        look={dana}
        progress={progress}
        risk={risk}
        nervous={nervous}
        looking={looking}
        event={event}
        eventKey={eventKey}
        className="absolute bottom-[22%] left-[37%] h-[54%] -translate-x-1/2"
      />

      {/* desk with a checkbook that slides toward you as conviction grows */}
      <div className="absolute inset-x-0 bottom-0 h-[28%] border-t-[5px] border-ink bg-white/90">
        <div className="absolute inset-x-0 top-0 h-3 bg-[#a8eed6]" />
        <motion.div
          className="absolute left-1/2 top-4 flex h-12 w-28 -translate-x-1/2 items-center justify-center rounded-lg border-[4px] border-ink bg-mint font-display text-lg text-ink"
          animate={{ y: (progress / 100) * 40, scale: 0.8 + (progress / 100) * 0.5, rotate: -6 + (progress / 100) * 6 }}
          transition={{ type: "spring", stiffness: 80, damping: 12 }}
        >
          $50K
        </motion.div>
        <div className="absolute left-[10%] top-6 h-8 w-8 rounded-full border-[4px] border-ink bg-[#fff3e0]" />
        <div className="absolute right-[12%] top-5 h-6 w-16 rounded-md border-[4px] border-ink bg-lilac" />
      </div>
    </div>
  );
}
