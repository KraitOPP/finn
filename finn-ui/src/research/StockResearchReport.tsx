import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import { type ReactNode, useId, useState } from "react";
import type {
  StockAiResult,
  StockResearchArticle,
  StockResearchDecision,
  StockResearchFactor,
  StockResearchIssue,
  StockResearchReport,
} from "../../contracts/generated/models.ts";
import { formatRetryDelay } from "../api/request.ts";
import { GoogleSearchSuggestions } from "./GoogleSearchSuggestions.tsx";

type Item = StockResearchReport["items"][number];
type Source = StockResearchReport["sources"][number];
type ReportTab = "Decision" | "Analysis" | "News brief" | "Sources" | "Critic";

const factors: Record<StockResearchFactor, string> = {
  BUSINESS: "Business and competition",
  FINANCIALS: "Financial health",
  VALUATION: "Valuation and peers",
  RISKS: "Downside and governance",
  CATALYSTS: "Upcoming catalysts",
};

const recommendations = {
  RESEARCH_FURTHER: {
    label: "Research further",
    description:
      "The reviewed business, financials and valuation case support a closer look.",
    severity: "success",
  },
  WATCH: {
    label: "Watch for confirmation",
    description:
      "The case is mixed or a key assumption still needs confirmation.",
    severity: "info",
  },
  CAUTION: {
    label: "Proceed with caution",
    description:
      "At least one material factor weighs against the investment case.",
    severity: "warning",
  },
  INSUFFICIENT_EVIDENCE: {
    label: "Gather more evidence",
    description:
      "The reviewed evidence is too limited for a stronger research recommendation.",
    severity: "info",
  },
} as const;

const signals = {
  SUPPORTIVE: { label: "Supportive", color: "success" },
  MIXED: { label: "Mixed", color: "default" },
  ADVERSE: { label: "Adverse", color: "warning" },
} as const;

const verdicts = {
  SUPPORTED: { label: "Supported", color: "default" },
  CHALLENGED: { label: "Challenged", color: "warning" },
  UNSUPPORTED: { label: "Unsupported", color: "error" },
} as const;

const dateFormat = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeZone: "Asia/Kolkata",
});
const date = (value: string) => dateFormat.format(new Date(value));
const price = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
});
const publisher = (source: Source) =>
  new URL(source.url).hostname.replace(/^www\./, "");
const titleOf = (item: Item) =>
  item.factor ? factors[item.factor] : item.title;

export function StockResearchReportView({
  result,
  heading,
  chart,
}: {
  result: StockAiResult;
  heading: string;
  chart?: ReactNode;
}) {
  const { provider, report } = result;
  const { decision, items, sources } = report;
  const newsOnly = report.preset === "NEWS";
  const tabs: ReportTab[] = decision
    ? ["Decision", "Analysis", "News brief", "Sources", "Critic"]
    : newsOnly
      ? ["News brief", "Sources"]
      : ["Analysis", "Sources"];
  const [tab, setTab] = useState<ReportTab>(tabs[0]);
  const id = useId();

  return (
    <Paper
      component="section"
      variant="outlined"
      aria-labelledby={`${id}-title`}
      sx={{ p: { xs: 2, sm: 3 }, minWidth: 0 }}
    >
      <Stack spacing={2}>
        <Box>
          <Typography component="h3" variant="h6" id={`${id}-title`}>
            {heading}
          </Typography>
          <Typography color="text.secondary" variant="body2">
            {provider === "GROQ"
              ? "GPT-OSS 120B via Groq"
              : "Gemini with Google Search"}
            {" · "}
            {date(report.asOf)}
          </Typography>
        </Box>
        {decision?.issue && (
          <ResearchIssue
            issue={decision.issue}
            hasMarket={Boolean(decision.market)}
          />
        )}
        <Tabs
          value={tab}
          onChange={(_, next: ReportTab) => setTab(next)}
          aria-label="Research report"
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            "& .MuiTabs-list": {
              display: { xs: "grid", sm: "flex" },
              gridTemplateColumns: `repeat(${Math.min(tabs.length, 3)}, minmax(0, 1fr))`,
            },
            "& .MuiTab-root": {
              minWidth: { xs: 0, sm: 72 },
              minHeight: { xs: 44, sm: 48 },
              px: { xs: 0.75, sm: 2 },
            },
            "& .MuiTab-root.Mui-selected": {
              boxShadow: { xs: "inset 0 -2px", sm: "none" },
            },
            "& .MuiTabs-indicator": { display: { xs: "none", sm: "block" } },
          }}
        >
          {tabs.map((label, index) => (
            <Tab
              key={label}
              value={label}
              label={label}
              id={`${id}-tab-${index}`}
              aria-controls={`${id}-panel-${index}`}
            />
          ))}
        </Tabs>
        {tabs.map((label, index) => (
          <Box
            key={label}
            role="tabpanel"
            id={`${id}-panel-${index}`}
            aria-labelledby={`${id}-tab-${index}`}
            hidden={tab !== label}
            tabIndex={0}
            sx={{ minWidth: 0 }}
          >
            {tab === label && (
              <>
                {label === "Decision" && decision && (
                  <Decision decision={decision} report={report} />
                )}
                {label === "Analysis" && (
                  <Stack spacing={2}>
                    <Analysis items={items} sources={sources} />
                    {chart}
                  </Stack>
                )}
                {label === "News brief" && <NewsBrief report={report} />}
                {label === "Sources" && <SourceLibrary report={report} />}
                {label === "Critic" && decision && (
                  <Critic decision={decision} report={report} />
                )}
              </>
            )}
          </Box>
        ))}
        {report.searchSuggestions && (
          <GoogleSearchSuggestions html={report.searchSuggestions} />
        )}
      </Stack>
    </Paper>
  );
}

const issueStages = {
  SEARCH: "Source search paused",
  ANALYST: "Stock assessment incomplete",
  CRITIC: "Critic review incomplete",
} as const;

const issueReasons = {
  QUOTA: "Groq’s usage limit has been reached.",
  BUSY: "Stock research is busy. Try again in a moment.",
  TIMEOUT: "Groq took too long to respond. Try again in a moment.",
  ACCESS:
    "Groq denied access. Check the backend API key and model permissions.",
  UNAVAILABLE:
    "Groq’s research service is temporarily unavailable. Try again in a moment.",
  NO_EVIDENCE: "Groq returned too little verifiable evidence for this step.",
} as const;

function ResearchIssue({
  issue,
  hasMarket,
}: {
  issue: StockResearchIssue;
  hasMarket: boolean;
}) {
  return (
    <Alert severity="warning" role="status">
      <Typography component="div" variant="subtitle2">
        {issueStages[issue.stage]}
      </Typography>
      {issueReasons[issue.reason]}
      {issue.retryAfterSeconds && (
        <> Try again in about {formatRetryDelay(issue.retryAfterSeconds)}.</>
      )}
      {issue.stage === "SEARCH" && hasMarket && (
        <> Yahoo price history is still available in Analysis.</>
      )}
    </Alert>
  );
}

function Decision({
  decision,
  report,
}: {
  decision: StockResearchDecision;
  report: StockResearchReport;
}) {
  const recommendation = recommendations[decision.stance];
  const missing = Object.entries(factors).filter(
    ([factor]) =>
      !decision.assessments.some(
        ({ itemIndex }) =>
          report.items[itemIndex]?.factor === factor &&
          decision.checks.some(
            (check) =>
              check.itemIndex === itemIndex && check.verdict !== "UNSUPPORTED",
          ),
      ),
  );
  return (
    <Stack spacing={2}>
      <Alert severity={recommendation.severity} icon={false}>
        <Typography component="h4" variant="subtitle1" sx={{ fontWeight: 700 }}>
          {recommendation.label}
        </Typography>
        {recommendation.description}
      </Alert>
      {decision.status !== "REVIEWED" && !decision.issue && (
        <Typography variant="body2" color="text.secondary">
          {decision.status === "ANALYSIS_UNAVAILABLE"
            ? "The analyst returned no usable assessments. The collected evidence is available in Analysis and Sources."
            : "The critic review is incomplete. Some draft assessments still need review."}
        </Typography>
      )}
      {decision.market && (
        <Typography variant="body2" color="text.secondary">
          Yahoo daily close {price.format(Number(decision.market.close))} on{" "}
          {date(decision.market.lastSession)}
          {decision.market.changePercent !== null && (
            <>
              {" · "}
              {decision.market.changePercent}% price change since{" "}
              {date(decision.market.firstSession)}
            </>
          )}
        </Typography>
      )}
      <Box
        sx={{
          display: "grid",
          gap: 1.5,
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            lg: "repeat(2, minmax(0, 1fr))",
          },
        }}
      >
        {decision.assessments.map((assessment) => {
          const item = report.items[assessment.itemIndex];
          if (!item) return null;
          const review = decision.checks.find(
            (check) => check.itemIndex === assessment.itemIndex,
          );
          const signal = signals[assessment.signal];
          return (
            <ReportCard
              key={assessment.itemIndex}
              title={titleOf(item)}
              badge={
                <Chip
                  size="small"
                  label={signal.label}
                  color={signal.color}
                  variant="outlined"
                />
              }
            >
              <Typography variant="body2">{assessment.rationale}</Typography>
              {review?.verdict !== "SUPPORTED" && (
                <Typography variant="body2" color="text.secondary">
                  {review
                    ? `${verdicts[review.verdict].label} by the AI critic.`
                    : "Awaiting AI review."}
                </Typography>
              )}
              <LabeledDetail
                label="What to check next"
                text={assessment.watchFor}
              />
              <CitationLinks
                sources={report.sources.filter((source) =>
                  item.sourceIds.includes(source.id),
                )}
              />
            </ReportCard>
          );
        })}
      </Box>
      {missing.length > 0 && decision.issue?.stage !== "SEARCH" && (
        <Typography variant="body2" color="text.secondary">
          Still needs evidence for{" "}
          {missing.map(([, label]) => label.toLowerCase()).join(", ")}.
        </Typography>
      )}
    </Stack>
  );
}

function Analysis({ items, sources }: { items: Item[]; sources: Source[] }) {
  return items.length ? (
    <Stack spacing={1.5}>
      {items.map((item) => (
        <ReportCard key={item.title} title={item.title}>
          <Typography variant="body2" sx={{ whiteSpace: "pre-line" }}>
            {item.detail}
          </Typography>
          <CitationLinks
            sources={sources.filter((source) =>
              item.sourceIds.includes(source.id),
            )}
          />
        </ReportCard>
      ))}
    </Stack>
  ) : (
    <Alert severity="info">No sourced analysis sections were found.</Alert>
  );
}

function NewsBrief({ report }: { report: StockResearchReport }) {
  if (report.decision?.issue?.stage === "SEARCH") {
    return (
      <Alert severity="info">
        News will appear here after source search succeeds.
      </Alert>
    );
  }
  const articles = report.decision?.news;
  if (!articles) {
    return report.items.length ? (
      <Stack spacing={1.5}>
        {report.items.map((item) => (
          <ReportCard
            key={item.title}
            title={item.title}
            caption={item.publishedOn ? date(item.publishedOn) : undefined}
          >
            <Typography variant="body2">{item.detail}</Typography>
            <CitationLinks
              sources={report.sources.filter((source) =>
                item.sourceIds.includes(source.id),
              )}
            />
          </ReportCard>
        ))}
      </Stack>
    ) : (
      <Alert severity="info">
        No recent items with a publication date and a matching source were
        found.
      </Alert>
    );
  }
  return articles.length ? (
    <Stack spacing={1.5}>
      {articles.map((article) => (
        <NewsCard
          key={article.sourceId}
          article={article}
          source={report.sources.find(({ id }) => id === article.sourceId)}
        />
      ))}
    </Stack>
  ) : (
    <Alert severity="info">
      No dated news from the past 30 days could be matched to a source.
    </Alert>
  );
}

function NewsCard({
  article,
  source,
}: {
  article: StockResearchArticle;
  source?: Source;
}) {
  return (
    <ReportCard
      title={article.title}
      caption={[source && publisher(source), date(article.publishedOn)]
        .filter(Boolean)
        .join(" · ")}
    >
      <LabeledDetail label="What was reported" text={article.detail} />
      <LabeledDetail label="Why it may matter" text={article.impact} />
      {source && <OriginalLink source={source}>{source.title}</OriginalLink>}
    </ReportCard>
  );
}

function SourceLibrary({ report }: { report: StockResearchReport }) {
  const groups = new Map<string, Source[]>();
  for (const source of report.sources) {
    const host = publisher(source);
    const group = groups.get(host);
    if (group) group.push(source);
    else groups.set(host, [source]);
  }
  if (!groups.size)
    return (
      <Alert severity="info">No matched source links were returned.</Alert>
    );
  return (
    <Stack spacing={2}>
      {Array.from(groups, ([host, sources]) => (
        <Box key={host} component="section">
          <Typography
            component="h4"
            variant="subtitle1"
            sx={{ mb: 1, fontWeight: 700 }}
          >
            {host}
          </Typography>
          <Stack spacing={1}>
            {sources.map((source) => {
              const article = report.decision?.news.find(
                ({ sourceId }) => sourceId === source.id,
              );
              const cited = report.items.filter((item) =>
                item.sourceIds.includes(source.id),
              );
              return (
                <Paper
                  key={source.id}
                  variant="outlined"
                  sx={{ p: 2, overflowWrap: "anywhere" }}
                >
                  <Stack spacing={0.75}>
                    {article && (
                      <>
                        <Typography variant="caption" color="text.secondary">
                          {date(article.publishedOn)}
                        </Typography>
                        <Typography component="h5" variant="subtitle2">
                          {article.title}
                        </Typography>
                        <Typography variant="body2">
                          {article.detail}
                        </Typography>
                      </>
                    )}
                    <OriginalLink source={source}>{source.title}</OriginalLink>
                    {cited.length > 0 && (
                      <Typography variant="body2" color="text.secondary">
                        {report.preset === "NEWS"
                          ? cited.map((item) => item.detail).join(" ")
                          : `Cited in ${cited.map(titleOf).join(", ")}`}
                      </Typography>
                    )}
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}

function Critic({
  decision,
  report,
}: {
  decision: StockResearchDecision;
  report: StockResearchReport;
}) {
  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" color="text.secondary">
        A separate AI review tests the draft against the evidence collected for
        this run.
      </Typography>
      {decision.status !== "REVIEWED" && (
        <Alert severity="info">
          A complete critic review is unavailable for this run.
        </Alert>
      )}
      {decision.checks.map((check) => {
        const item = report.items[check.itemIndex];
        if (!item) return null;
        const verdict = verdicts[check.verdict];
        return (
          <ReportCard
            key={check.itemIndex}
            title={titleOf(item)}
            badge={
              <Chip
                size="small"
                label={verdict.label}
                color={verdict.color}
                variant="outlined"
              />
            }
          >
            <LabeledDetail label="Critic’s concern" text={check.concern} />
            <LabeledDetail label="How to verify" text={check.verify} />
            <CitationLinks
              sources={report.sources.filter((source) =>
                item.sourceIds.includes(source.id),
              )}
            />
          </ReportCard>
        );
      })}
    </Stack>
  );
}

function ReportCard({
  title,
  caption,
  badge,
  children,
}: {
  title: string;
  caption?: string;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Paper
      component="article"
      variant="outlined"
      sx={{ p: 2, overflowWrap: "anywhere" }}
    >
      <Stack spacing={1}>
        {caption && (
          <Typography variant="caption" color="text.secondary">
            {caption}
          </Typography>
        )}
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{ flexWrap: "wrap", alignItems: "center" }}
        >
          <Typography
            component="h4"
            variant="subtitle1"
            sx={{ fontWeight: 700 }}
          >
            {title}
          </Typography>
          {badge}
        </Stack>
        {children}
      </Stack>
    </Paper>
  );
}

function LabeledDetail({ label, text }: { label: string; text: string }) {
  return (
    <Box>
      <Typography component="div" variant="subtitle2">
        {label}
      </Typography>
      <Typography variant="body2">{text}</Typography>
    </Box>
  );
}

function OriginalLink({
  source,
  children,
}: {
  source: Source;
  children: ReactNode;
}) {
  return (
    <Link
      href={source.url}
      target="_blank"
      rel="noreferrer"
      variant="body2"
      sx={{ alignSelf: "start" }}
    >
      {children}
    </Link>
  );
}

function CitationLinks({ sources }: { sources: Source[] }) {
  return sources.length ? (
    <Stack direction="row" spacing={1.25} useFlexGap sx={{ flexWrap: "wrap" }}>
      {sources.map((source) => (
        <OriginalLink key={source.id} source={source}>
          {source.title}
        </OriginalLink>
      ))}
    </Stack>
  ) : (
    <Typography variant="caption" color="text.secondary">
      No citation was supplied for this section.
    </Typography>
  );
}
