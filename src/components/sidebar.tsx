import Link from "next/link";

const navItems = [
  ["Dashboard", "#dashboard"],
  ["Calendar", "#calendar"],
  ["Task blocking", "#task-blocking"],
  ["Circles", "#circles"],
  ["Family Access", "#family"],
  ["Security", "/settings/security"],
] as const;

export function Sidebar() {
  return (
    <aside className="border-b border-neutral-800 bg-neutral-950/95 px-6 py-8 text-white backdrop-blur lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:px-7">
      <div className="flex h-full flex-col gap-6">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-400">
            Home operating system
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Famili</h1>
          <p className="text-sm leading-6 text-neutral-400">
            Private life hub with invite-only family access, circles, tasks, and a unified calendar.
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
            <li>Email invite scaffold added</li>
            <li>Calendar attendees and circle share added</li>
            <li>Task blocking added</li>
            <li>Circle management added</li>
          </ul>
        </div>
      </div>
    </aside>
  );
}
