"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/pages/SearchTest", label: "SearchTest" },
  // { href: "/pages/StartBackEnd", label: "StartBackEnd" },
];

export default function Tabs() {
  const pathname = usePathname();

  return (
    <nav style={{ display: "flex", gap: 12, alignItems: "center" }}>
      {TABS.map((tab) => {
        const active =
          pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={active ? "shandowdown" : "shandowup"}
            style={{
              textDecoration: "none",
              color: "#171717",
              padding: "6px 20px",
              borderRadius: 5,
              fontSize: 14,
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
