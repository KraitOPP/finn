import { useRef, useState } from "react";
import type {
  DiscoveryMetricSupport,
  PeerRanking,
  PeerRankingFactor,
  PeerRankingRow,
  StockScreenRun,
} from "../../contracts/generated/models.ts";
import { requestContract } from "../api/request.ts";
import { usePrivateCommand } from "../api/usePrivateCommand.ts";
import { useResource } from "../api/useResource.ts";
import { LocalTime } from "../monitoring/LocalTime.tsx";
import { sectors } from "./DiscoveryFields.tsx";
import { AnchorEvidence } from "./Evidence.tsx";
import { factAmount, metricLabels } from "./FinancialFacts.tsx";
import { factReasons } from "./ThesisConditions.tsx";

const base = "/api/v1/discovery";
export function PeerRankings({
  run,
  metrics,
}: {
  run: StockScreenRun;
  metrics: DiscoveryMetricSupport[];
}) {
  const [open, setOpen] = useState(false);
  const [rankingId, setRankingId] = useState("");
  const sector = run.screen.definition.sector;
  const peers = run.inputs.companies.filter(
    (item) => item.member.sector === sector,
  );
  const allowed = metrics.filter((item) => item.sectors.includes(sector));
  const [companyIds, setCompanyIds] = useState(
    peers.map((item) => item.member.companyId),
  );
  const [factors, setFactors] = useState<PeerRankingFactor[]>([]);
  const attempt = useRef<{ signature: string; id: string } | null>(null);
  const path = `${base}/screen-runs/${run.runId}/rankings`;
  const history = useResource("PeerRankingIndex", open ? path : null);
  const rank = useResource(
    "PeerRanking",
    open && rankingId ? `${base}/rankings/${rankingId}` : null,
  );
  const command = usePrivateCommand();
  function update(
    metric: PeerRankingFactor["metric"],
    values: Partial<PeerRankingFactor>,
  ) {
    setFactors((previous) =>
      previous.map((item) =>
        item.metric === metric ? { ...item, ...values } : item,
      ),
    );
  }
  return (
    <details onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>Compare and rank peers</summary>
      {open && (
        <>
          <p>
            {sectors[sector]} companies in this saved run. Scores are relative
            to the selected peers and reflect your factor weights and
            directions.
          </p>
          {peers.length < 2 ? (
            <p>This run needs at least two companies in the selected sector.</p>
          ) : (
            <form
              className="workspace-form"
              onSubmit={async (event) => {
                event.preventDefault();
                const signature = JSON.stringify({ companyIds, factors });
                if (attempt.current?.signature !== signature)
                  attempt.current = { signature, id: crypto.randomUUID() };
                const requestId = attempt.current.id;
                const saved = await command.run((csrf) =>
                  requestContract("PeerRanking", path, {
                    method: "POST",
                    csrf,
                    body: { companyIds, factors, requestId },
                  }),
                );
                if (saved) {
                  attempt.current = null;
                  setRankingId(saved.rankingId);
                  history.reload();
                }
              }}
            >
              <details>
                <summary>Selected peers ({companyIds.length})</summary>
                {peers.map(({ member }) => (
                  <label key={member.companyId}>
                    <input
                      type="checkbox"
                      checked={companyIds.includes(member.companyId)}
                      onChange={(event) =>
                        setCompanyIds((previous) =>
                          event.target.checked
                            ? [...previous, member.companyId]
                            : previous.filter((id) => id !== member.companyId),
                        )
                      }
                    />
                    {member.name} · {member.exchange} {member.symbol}
                  </label>
                ))}
              </details>
              <fieldset>
                <legend>Factors and relative weights</legend>
                {allowed.map(({ metric }) => {
                  const factor = factors.find((item) => item.metric === metric);
                  return (
                    <div className="workspace-form" key={metric}>
                      <label>
                        <input
                          type="checkbox"
                          checked={Boolean(factor)}
                          onChange={(event) =>
                            setFactors((previous) =>
                              event.target.checked
                                ? [
                                    ...previous,
                                    { metric, direction: "HIGHER", weight: 1 },
                                  ]
                                : previous.filter(
                                    (item) => item.metric !== metric,
                                  ),
                            )
                          }
                        />
                        {metricLabels[metric]}
                      </label>
                      {factor && (
                        <>
                          <label>
                            Preferred direction{" "}
                            <select
                              value={factor.direction}
                              onChange={(event) =>
                                update(metric, {
                                  direction: event.target
                                    .value as PeerRankingFactor["direction"],
                                })
                              }
                            >
                              <option value="HIGHER">Higher</option>
                              <option value="LOWER">Lower</option>
                            </select>
                          </label>
                          <label>
                            Weight{" "}
                            <input
                              required
                              type="number"
                              min={1}
                              max={100}
                              step={1}
                              value={factor.weight || ""}
                              onChange={(event) =>
                                update(metric, {
                                  weight: Number(event.target.value),
                                })
                              }
                            />
                          </label>
                        </>
                      )}
                    </div>
                  );
                })}
              </fieldset>
              <button
                type="submit"
                disabled={
                  command.busy || companyIds.length < 2 || factors.length === 0
                }
              >
                Save peer comparison
              </button>
            </form>
          )}
          {history.value && history.value.items.length > 0 && (
            <label>
              Saved comparison{" "}
              <select
                value={rankingId}
                onChange={(event) => setRankingId(event.target.value)}
              >
                <option value="">Choose a saved comparison</option>
                {history.value.items.map((item) => (
                  <option key={item.rankingId} value={item.rankingId}>
                    {item.createdAt}
                  </option>
                ))}
              </select>
            </label>
          )}
          {(command.error || history.error || rank.error) && (
            <p role="alert">{command.error || history.error || rank.error}</p>
          )}
          {rank.loading && <p role="status">Loading peer comparison…</p>}
          {rank.value && (
            <RankingView key={rank.value.rankingId} ranking={rank.value} />
          )}
        </>
      )}
    </details>
  );
}

function RankingView({ ranking }: { ranking: PeerRanking }) {
  return (
    <section>
      <h4>Peer scores</h4>
      <p>
        {ranking.completePeers} of {ranking.rows.length} companies cover every
        selected factor. Saved <LocalTime value={ranking.createdAt} />.
      </p>
      <p>
        Each factor uses its position among complete peers, with ties averaged.
        Points reflect the factor's share of total weight. Absolute figures can
        favour larger companies.
      </p>
      {ranking.completePeers < 2 && (
        <p>At least two complete peers are needed for scores.</p>
      )}
      <ul>
        {ranking.specification.factors.map((factor) => (
          <li key={factor.metric}>
            {metricLabels[factor.metric]} ·{" "}
            {factor.direction === "HIGHER"
              ? "Higher preferred"
              : "Lower preferred"}{" "}
            · weight {factor.weight}
          </li>
        ))}
      </ul>
      {ranking.rows.map((row) => (
        <PeerRow key={row.member.companyId} row={row} />
      ))}
    </section>
  );
}

function PeerRow({ row }: { row: PeerRankingRow }) {
  const [anchor, setAnchor] = useState("");
  return (
    <details>
      <summary>
        {row.member.name} ·{" "}
        {row.score !== null
          ? `Rank ${row.rank} · ${row.score} points`
          : row.status === "MISSING_FACTOR"
            ? "Missing factor"
            : "Insufficient peers"}
      </summary>
      <p>
        <a href={`#/research?company=${row.member.companyId}`}>
          Open company research and thesis
        </a>
        {" · "}
        <a href={`#/portfolio?candidate=${row.member.listingId}`}>
          Model portfolio effect
        </a>
      </p>
      <ul>
        {row.contributions.map((item) => (
          <li key={item.factor.metric}>
            {metricLabels[item.factor.metric]} ·{" "}
            {item.fact ? factAmount(item.fact) : factReasons[item.reason]}
            {item.points !== null &&
              ` · ${item.points} points (peer percentile ${item.percentile})`}
            {item.relativeWeakness && " · Below peer midpoint"}
            {item.fact && (
              <button
                type="button"
                onClick={() =>
                  setAnchor(
                    anchor === item.fact?.anchorId
                      ? ""
                      : (item.fact?.anchorId ?? ""),
                  )
                }
              >
                View cited figure
              </button>
            )}
          </li>
        ))}
      </ul>
      {anchor && <AnchorEvidence id={anchor} />}
    </details>
  );
}
