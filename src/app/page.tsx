import { characters } from "@/lib/characters";
import Game from "./Game";

export default function Home() {
  // Only the public brief reaches the browser; persona, hidden concern and weights stay server-side.
  const stages = characters.map(({ id, brief }) => ({ id, brief }));
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <header>
        <h1 className="text-3xl font-bold">Srake</h1>
        <p className="text-neutral-500">Speak and Break</p>
      </header>
      <Game stages={stages} />
    </main>
  );
}
