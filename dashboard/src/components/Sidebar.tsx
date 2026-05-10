"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Monitor, Film, Search } from "lucide-react";
import { ReactNode } from "react";

const navItems: { href: string; icon: ReactNode; label: string }[] = [
  { href: "/", icon: <LayoutDashboard size={18} />, label: "Overview" },
  { href: "/channels", icon: <Monitor size={18} />, label: "Channels" },
  { href: "/videos", icon: <Film size={18} />, label: "Videos" },
  { href: "/niches", icon: <Search size={18} />, label: "Niche Explorer" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M8 5.14v14l11-7-11-7z" fill="url(#logoGrad)" />
            <defs>
              <linearGradient id="logoGrad" x1="8" y1="5" x2="19" y2="12">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div className="sidebar-logo-text">
          <div className="sidebar-logo-title">YouTube</div>
          <div className="sidebar-logo-sub">Market Intelligence</div>
        </div>
      </div>

      <div className="sidebar-section">Analytics</div>
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-link ${pathname === item.href ? "active" : ""}`}
          >
            <span className="sidebar-link-icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div style={{ flex: 1 }} />

      <div className="sidebar-footer">
        <div className="sidebar-footer-status">
          <div className="status-dot" />
          <span>Live</span>
        </div>
        <span style={{ opacity: 0.5 }}>Made with ❤️ by Mugni Hidayah</span>
      </div>
    </aside>
  );
}
