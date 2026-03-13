"use client";

import { rooms } from "@/lib/rooms";

interface RoomNavProps {
  currentRoom: string;
  onRoomChange: (roomId: string) => void;
}

export default function RoomNav({ currentRoom, onRoomChange }: RoomNavProps) {
  return (
    <div className="flex gap-2">
      {Object.entries(rooms).map(([id, room]) => (
        <button
          key={id}
          onClick={() => onRoomChange(id)}
          className={`px-4 py-2 text-sm font-mono border-2 transition-colors ${
            currentRoom === id
              ? "bg-white text-black border-white"
              : "bg-transparent text-gray-400 border-gray-600 hover:border-gray-400 hover:text-gray-200"
          }`}
        >
          {room.name}
        </button>
      ))}
    </div>
  );
}
