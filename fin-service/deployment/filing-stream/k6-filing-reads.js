import http from "k6/http";
import { check } from "k6";

const target = __ENV.FINN_BENCHMARK_URL || "http://host.docker.internal:8080";
const token = open(__ENV.FINN_BENCHMARK_COOKIE_FILE || "/finn-private/session-cookie").trim();
const cookies = { FINN_SESSION: token };
const headers = { Accept: "application/json" };
export const options = {
  scenarios: { radar: { executor: "constant-vus", vus: 4, duration: "15s" } },
  discardResponseBodies: true,
  thresholds: { http_req_failed: ["rate<0.01"], checks: ["rate>0.99"] },
};

export default function () {
  const results = http.batch([
    ["GET", `${target}/api/v1/discovery/radar?days=7`, null, { cookies, headers, tags: { name: "Market Radar" } }],
    ["GET", `${target}/api/v1/monitoring/notifications`, null, { cookies, headers, tags: { name: "Inbox" } }],
  ]);
  for (const response of results) check(response, { "authenticated read returns 200": (value) => value.status === 200 });
}

export function handleSummary(data) {
  return { stdout: JSON.stringify({ requests: data.metrics.http_reqs?.values.count,
    requestsPerSecond: data.metrics.http_reqs?.values.rate,
    p95ReadMs: data.metrics.http_req_duration?.values["p(95)"],
    failedRate: data.metrics.http_req_failed?.values.rate }, null, 2) + "\n" };
}
