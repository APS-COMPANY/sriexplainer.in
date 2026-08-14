"use client";

import { useEffect, useRef, useState } from "react";
import { Play, RotateCcw } from "lucide-react";

interface FlappyBirdGameProps {
  mode: "contest" | "free";
  onGameOver: (score: number) => void;
  isOnline?: boolean;
}

export function FlappyBirdGame({ mode, onGameOver, isOnline = true }: FlappyBirdGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<"START" | "PLAYING" | "GAMEOVER">("START");
  const [currentScore, setCurrentScore] = useState(0);

  // Keep onGameOver callback ref in sync without causing useEffect re-subscriptions
  const onGameOverRef = useRef(onGameOver);
  useEffect(() => {
    onGameOverRef.current = onGameOver;
  }, [onGameOver]);

  // Game Physics State (Values in units per SECOND for frame-rate independence)
  const birdRef = useRef({
    x: 75,
    y: 240,
    velocity: 0, // px/sec
    gravity: 880, // px/sec²
    jump: -290, // px/sec
    radius: 14,
    rotation: 0
  });

  const pipesRef = useRef<Array<{ x: number; topHeight: number; bottomY: number; passed: boolean }>>([]);
  const pipeDistanceAccumulatorRef = useRef(0);
  const lastTimestampRef = useRef<number | null>(null);
  const scoreRef = useRef(0);
  const animFrameIdRef = useRef<number | null>(null);
  const gameStateRef = useRef<"START" | "PLAYING" | "GAMEOVER">("START");

  // Keep state ref in sync
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const resetGame = () => {
    birdRef.current = {
      x: 75,
      y: 240,
      velocity: 0,
      gravity: 880,
      jump: -290,
      radius: 14,
      rotation: 0
    };
    pipesRef.current = [];
    pipeDistanceAccumulatorRef.current = 0;
    lastTimestampRef.current = null;
    scoreRef.current = 0;
    setCurrentScore(0);
  };

  const handleJump = () => {
    if (gameStateRef.current === "START") {
      resetGame();
      setGameState("PLAYING");
      gameStateRef.current = "PLAYING";
      birdRef.current.velocity = birdRef.current.jump;
    } else if (gameStateRef.current === "PLAYING") {
      birdRef.current.velocity = birdRef.current.jump;
    } else if (gameStateRef.current === "GAMEOVER") {
      resetGame();
      setGameState("PLAYING");
      gameStateRef.current = "PLAYING";
      birdRef.current.velocity = birdRef.current.jump;
    }
  };

  // Score-based controlled difficulty speed curve (Values in Pixels per Second)
  const getDifficulty = (score: number) => {
    let speed = 90; // LEVEL 1: Score 0-5 (VERY EASY - 90px/sec: ~4.44 seconds to traverse 400px canvas)

    if (score <= 5) {
      speed = 90;
    } else if (score <= 10) {
      speed = 98; // LEVEL 2: Score 6-10 (EASY)
    } else if (score <= 20) {
      speed = 106; // LEVEL 3: Score 11-20 (NORMAL)
    } else if (score <= 30) {
      speed = 115; // LEVEL 4: Score 21-30 (MODERATE)
    } else if (score <= 50) {
      speed = 125; // LEVEL 5: Score 31-50 (HARD)
    } else {
      speed = 125 + (score - 50) * 0.4; // LEVEL 6: Score 51+ (ADVANCED - Smooth gradual increase)
    }

    const gap = 140; // Fair gap clearance
    const pipeDistance = 210; // Distance between pipe pairs in pixels

    return { speed, gap, pipeDistance };
  };

  // Keyboard Event Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        handleJump();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Main Single Animation Loop with Delta-Time Physics
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = 400;
    const height = 560;
    const groundY = 490;

    let particles: Array<{ x: number; y: number; size: number; speed: number; opacity: number }> = [];
    for (let i = 0; i < 25; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * groundY,
        size: Math.random() * 2 + 1,
        speed: Math.random() * 0.4 + 0.1,
        opacity: Math.random() * 0.6 + 0.2
      });
    }

    const render = (timestamp: number) => {
      // Calculate Delta Time in seconds
      if (lastTimestampRef.current === null) {
        lastTimestampRef.current = timestamp;
      }
      let dt = (timestamp - lastTimestampRef.current) / 1000;
      lastTimestampRef.current = timestamp;

      // Cap delta time to prevent physics explosions during tab switching or frame drops
      if (dt > 0.05) dt = 0.05;
      if (dt < 0) dt = 0;

      // 1. Clear & Background Gradient
      ctx.clearRect(0, 0, width, height);

      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0, "#000000");
      skyGrad.addColorStop(0.5, "#080808");
      skyGrad.addColorStop(0.85, "#0E0E0E");
      skyGrad.addColorStop(1, "#0E0E0E");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // Starry particles background
      ctx.fillStyle = "#FFFFFF";
      particles.forEach((p) => {
        ctx.globalAlpha = p.opacity;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
        if (gameStateRef.current === "PLAYING") {
          p.x -= p.speed * 60 * dt;
          if (p.x < 0) p.x = width;
        }
      });

      // 2. Gameplay Logic Update (Frame-Rate Independent)
      if (gameStateRef.current === "PLAYING") {
        const bird = birdRef.current;
        const { speed, gap, pipeDistance } = getDifficulty(scoreRef.current);

        // Apply Frame-Independent Gravity & Movement
        bird.velocity += bird.gravity * dt;
        bird.y += bird.velocity * dt;
        bird.rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, bird.velocity * 0.002));

        // Pipe Spawning based on Accumulated Distance (Pixels)
        pipeDistanceAccumulatorRef.current += speed * dt;
        if (pipesRef.current.length === 0 || pipeDistanceAccumulatorRef.current >= pipeDistance) {
          pipeDistanceAccumulatorRef.current = 0;
          const minTop = 50;
          const maxTop = groundY - gap - 60;
          const topHeight = Math.floor(Math.random() * (maxTop - minTop)) + minTop;
          const bottomY = topHeight + gap;
          pipesRef.current.push({
            x: width,
            topHeight,
            bottomY,
            passed: false
          });
        }

        // Update Pipes & Collision Check
        for (let i = pipesRef.current.length - 1; i >= 0; i--) {
          const p = pipesRef.current[i];
          p.x -= speed * dt;

          // Check if bird passed pipe
          if (!p.passed && p.x + 54 < bird.x) {
            p.passed = true;
            scoreRef.current += 1;
            setCurrentScore(scoreRef.current);
          }

          // Remove off-screen pipes
          if (p.x + 54 < 0) {
            pipesRef.current.splice(i, 1);
            continue;
          }

          // Collision Bounding Box Check (Bird radius = 14)
          const birdLeft = bird.x - bird.radius + 3;
          const birdRight = bird.x + bird.radius - 3;
          const birdTop = bird.y - bird.radius + 3;
          const birdBottom = bird.y + bird.radius - 3;

          const pipeLeft = p.x;
          const pipeRight = p.x + 54;

          const hitTopPipe = birdRight > pipeLeft && birdLeft < pipeRight && birdTop < p.topHeight;
          const hitBottomPipe = birdRight > pipeLeft && birdLeft < pipeRight && birdBottom > p.bottomY;

          if (hitTopPipe || hitBottomPipe) {
            triggerGameOver();
          }
        }

        // Ceiling & Ground collision
        if (bird.y - bird.radius <= 0 || bird.y + bird.radius >= groundY) {
          triggerGameOver();
        }
      }

      // 3. Draw Pipes
      pipesRef.current.forEach((p) => {
        const pipeWidth = 54;

        // Top Pipe
        const topGrad = ctx.createLinearGradient(p.x, 0, p.x + pipeWidth, 0);
        topGrad.addColorStop(0, "#8B2CFF");
        topGrad.addColorStop(0.5, "#B84DFF");
        topGrad.addColorStop(1, "#8B2CFF");
        ctx.fillStyle = topGrad;
        ctx.fillRect(p.x, 0, pipeWidth, p.topHeight);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
        ctx.lineWidth = 2;
        ctx.strokeRect(p.x, 0, pipeWidth, p.topHeight);

        // Top Cap
        ctx.fillStyle = "#C65CFF";
        ctx.fillRect(p.x - 3, p.topHeight - 16, pipeWidth + 6, 16);
        ctx.strokeRect(p.x - 3, p.topHeight - 16, pipeWidth + 6, 16);

        // Bottom Pipe
        const botGrad = ctx.createLinearGradient(p.x, 0, p.x + pipeWidth, 0);
        botGrad.addColorStop(0, "#8B2CFF");
        botGrad.addColorStop(0.5, "#B84DFF");
        botGrad.addColorStop(1, "#8B2CFF");
        ctx.fillStyle = botGrad;
        ctx.fillRect(p.x, p.bottomY, pipeWidth, groundY - p.bottomY);
        ctx.strokeRect(p.x, p.bottomY, pipeWidth, groundY - p.bottomY);

        // Bottom Cap
        ctx.fillStyle = "#C65CFF";
        ctx.fillRect(p.x - 3, p.bottomY, pipeWidth + 6, 16);
        ctx.strokeRect(p.x - 3, p.bottomY, pipeWidth + 6, 16);
      });

      // 4. Draw Ground
      const groundGrad = ctx.createLinearGradient(0, groundY, 0, height);
      groundGrad.addColorStop(0, "#080808");
      groundGrad.addColorStop(1, "#000000");
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, groundY, width, height - groundY);

      ctx.strokeStyle = "#8B2CFF";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(width, groundY);
      ctx.stroke();

      // 5. Draw Bird
      const bird = birdRef.current;
      ctx.save();
      ctx.translate(bird.x, bird.y);
      ctx.rotate(bird.rotation);

      // Glowing Aura
      const glowGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, bird.radius + 6);
      glowGrad.addColorStop(0, "rgba(184, 77, 255, 0.8)");
      glowGrad.addColorStop(1, "rgba(139, 44, 255, 0)");
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(0, 0, bird.radius + 6, 0, Math.PI * 2);
      ctx.fill();

      // Bird Body (Rose / Purple Gradient)
      const birdGrad = ctx.createLinearGradient(-bird.radius, -bird.radius, bird.radius, bird.radius);
      birdGrad.addColorStop(0, "#F43F5E");
      birdGrad.addColorStop(1, "#8B2CFF");
      ctx.fillStyle = birdGrad;
      ctx.beginPath();
      ctx.arc(0, 0, bird.radius, 0, Math.PI * 2);
      ctx.fill();

      // Wing
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.ellipse(-4, 2, 6, 4, Math.PI / 6, 0, Math.PI * 2);
      ctx.fill();

      // Eye
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(5, -4, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#000000";
      ctx.beginPath();
      ctx.arc(6, -4, 2, 0, Math.PI * 2);
      ctx.fill();

      // Beak
      ctx.fillStyle = "#F59E0B";
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(17, 3);
      ctx.lineTo(10, 6);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      // 6. HUD Score Display
      if (gameStateRef.current === "PLAYING") {
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "900 32px Outfit, Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
        ctx.shadowBlur = 8;
        ctx.fillText(String(scoreRef.current), width / 2, 60);
        ctx.shadowBlur = 0;
      }

      // Schedule next frame in the SINGLE main animation loop
      animFrameIdRef.current = requestAnimationFrame(render);
    };

    const triggerGameOver = () => {
      if (gameStateRef.current === "GAMEOVER") return;
      gameStateRef.current = "GAMEOVER";
      setGameState("GAMEOVER");
      const finalScore = scoreRef.current;
      onGameOverRef.current(finalScore);
    };

    // Ensure any existing loop is canceled before starting loop
    if (animFrameIdRef.current !== null) {
      cancelAnimationFrame(animFrameIdRef.current);
    }
    lastTimestampRef.current = null;
    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameIdRef.current !== null) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
    };
  }, []); // Empty dependency array guarantees ONLY ONE animation loop exists for lifecycle of component!

  return (
    <div className="relative w-full max-w-[360px] sm:max-w-[400px] aspect-[400/560] mx-auto rounded-3xl overflow-hidden border border-white/10 shadow-2xl select-none bg-[#000000] touch-none">
      <canvas
        ref={canvasRef}
        width={400}
        height={560}
        onClick={handleJump}
        onTouchStart={(e) => {
          e.preventDefault();
          handleJump();
        }}
        className="w-full h-full cursor-pointer touch-none block"
      />

      {/* START INSTRUCTIONS OVERLAY */}
      {gameState === "START" && (
        <div
          onClick={handleJump}
          onTouchStart={(e) => {
            e.preventDefault();
            handleJump();
          }}
          className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center space-y-5 cursor-pointer touch-none"
        >
          <div className="h-16 w-16 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 grid place-items-center animate-bounce shadow-xl">
            <Play size={28} fill="currentColor" className="ml-1" />
          </div>

          <div className="space-y-1">
            <h3 className="text-2xl font-black text-white tracking-tight uppercase">
              {mode === "contest" ? "🏆 Contest Mode" : "🎮 Free Play Mode"}
            </h3>
            <p className="text-xs font-bold text-zinc-300">
              Tap Screen, Click Mouse, or Press <kbd className="px-1.5 py-0.5 rounded bg-white/20 text-white font-mono">SPACE</kbd> to Flap!
            </p>
          </div>

          <div className="px-4 py-2 rounded-xl bg-white/10 border border-white/15 text-[11px] font-extrabold text-rose-300">
            {mode === "contest"
              ? "Official contest score will be recorded!"
              : "Free play for fun. High score saved locally."}
          </div>

          <button className="px-6 py-2.5 rounded-full brand-gradient text-xs font-black text-white shadow-lg uppercase tracking-wider">
            TAP TO PLAY
          </button>
        </div>
      )}

      {/* GAMEOVER OVERLAY */}
      {gameState === "GAMEOVER" && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center space-y-4 touch-none">
          <div className="space-y-1">
            <span className="text-xs font-black text-rose-400 uppercase tracking-widest">
              GAME OVER
            </span>
            <h2 className="text-4xl font-black text-white tracking-tight">
              {currentScore}
            </h2>
            <p className="text-xs text-zinc-400 font-bold">
              {mode === "contest" ? "Contest Attempt Completed" : "Free Play Score"}
            </p>
          </div>

          {!isOnline && mode === "contest" && (
            <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold">
              ⚠️ Contest Mode requires an internet connection.
            </div>
          )}

          <button
            onClick={handleJump}
            onTouchStart={(e) => {
              e.preventDefault();
              handleJump();
            }}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl brand-gradient font-black text-white text-xs shadow-xl uppercase tracking-wider hover:scale-105 transition-all"
          >
            <RotateCcw size={16} /> Play Again
          </button>
        </div>
      )}
    </div>
  );
}




