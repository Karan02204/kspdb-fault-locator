export default function Header() {
  return (
    <header className="h-16 bg-slate-900 text-white flex items-center justify-between px-6 shadow">
      <div>
        <h1 className="text-xl font-bold">
          ⚡ Propel Grid Intelligence Platform
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />

        <span className="text-sm">LIVE</span>
      </div>
    </header>
  );
}