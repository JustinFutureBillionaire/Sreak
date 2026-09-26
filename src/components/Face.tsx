"use client";

import { motion, useAnimationControls } from "framer-motion";
import { useEffect } from "react";
import type { GameEvent } from "@/app/useGame";

export type Look = {
  skin: string;
  shirt: string;
  hair: "cap" | "curly" | "bald" | "bob" | "swoop";
  hairColor: string;
  glasses?: boolean;
  mustache?: boolean;
  beard?: boolean;
};

type Props = {
  look: Look;
  progress: number; // 0–100, drives the mouth and blush
  risk: number; // 0–100, drives brows and squint
  nervous?: number; // 0–1, sweat drop size
  looking?: boolean; // player is typing: pupils drop toward the input
  event?: GameEvent;
  eventKey?: number;
  className?: string;
};

const INK = "var(--ink)";
const spring = { type: "spring", stiffness: 140, damping: 14 } as const;

export default function Face({ look, progress, risk, nervous = 0, looking, event = "none", eventKey = 0, className }: Props) {
  const head = useAnimationControls();
  const eyes = useAnimationControls();
  const skin = useAnimationControls();
  const yawn = useAnimationControls();
  const steam = useAnimationControls();

  // One-shot reaction shot after every judged line.
  useEffect(() => {
    if (!eventKey) return;
    if (event === "critical") {
      eyes.start({ scale: [1, 1.8, 1.8, 1], transition: { duration: 0.9, times: [0, 0.15, 0.7, 1] } });
      head.start({ scale: [1, 1.12, 1], rotate: [0, -4, 0], transition: { duration: 0.6 } });
    } else if (event === "foul") {
      skin.start({ fill: [look.skin, "#ff6b6b", "#ff6b6b", look.skin], transition: { duration: 1.4, times: [0, 0.1, 0.75, 1] } });
      steam.start({ opacity: [0, 1, 1, 0], y: [8, -12, -22, -30], transition: { duration: 1.4 } });
      head.start({ x: [0, -10, 10, -8, 8, -4, 0], transition: { duration: 0.5 } });
    } else if (event === "repeat") {
      yawn.start({ opacity: [0, 1, 1, 0], scaleY: [0.3, 1, 1, 0.3], transition: { duration: 1.2, times: [0, 0.2, 0.8, 1] } });
      head.start({ rotate: [0, 6, 6, 0], transition: { duration: 1.2 } });
    } else {
      head.start({ y: [0, -8, 0], transition: { duration: 0.35 } });
    }
  }, [eventKey, event, eyes, head, skin, steam, yawn, look.skin]);

  // Continuous expression from the gauges.
  const brow = risk > 45 ? Math.min(28, (risk - 45) * 0.55) : 0; // furrowed V when annoyed
  const raise = risk > 15 && risk < 80 ? -Math.min(risk, 55) * 0.18 : 0; // one skeptical brow
  const eyeRy = Math.max(3, 12 - risk * 0.085); // squint as suspicion rises
  const curve = ((progress - 35) / 65) * 16 - (risk / 100) * 7;
  const grin = progress >= 85;
  const pupilY = looking ? 5 : 0;

  return (
    <motion.svg viewBox="0 0 200 240" className={className} animate={head} style={{ overflow: "visible" }} aria-hidden>
      {/* body */}
      <path d="M45 240 Q48 186 100 184 Q152 186 155 240 Z" fill={look.shirt} stroke={INK} strokeWidth={5} />
      <path d="M86 186 L100 204 L114 186" fill="none" stroke={INK} strokeWidth={4} strokeLinejoin="round" />

      {/* steam on fouls */}
      <motion.g initial={{ opacity: 0 }} animate={steam} fill="#fff" stroke={INK} strokeWidth={4}>
        <circle cx={62} cy={28} r={12} />
        <circle cx={138} cy={24} r={14} />
        <circle cx={100} cy={12} r={10} />
      </motion.g>

      {/* head */}
      <motion.circle cx={100} cy={108} r={72} initial={{ fill: look.skin }} animate={skin} stroke={INK} strokeWidth={5} />
      <Hair look={look} />

      {/* blush */}
      <motion.g animate={{ opacity: Math.min(0.85, progress / 100) }} transition={spring} fill="var(--bubble)">
        <ellipse cx={58} cy={132} rx={13} ry={8} />
        <ellipse cx={142} cy={132} rx={13} ry={8} />
      </motion.g>

      {/* brows */}
      <motion.line x1={58} y1={76} x2={88} y2={76} stroke={INK} strokeWidth={7} strokeLinecap="round"
        style={{ transformBox: "fill-box", transformOrigin: "center" }} animate={{ rotate: brow }} transition={spring} />
      <motion.line x1={112} y1={76} x2={142} y2={76} stroke={INK} strokeWidth={7} strokeLinecap="round"
        style={{ transformBox: "fill-box", transformOrigin: "center" }} animate={{ rotate: -brow, y: raise }} transition={spring} />

      {/* eyes */}
      <motion.g animate={eyes} style={{ transformBox: "fill-box", transformOrigin: "center" }}>
        {[74, 126].map((cx) => (
          <g key={cx}>
            <motion.ellipse cx={cx} cy={102} rx={13} ry={eyeRy} initial={false} fill="#fff" stroke={INK} strokeWidth={4} animate={{ ry: eyeRy }} transition={spring} />
            <motion.circle cx={cx} cy={102} r={5.5} initial={false} fill={INK} animate={{ cy: 102 + pupilY, r: Math.min(5.5, eyeRy - 1) }} transition={spring} />
          </g>
        ))}
      </motion.g>
      {look.glasses && (
        <g fill="none" stroke={INK} strokeWidth={4}>
          <circle cx={74} cy={102} r={20} />
          <circle cx={126} cy={102} r={20} />
          <path d="M94 102 H106" />
        </g>
      )}

      {/* nose */}
      <path d="M100 112 Q108 124 98 126" fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" />
      {look.mustache && <path d="M76 138 Q88 128 100 136 Q112 128 124 138 Q112 142 100 139 Q88 142 76 138 Z" fill={look.hairColor} stroke={INK} strokeWidth={3} />}
      {look.beard && <path d="M40 118 Q44 176 100 182 Q156 176 160 118 Q150 160 100 162 Q50 160 40 118 Z" fill={look.hairColor} stroke={INK} strokeWidth={4} />}

      {/* mouth: a curve that smiles or frowns, a grin near 100, a yawn on repetition */}
      <motion.path initial={false} fill="none" stroke={INK} strokeWidth={6} strokeLinecap="round"
        animate={{ d: `M78 150 Q100 ${150 + curve * 2} 122 150`, opacity: grin ? 0 : 1 }} transition={spring} />
      <motion.path d="M72 144 Q100 192 128 144 Z" fill={INK} stroke={INK} strokeWidth={4} strokeLinejoin="round"
        animate={{ opacity: grin ? 1 : 0, scale: grin ? 1 : 0.6 }} style={{ transformBox: "fill-box", transformOrigin: "top" }} transition={spring} />
      <motion.ellipse cx={100} cy={156} rx={14} ry={18} fill={INK} initial={{ opacity: 0 }} animate={yawn} style={{ transformBox: "fill-box", transformOrigin: "center" }} />

      {/* sweat when time or turns run low */}
      <motion.path d="M160 70 Q170 88 160 94 Q150 88 160 70 Z" fill="var(--sky)" stroke={INK} strokeWidth={3}
        style={{ transformBox: "fill-box", transformOrigin: "top" }} animate={{ scale: nervous, opacity: nervous > 0.1 ? 1 : 0 }} transition={spring} />
    </motion.svg>
  );
}

function Hair({ look }: { look: Look }) {
  const c = look.hairColor;
  switch (look.hair) {
    case "cap":
      return (
        <g stroke={INK} strokeWidth={5} strokeLinejoin="round">
          <path d="M36 62 Q40 14 100 12 Q160 14 164 62 Z" fill="#3d4fb8" />
          <path d="M26 60 H174 Q178 70 166 70 H34 Q22 70 26 60 Z" fill="#2c3a90" />
          <circle cx={100} cy={38} r={11} fill="var(--lemon)" strokeWidth={4} />
        </g>
      );
    case "curly":
      return (
        <g fill={c} stroke={INK} strokeWidth={4}>
          {[[34, 68], [50, 40], [78, 24], [122, 24], [150, 40], [166, 68], [28, 102], [172, 102]].map(([x, y]) => (
            <circle key={`${x}${y}`} cx={x} cy={y} r={19} />
          ))}
        </g>
      );
    case "bob":
      return <path d="M28 128 Q24 30 100 30 Q176 30 172 128 L150 128 Q150 70 100 64 Q50 70 50 128 Z" fill={c} stroke={INK} strokeWidth={5} strokeLinejoin="round" />;
    case "swoop":
      return <path d="M34 90 Q40 32 104 32 Q160 34 166 86 Q130 58 70 72 Q50 78 34 90 Z" fill={c} stroke={INK} strokeWidth={5} strokeLinejoin="round" />;
    default:
      return <path d="M44 70 Q60 46 78 44" fill="none" stroke="#fff" strokeWidth={6} strokeLinecap="round" opacity={0.6} />;
  }
}
