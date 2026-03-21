import Link from "next/link";

const navItems = [
  ["Dashboard", "#dashboard"],
  ["Tasks", "#tasks"],
  ["Finance", "#finance"],
  ["Calendar", "#calendar"],
  ["Family", "#family"],
  ["Settings", "#settings"],
] as const;

export function Sidebar() {
  return (
    <aside className="border-b border-neutral-800 bg-neutral-950/95 px-6 py-8 text-white backdrop-blur lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:px-7">
      <div className="flex h-full flex-col gap-6">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-400">Working name</p>
          <h1 className="text-3xl font-semibold tracking-tight">Famli</h1>
          <p className="text-sm leading-6 text-neutral-400">
            Private home hub with room for future SaaS growth.
          </p>
        </div>

        <nav className="grid gap-2">
          {navItems.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="rounded-2xl px-4 py-3 text-sm font-medium text-neutral-300 transition hover:bg-neutral-900 hover:text-white"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="rounded-3xl border border-neutral-800 bg-neutral-900/80 p-5 shadow-xl shadow-black/10 lg:mt-auto">
          <p className="text-sm font-medium text-white">Build status</p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-neutral-400">
            <li>Starter UI unified</li>
            <li>Vercel-ready Next.js app</li>
            <li>Auth, family and tasks connected</li>
          </ul>
        </div>
      </div>
    </aside>
  );
}
