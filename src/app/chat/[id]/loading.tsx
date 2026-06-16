export default function ChatLoading() {
  return (
    <div className="flex flex-col h-[calc(100vh-49px)]">
      <div className="border-b border-[#2a2d3a] px-4 py-3 bg-[#1a1d27] flex items-center gap-3">
        <div className="h-4 w-12 bg-[#2a2d3a] rounded animate-pulse" />
        <div className="flex-1">
          <div className="h-4 w-48 bg-[#2a2d3a] rounded animate-pulse mb-1.5" />
          <div className="h-3 w-32 bg-[#2a2d3a] rounded animate-pulse" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
            <div className={`h-12 rounded-2xl animate-pulse bg-[#1a1d27] border border-[#2a2d3a] ${i % 2 === 0 ? "w-48" : "w-64"}`} />
          </div>
        ))}
      </div>
      <div className="border-t border-[#2a2d3a] px-4 py-3 bg-[#1a1d27]">
        <div className="h-10 bg-[#0f1117] border border-[#2a2d3a] rounded-xl animate-pulse" />
      </div>
    </div>
  );
}
