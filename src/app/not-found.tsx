import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-49px)] text-gray-400">
      <div className="text-center">
        <h1 className="text-5xl font-bold mb-3 text-white">404</h1>
        <p className="mb-6 text-slate-400">Page not found</p>
        <Link href="/" className="text-indigo-400 hover:text-indigo-300 underline text-sm">
          ← Go back home
        </Link>
      </div>
    </div>
  );
}
