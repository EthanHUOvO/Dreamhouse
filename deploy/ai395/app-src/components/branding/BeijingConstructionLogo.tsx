"use client";

export default function BeijingConstructionLogo() {
  return <span className="bjg-logo-slot" aria-label="北京建工官方标志预留区域">
    <img src="/branding/beijing-construction-logo.png" alt="北京建工" onLoad={(event) => { const fallback = event.currentTarget.nextElementSibling as HTMLElement | null; if (fallback) fallback.style.display = "none"; }} onError={(event) => { event.currentTarget.style.display = "none"; const fallback = event.currentTarget.nextElementSibling as HTMLElement | null; if (fallback) fallback.style.display = "grid"; }} />
    <span className="bjg-logo-fallback" style={{ display: "none" }}>北京建工<small>匠心建造美好生活</small></span>
  </span>;
}
