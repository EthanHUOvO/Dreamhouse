"use client";

import type { ReactNode } from "react";

export default function DebugPanel({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  if (!enabled) return null;
  return (
    <aside className="customer-debug-panel">
      <details>
        <summary>Debug Panel</summary>
        <div>{children}</div>
      </details>
    </aside>
  );
}
