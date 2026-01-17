"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";

import { ControlRail } from "@/components/layout/ControlRail";
import { LiveStream } from "@/components/layout/LiveStream";
import { KpiGrid } from "@/components/dashboard/KpiGrid";
import { VisitorLineChart } from "@/components/charts/VisitorLineChart";
import { StatusDonut } from "@/components/charts/StatusDonut";
import { StatusChip, type StatusChipProps } from "@/components/ui/StatusChip";
import { FeedItem, liveFeed, railIcons } from "@/lib/dashboardData";
import { getVisitorsByDay } from "@/lib/mockVisitors";
import type { KpiStat } from "@/lib/types/dashboard";
import { useAdminDashboard } from "@/lib/hooks/useAdminDashboard";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.18,
    },
  },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

const chartVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
};

function normalizeStatus(status?: string | null): FeedItem["status"] {
  if (!status) {
    return "Pending";
  }
  const normalized = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  if (normalized === "Allowed" || normalized === "Blocked" || normalized === "Pending") {
    return normalized as FeedItem["status"];
  }
  return "Pending";
}

export default function AdminPage() {
  const [activeIcon, setActiveIcon] = useState(0);
  const { data, loading, error, refetch } = useAdminDashboard();
  const dailyStats = useMemo(() => getVisitorsByDay(7), []);
  const fallbackLineData = useMemo(
    () => dailyStats.map((entry) => ({ day: entry.day, value: Math.max(entry.total, 3) })),
    [dailyStats],
  );

  const statusChips = useMemo<StatusChipProps[]>(() => {
    const readiness = data?.kpis.gate_readiness_pct ?? 0;
    const alertQueue = data?.kpis.review_today ?? 0;
    const throughput = data?.kpis.total_today ?? 0;
    return [
      { label: "Gate readiness", value: `${readiness.toFixed(1)}%`, detail: "Allowed arrivals", tone: "success" },
      {
        label: "Alert queue",
        value: `${alertQueue}`,
        detail: "Health / review flags",
        tone: alertQueue > 0 ? "warning" : "neutral",
      },
      { label: "Live throughput", value: `${throughput}`, detail: "Visitors logged today", tone: "neutral" },
    ];
  }, [data]);

  const computedStats: KpiStat[] = useMemo(() => {
    const kpis = data?.kpis;
    return [
      { label: "Today visitors", value: kpis?.total_today ?? 0, delta: "+0.0%" },
      { label: "Allowed entries", value: kpis?.allowed_today ?? 0, delta: "+0.0%" },
      { label: "Blocked (health)", value: kpis?.health_blocked_today ?? 0, delta: "-0.0%" },
      { label: "Pending review", value: kpis?.review_today ?? 0, delta: "+0.0%" },
    ];
  }, [data]);

  const donutData = useMemo(() => {
    const kpis = data?.kpis;
    return [
      { name: "Allowed", value: kpis?.allowed_today ?? 0, color: "#16A34A" },
      { name: "Blocked", value: kpis?.blocked_today ?? 0, color: "#DC2626" },
      { name: "Pending", value: kpis?.pending_today ?? 0, color: "#F59E0B" },
    ];
  }, [data]);

  const liveStreamItems = useMemo<FeedItem[]>(() => {
    if (data?.live_stream?.length) {
      return data.live_stream.map((entry) => ({
        name: entry.full_name ?? "Visitor",
        status: normalizeStatus(entry.status ?? entry.health_status),
        purpose: entry.purpose ?? "Standby",
        time: entry.created_at
          ? new Date(entry.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
          : "—",
      }));
    }
    return liveFeed;
  }, [data]);

  const chartData = data?.trend?.length
    ? data.trend.map((item) => ({ day: item.hour ?? "—", value: item.count ?? 0 }))
    : fallbackLineData;

  const nextArrival = liveStreamItems[0];

  return (
    <div className="relative flex min-h-screen w-screen overflow-hidden bg-[#F8FAFC]">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white to-[#E0EEFF]" />
      <motion.main
        className="relative z-10 flex h-full w-full overflow-hidden"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <ControlRail items={railIcons} activeIndex={activeIcon} onHover={setActiveIcon} />
        <section className="flex flex-1 flex-col gap-6 px-6 py-8">
          <motion.header variants={sectionVariants} className="space-y-3">
            <p className="text-xs uppercase tracking-[0.4em] text-[#94A3B8]">Command center</p>
            <h1 className="text-4xl font-semibold text-[#0F172A]">Immersive intelligence grid</h1>
            <p className="max-w-2xl text-sm text-[#475569]">
              Single-pane control view for visitor intake, health telemetry, and gate readiness. Every pulse and badge is live.
            </p>
          </motion.header>
          <div className="flex flex-wrap gap-3 rounded-[20px] border border-[#E2E8F0] bg-white/80 px-5 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-[#475569] shadow-sm">
            <Link
              href="/admin"
              className="rounded-full border border-[#CBD5E1] px-4 py-2 text-[0.65rem] text-[#0F172A] transition hover:border-[#2563EB] hover:text-[#2563EB]"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/visitors"
              className="rounded-full border border-[#2563EB] px-4 py-2 text-[0.65rem] text-[#2563EB] transition hover:bg-[#EFF6FF]"
            >
              Visitors
            </Link>
            <Link
              href="/visitor/checkin"
              className="rounded-full border border-[#CBD5E1] px-4 py-2 text-[0.65rem] text-[#0F172A] transition hover:border-[#2563EB] hover:text-[#2563EB]"
            >
              New Check-in
            </Link>
          </div>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[18px] border border-[#FCA5A5] bg-[#FEF2F2] px-5 py-3 text-sm font-semibold text-[#B91C1C]"
            >
              <p>{error}</p>
              <button
                type="button"
                onClick={refetch}
                className="mt-2 text-xs font-semibold text-[#2563EB] underline underline-offset-2"
              >
                Retry
              </button>
            </motion.div>
          )}

          <motion.article
            variants={sectionVariants}
            className="flex flex-wrap items-center justify-between gap-4 rounded-[30px] border border-white/70 bg-gradient-to-br from-white to-[#EFF6FF] p-5 shadow-[0_30px_60px_rgba(15,23,42,0.18)] backdrop-blur-xl"
            whileHover={{ translateY: -2, boxShadow: "0 35px 80px rgba(15,23,42,0.3)" }}
          >
            {loading ? (
              <div className="flex-1 space-y-2">
                <div className="h-3 w-32 rounded-full bg-[#E2E8F0]" />
                <div className="h-6 w-48 rounded-full bg-[#E2E8F0]" />
                <div className="h-3 w-40 rounded-full bg-[#E2E8F0]" />
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.4em] text-[#94A3B8]">Next arrival</p>
                <p className="text-2xl font-semibold text-[#0F172A]">
                  {nextArrival?.name ?? "Awaiting crew"}
                </p>
                <p className="text-sm text-[#475569]">
                  {nextArrival?.purpose ?? "Standby"} - {nextArrival?.status ?? "Pending"}
                </p>
              </div>
            )}
            <div className="text-right">
              {loading ? (
                <div className="space-y-1 text-right">
                  <div className="mx-auto h-3 w-10 rounded-full bg-[#E2E8F0]" />
                  <div className="mx-auto h-6 w-20 rounded-full bg-[#E2E8F0]" />
                </div>
              ) : (
                <>
                  <p className="text-xs uppercase tracking-[0.4em] text-[#94A3B8]">ETA</p>
                  <p className="text-3xl font-semibold text-[#2563EB]">
                    {nextArrival?.time ?? "-"}
                  </p>
                  <p className="text-xs text-[#475569]">Live stream arrival</p>
                </>
              )}
            </div>
          </motion.article>

          <motion.div variants={sectionVariants} className="grid gap-4 md:grid-cols-3">
            {statusChips.map((chip) => (
              <StatusChip key={chip.label} {...chip} />
            ))}
          </motion.div>

          <motion.div variants={sectionVariants}>
            <KpiGrid stats={computedStats} />
          </motion.div>

          <div className="grid flex-1 gap-6 lg:grid-cols-2">
            <motion.div
              variants={chartVariants}
              initial="hidden"
              animate="visible"
              className="rounded-[28px] border border-white/60 bg-white/70 p-5 shadow-[0_35px_60px_rgba(15,23,42,0.18)] backdrop-blur-3xl"
              whileHover={{ y: -3, boxShadow: "0 40px 85px rgba(15,23,42,0.25)" }}
            >
              <VisitorLineChart data={chartData} />
            </motion.div>

            <motion.div
              variants={chartVariants}
              initial="hidden"
              animate="visible"
              className="rounded-[28px] border border-white/60 bg-gradient-to-br from-white to-[#FEF3C7] p-5 shadow-[0_35px_60px_rgba(15,23,42,0.18)] backdrop-blur-3xl"
              whileHover={{ y: -3, boxShadow: "0 40px 85px rgba(15,23,42,0.25)" }}
            >
              <StatusDonut data={donutData} />
            </motion.div>
          </div>
        </section>

        <LiveStream items={liveStreamItems} />
      </motion.main>
    </div>
  );
}
