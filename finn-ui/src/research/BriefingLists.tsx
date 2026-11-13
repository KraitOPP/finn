import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type {
  RadarEntry,
  TodayBriefing,
} from "../../contracts/generated/models.ts";
import { LocalTime } from "../monitoring/LocalTime.tsx";
import { eventTypes } from "./Events.tsx";
import { companyResearch, sessionDate } from "./Radar.tsx";

export function BriefRows({
  label,
  items,
}: {
  label?: string;
  items: RadarEntry[];
}) {
  if (!items.length) return null;
  return (
    <Box sx={{ mb: 1 }}>
      {label && (
        <Typography component="h3" variant="subtitle2" sx={{ mb: 0.75 }}>
          {label}
        </Typography>
      )}
      <ul className="brief-rows">
        {items.map((item) => {
          const event = item.announcement?.event;
          return (
            <li key={event?.eventId ?? item.stock.companyId}>
              <Stack
                direction="row"
                useFlexGap
                spacing={1}
                sx={{ alignItems: "center", flexWrap: "wrap" }}
              >
                <Typography variant="caption" color="text.secondary">
                  {item.stock.symbol ?? item.stock.companyName}
                </Typography>
                {event?.novelty === "CORRECTION" && (
                  <Chip size="small" color="warning" label="Correction" />
                )}
              </Stack>
              <Typography variant="body2" sx={{ fontWeight: 650 }}>
                <Link
                  underline="hover"
                  href={companyResearch(item.stock, event?.eventId)}
                >
                  {event?.title ??
                    `Unusual trading in ${item.stock.companyName}`}
                </Link>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {event ? (
                  <>
                    {eventTypes[event.subtype]} · Reviewed{" "}
                    <LocalTime value={event.reviewedAt} />
                  </>
                ) : (
                  item.movement && (
                    <>{sessionDate(item.movement.session)} · Yahoo daily</>
                  )
                )}
              </Typography>
            </li>
          );
        })}
      </ul>
    </Box>
  );
}

export function ResearchQuestions({
  items,
}: {
  items: TodayBriefing["questions"];
}) {
  return items.length ? (
    <Stack component="ul" className="dashboard-list" spacing={1.25}>
      {items.map((question) => (
        <li key={question.noteId}>
          <Typography variant="caption" color="text.secondary">
            {question.companyName}
          </Typography>
          <Typography variant="body2">
            <Link
              href={`#/research?company=${question.companyId}&view=questions`}
            >
              {question.title}
            </Link>
          </Typography>
        </li>
      ))}
    </Stack>
  ) : (
    <Typography variant="body2" color="text.secondary">
      Save a question in a company’s Sources &amp; facts tab to see it here.
    </Typography>
  );
}
