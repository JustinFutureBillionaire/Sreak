import { characters } from "@/lib/characters";
import Game from "./Game";

export default function Page() {
  // Only the public brief reaches the browser; persona, hidden concern and weights stay server-side.
  const stages = characters.map(({ id, brief }) => ({ id, brief }));
  return <Game stages={stages} />;
}
