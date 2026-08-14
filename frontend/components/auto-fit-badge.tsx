"use client";

import React, { useRef, useState, useLayoutEffect, useEffect } from "react";

export function AutoFitBadge({
  text,
  badgeClassName = "",
  textClassName = "",
  icon
}: {
  text: string;
  badgeClassName?: string;
  textClassName?: string;
  icon?: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [fontSize, setFontSize] = useState<number | null>(null);
  const [isMultiLine, setIsMultiLine] = useState(false);

  const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

  useIsomorphicLayoutEffect(() => {
    const container = containerRef.current;
    const textEl = textRef.current;
    if (!container || !textEl || !text) return;

    const fit = () => {
      const parent = container.parentElement;
      const rowWidth = parent ? parent.clientWidth : container.clientWidth || 150;
      if (rowWidth <= 0) return;

      const maxBadgeWidth = Math.max(Math.floor(rowWidth * 0.48), 40);
      container.style.maxWidth = `${maxBadgeWidth}px`;

      const style = window.getComputedStyle(container);
      const padLeft = parseFloat(style.paddingLeft) || 4;
      const padRight = parseFloat(style.paddingRight) || 4;
      const iconWidth = icon ? 11 : 0;
      const availableWidth = Math.max(maxBadgeWidth - padLeft - padRight - iconWidth, 15);

      // Max and Min font sizes based on container width
      const maxFontSize = Math.min(Math.max(rowWidth * 0.065, 8), 12);
      const minSingleLineSize = Math.min(Math.max(rowWidth * 0.036, 5.5), 6.5);

      let currentSize = maxFontSize;

      textEl.style.whiteSpace = "nowrap";
      textEl.style.fontSize = `${currentSize}px`;

      // Iteratively reduce font size until scrollWidth fits within availableWidth
      while (currentSize > minSingleLineSize && textEl.scrollWidth > availableWidth) {
        currentSize -= 0.25;
        textEl.style.fontSize = `${currentSize}px`;
      }

      if (textEl.scrollWidth > availableWidth) {
        setIsMultiLine(true);
        textEl.style.whiteSpace = "normal";
        textEl.style.wordBreak = "break-word";
        textEl.style.overflowWrap = "break-word";
        textEl.style.fontSize = `${minSingleLineSize}px`;
      } else {
        setIsMultiLine(false);
        textEl.style.whiteSpace = "nowrap";
      }

      setFontSize(currentSize);
    };

    fit();

    const ro = new ResizeObserver(fit);
    ro.observe(container);
    if (container.parentElement) {
      ro.observe(container.parentElement);
    }

    return () => ro.disconnect();
  }, [text, icon]);

  if (!text) return null;

  const isLong = text.length > 12;
  const isVeryLong = text.length > 22;

  return (
    <div
      ref={containerRef}
      className={`pointer-events-auto flex items-center justify-center rounded-md border shadow-sm backdrop-blur-md transition-all shrink-0 poster-badge-box ${
        isMultiLine ? "leading-tight text-center" : ""
      } ${badgeClassName}`}
    >
      {icon && <span className="mr-0.5 shrink-0 flex items-center">{icon}</span>}
      <span
        ref={textRef}
        className={`font-black uppercase block poster-badge-text ${
          isVeryLong
            ? "tracking-tight"
            : isLong
            ? "tracking-normal"
            : "tracking-wider"
        } ${
          isMultiLine
            ? "whitespace-normal text-center leading-tight break-words"
            : "whitespace-nowrap"
        } ${textClassName}`}
        style={{
          fontSize: fontSize ? `${fontSize}px` : undefined,
          lineHeight: isMultiLine ? 1.08 : 1.15
        }}
      >
        {text}
      </span>
    </div>
  );
}
