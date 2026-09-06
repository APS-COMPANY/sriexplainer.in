"use client";
import dynamic from "next/dynamic";

const HeaderInner = dynamic(
  () => import("./header").then((m) => ({ default: m.Header })),
  {
    ssr: false,
    loading: () => (
      <header className="sticky top-0 z-40 bg-[#000000]/95 backdrop-blur-xl border-b border-white/15 w-full select-none shadow-[0_4px_20px_rgba(0,0,0,0.8)]">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between gap-3 lg:gap-6">
          <div className="flex items-center gap-2 xs:gap-2.5 sm:gap-3 shrink-0">
            <div className="h-8 w-8 xs:h-9 xs:w-9 sm:h-10 sm:w-10 rounded-xl bg-white text-black flex items-center justify-center font-black text-xs xs:text-sm sm:text-base border-2 border-white">
              <span className="font-display font-black">S</span>
            </div>
            <span className="font-display font-black text-white text-xs xs:text-sm sm:text-base lg:text-lg tracking-tight uppercase">
              SRI EXPLAINER
            </span>
          </div>
        </div>
        {/* Mobile Search Bar Skeleton on screens < 768px */}
        <div className="md:hidden px-4 pb-3 pt-1 border-t border-white/5">
          <div className="h-8 w-full bg-[#0E0E0E] border border-white/20 rounded-full" />
        </div>
      </header>
    )
  }
);

export function ClientHeader() {
  return <HeaderInner />;
}
