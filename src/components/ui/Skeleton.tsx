interface SkeletonCardProps {
  className?: string;
}

export function SkeletonCard({ className = '' }: SkeletonCardProps) {
  return (
    <div
      className={`rounded-lg border border-line bg-panel overflow-hidden animate-pulse ${className}`}
    >
      <div className="aspect-[4/3] bg-panel2" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-panel2 rounded w-3/4" />
        <div className="h-3 bg-panel2 rounded w-1/2" />
      </div>
    </div>
  );
}

interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export function SkeletonText({ lines = 3, className = '' }: SkeletonTextProps) {
  const widths = ['w-full', 'w-5/6', 'w-4/6', 'w-3/4', 'w-2/3'];

  return (
    <div className={`space-y-2 animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-3 bg-panel2 rounded ${widths[i % widths.length]}`}
        />
      ))}
    </div>
  );
}

interface SkeletonCircleProps {
  size?: number;
  className?: string;
}

export function SkeletonCircle({
  size = 40,
  className = '',
}: SkeletonCircleProps) {
  return (
    <div
      className={`rounded-full bg-panel2 animate-pulse ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
