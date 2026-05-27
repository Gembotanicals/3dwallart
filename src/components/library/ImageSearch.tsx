"use client";

import { useEffect, useState } from "react";

interface ImageSearchProps {
  onSearch: (query: string) => void;
  resultCount: number;
}

export function ImageSearch({ onSearch, resultCount }: ImageSearchProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, onSearch]);

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dim"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search images..."
          className="w-full pl-10 pr-4 py-2 rounded border border-line bg-panel2 text-sm text-ink placeholder-dim focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/50"
        />
      </div>
      <span className="text-sm text-dim whitespace-nowrap">
        {resultCount} {resultCount === 1 ? "image" : "images"}
      </span>
    </div>
  );
}
