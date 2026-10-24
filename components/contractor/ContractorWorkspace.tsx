"use client";

import ExecutionMonitoring from "@/components/customer/ExecutionMonitoring";
import type { Order } from "@/lib/types";

export default function ContractorWorkspace({ order }: { order: Order }) {
  const budget = order.residentialBudget ?? null;
  const version = order.downstreamVersion ?? order.approvedVersion;

  return <section className="contractor-workspace">
    {!budget && <div className="contractor-budget-notice" role="status">
      <div><strong>当前订单尚未绑定住宅预算</strong><p>请在客户流程第五步确认预算并提交施工。项目任务与进度待关联，设备演示仍可查看。</p></div>
      <a href="/customer">前往客户流程</a>
    </div>}
    <ExecutionMonitoring
      key={`${order.id}:${version}:${budget?.id ?? "unbound"}:${budget?.version ?? 0}`}
      budget={budget}
      projectKey={order.id}
    />
  </section>;
}
