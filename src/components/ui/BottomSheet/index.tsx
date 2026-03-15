"use client";

import { useEffect, useState } from "react";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function BottomSheet({ isOpen, onClose, children }: BottomSheetProps) {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimating(true));
      });
    } else {
      setAnimating(false);
      const timer = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Overlay */}
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          animating ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />
      {/* Sheet */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out max-h-[80vh] overflow-y-auto ${
          animating ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-slate-300 rounded-full" />
        </div>
        <div className="px-4 pb-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>
  );
}
