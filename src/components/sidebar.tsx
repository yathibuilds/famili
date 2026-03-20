import Link from "next/link";

const navItems = [
  ["Dashboard", "#dashboard"],
  ["Tasks", "#tasks"],
  ["Finance", "#finance"],
  ["Calendar", "#calendar"],
  ["Family", "#family"],
  ["Settings", "#settings"],
];

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div>
        <p className="eyebrow">Working name</p>
        <h1>Famli</h1>
        <p className="muted">Private home hub with room for future SaaS growth.</p>
      </div>

      <nav>
        {navItems.map(([label, href]) => (
          <Link key={href} href={href} className="navLink">
            {label}
          </Link>
        ))}
      </nav>

      <div className="panel smallPanel">
        <p className="panelTitle">Build status</p>
        <ul className="miniList">
          <li>Starter UI ready</li>
          <li>Vercel-ready Next.js app</li>
          <li>Auth and database next</li>
        </ul>
      </div>
    </aside>
  );
}
