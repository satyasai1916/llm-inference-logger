export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 w-40 bg-[#1a1d27] rounded-lg animate-pulse" />
        <div className="h-9 w-24 bg-[#1a1d27] rounded-lg animate-pulse" />
      </div>
      <ul className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <li key={i} className="h-[72px] rounded-xl bg-[#1a1d27] border border-[#2a2d3a] animate-pulse" />
        ))}
      </ul>
    </div>
  );
}
