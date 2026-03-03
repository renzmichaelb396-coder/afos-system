"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type BillingResponse = {
  year: number;
  month: number;
  periodId?: string;
  isClosed?: boolean;
  closedAt?: string | null;
  closedById?: string | null;
};

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function monthLabel(m: number) {
  return MONTH_NAMES[m - 1] ?? `Month ${m}`;
}

export default function BillingPage() {
  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1);

  const [data, setData] = useState<BillingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const years = useMemo(() => {
    const y = new Date().getFullYear();
    return [y - 1, y, y + 1];
  }, []);

  async function load(y: number, m: number) {
    setErr(null);
    setLoading(true);
    const res = await fetch(`/api/billing?year=${y}&month=${m}`);
    const json = (await res.json()) as BillingResponse;
    setData(json);
    setLoading(false);
  }

  async function closePeriod() {
    if (!data) return;
    if (data.isClosed) return;

    const ok = window.confirm(
      `Close billing period ${monthLabel(month)} ${year}? This will lock payments for this month.`
    );
    if (!ok) return;

    setErr(null);
    setClosing(true);

    const res = await fetch("/api/billing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year, month }),
    });

    const json = await res.json();
    if (!res.ok) {
      setErr(json?.error || "Failed to close billing period");
      setClosing(false);
      return;
    }

    await load(year, month);
    setClosing(false);
  }

  useEffect(() => {
    load(year, month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isClosed = Boolean(data?.isClosed);

  return (
    <div className="flex min-h-screen">
      <div className="flex-1">
        <div className="page-shell">
          {/* Header */}
          <div className="page-header">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
                  Dashboard
                </Link>
                <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
                <span className="text-sm font-medium text-gray-900">Billing</span>
              </div>
              <h1 className="page-title">Billing Period</h1>
              <p className="page-sub">
                Manage billing period status for{" "}
                <span className="font-medium text-gray-700">{monthLabel(month)} {year}</span>
              </p>
            </div>

            {/* Period selector */}
            <div className="flex items-center gap-3">
              <select
                value={year}
                onChange={(e) => {
                  const y = Number(e.target.value);
                  setYear(y);
                  load(y, month);
                }}
                className="form-select w-24"
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>

              <select
                value={month}
                onChange={(e) => {
                  const m = Number(e.target.value);
                  setMonth(m);
                  load(year, m);
                }}
                className="form-select w-36"
              >
                {Array.from({ length: 12 }).map((_, i) => {
                  const m = i + 1;
                  return (
                    <option key={m} value={m}>{monthLabel(m)}</option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Error alert */}
          {err && (
            <div className="alert alert-error mb-6">
              <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <span>{err}</span>
            </div>
          )}

          {/* Billing period card */}
          {loading ? (
            <div className="card card-pad flex items-center justify-center py-16">
              <svg className="h-6 w-6 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="ml-3 text-sm text-gray-500">Loading billing period…</span>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Status card */}
              <div className="lg:col-span-2">
                <div className="card card-pad">
                  <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-base font-semibold text-gray-900">
                        {monthLabel(month)} {year}
                      </h2>
                      <p className="mt-0.5 text-sm text-gray-500">Billing period details</p>
                    </div>
                    <span className={`badge ${isClosed ? "badge-gray" : "badge-green"}`}>
                      {isClosed ? "Closed" : "Open"}
                    </span>
                  </div>

                  {/* Info rows */}
                  <div className="divide-y divide-gray-50">
                    <div className="flex items-center justify-between py-3">
                      <span className="text-sm text-gray-500">Period</span>
                      <span className="text-sm font-medium text-gray-900">
                        {monthLabel(month)} {year}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <span className="text-sm text-gray-500">Status</span>
                      <span className={`text-sm font-semibold ${isClosed ? "text-gray-600" : "text-green-600"}`}>
                        {isClosed ? "CLOSED" : "OPEN"}
                      </span>
                    </div>
                    {isClosed && data?.closedAt && (
                      <div className="flex items-center justify-between py-3">
                        <span className="text-sm text-gray-500">Closed At</span>
                        <span className="text-sm text-gray-700">
                          {new Date(data.closedAt).toLocaleString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    )}
                    {data?.periodId && (
                      <div className="flex items-center justify-between py-3">
                        <span className="text-sm text-gray-500">Period ID</span>
                        <span className="font-mono text-xs text-gray-500">{data.periodId}</span>
                      </div>
                    )}
                  </div>

                  {/* Action */}
                  <div className="mt-6 border-t border-gray-100 pt-5">
                    <button
                      onClick={closePeriod}
                      disabled={isClosed || closing}
                      className={`btn ${isClosed ? "btn-secondary" : "btn-danger"}`}
                      title={isClosed ? "Already closed" : "Close this billing period (ADMIN only)"}
                    >
                      {closing ? (
                        <>
                          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Closing…
                        </>
                      ) : isClosed ? (
                        <>
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                          </svg>
                          Period Closed
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                          </svg>
                          Close Billing Period
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Info sidebar */}
              <div className="card card-pad h-fit">
                <h3 className="mb-3 text-sm font-semibold text-gray-900">About Billing Periods</h3>
                <div className="space-y-3 text-sm text-gray-600">
                  <p>
                    A billing period tracks payment status for all clients within a given month.
                  </p>
                  <p>
                    Closing a period <strong>locks</strong> all payments for that month. No new payments can be recorded after closing.
                  </p>
                  <div className="alert alert-info mt-4">
                    <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                    </svg>
                    <span>Only ADMIN accounts can close a billing period.</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
