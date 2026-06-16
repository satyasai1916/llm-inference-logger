export default function DashboardLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="h-8 w-36 bg-[#1a1d27] rounded-lg animate-pulse mb-6" />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-24 bg-[#1a1d27] border border-[#2a2d3a] rounded-xl animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-64 bg-[#1a1d27] border border-[#2a2d3a] rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}
