import type { CompanyEvent } from "../../contracts/generated/models.ts";
import { useResource } from "../api/useResource.ts";
import { AnnouncedDates } from "./AnnouncedDates.tsx";
import { EventLabels } from "./Events.tsx";
import { SourceEvidence, versionPath } from "./SourceEvidence.tsx";

export function CompanyNotificationEvidence({
  event,
}: {
  event: CompanyEvent;
}) {
  const data = useResource(
    "CompanySourceDetail",
    versionPath(event.documentId, event.documentRevision),
  );
  return (
    <div>
      <EventLabels event={event} />
      <p>
        Event version {event.revision} · Source version {event.documentRevision}
      </p>
      <AnnouncedDates dates={event.dates} />
      {data.error ? (
        <p role="alert">{data.error}</p>
      ) : data.value ? (
        <SourceEvidence detail={data.value} />
      ) : (
        <p role="status">Loading the cited source…</p>
      )}
    </div>
  );
}
