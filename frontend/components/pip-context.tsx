"use client";

import React, { createContext, useContext, useState } from "react";

export interface PipEpisode {
  id: string;
  title: string;
  seriesTitle?: string;
  embedUrl: string;
  startPosition?: number;
}

interface PipContextType {
  activeEpisode: PipEpisode | null;
  isPipActive: boolean;
  isMinimized: boolean;
  startPip: (episode: PipEpisode) => void;
  closePip: () => void;
  toggleMinimize: () => void;
}

const PipContext = createContext<PipContextType | undefined>(undefined);

export function PipProvider({ children }: { children: React.ReactNode }) {
  const [activeEpisode, setActiveEpisode] = useState<PipEpisode | null>(null);
  const [isPipActive, setIsPipActive] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  const startPip = (episode: PipEpisode) => {
    setActiveEpisode(episode);
    setIsPipActive(true);
    setIsMinimized(false);
  };

  const closePip = () => {
    setIsPipActive(false);
    setActiveEpisode(null);
  };

  const toggleMinimize = () => {
    setIsMinimized((prev) => !prev);
  };

  return (
    <PipContext.Provider
      value={{
        activeEpisode,
        isPipActive,
        isMinimized,
        startPip,
        closePip,
        toggleMinimize,
      }}
    >
      {children}
    </PipContext.Provider>
  );
}

export function usePip() {
  const context = useContext(PipContext);
  if (!context) {
    throw new Error("usePip must be used within a PipProvider");
  }
  return context;
}
