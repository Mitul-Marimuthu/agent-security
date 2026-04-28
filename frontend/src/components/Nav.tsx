"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/",        label: "Overview" },
  { href: "/detail",  label: "Detail"   },
  { href: "/compare", label: "Compare"  },
  { href: "/metrics", label: "Metrics"  },
];

export default function Nav() {
  const path = usePathname();

  return (
    <aside className="w-52 shrink-0 bg-slate-900 text-slate-100 flex flex-col p-5 gap-1">
      <div className="mb-6">
        <p className="text-lg font-bold tracking-tight">MAGPIE</p>
        <p className="text-xs text-slate-400 mt-0.5">Privacy Evaluation</p>
      </div>
      {links.map(({ href, label }) => {
        const active = href === "/" ? path === "/" : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              active
                ? "bg-indigo-600 text-white"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </aside>
  );
}
