export type GameMode = "classic" | "lane-rush";

interface GameModeSelectProps {
  onSelectMode: (mode: GameMode) => void;
}

export function GameModeSelect({ onSelectMode }: GameModeSelectProps) {
  return (
    <div className="max-w-sm mx-auto grid grid-cols-2 gap-3">
      <button
        onClick={() => onSelectMode("classic")}
        className="p-4 border rounded-lg hover:bg-gray-50 text-center"
      >
        <div className="font-medium">Classic</div>
        <div className="text-sm text-gray-500">Answer buttons</div>
      </button>
      <button
        onClick={() => onSelectMode("lane-rush")}
        className="p-4 border rounded-lg hover:bg-gray-50 text-center"
      >
        <div className="font-medium">Lane Rush</div>
        <div className="text-sm text-gray-500">Steer into an answer</div>
      </button>
    </div>
  );
}
