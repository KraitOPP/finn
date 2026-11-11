import { useState } from "react";
import type {
  Notification,
  NotificationDelivery,
} from "../../contracts/generated/models.ts";
import { requestContract } from "../api/request.ts";
import { usePrivateCommand } from "../api/usePrivateCommand.ts";
import { useResource } from "../api/useResource.ts";
import { RouteHeading } from "../Navigation.tsx";
import { Briefs, SavedBrief } from "./Briefs.tsx";
import { IndicatorEvidence, IndicatorRules } from "./IndicatorRules.tsx";
import { LocalTime } from "./LocalTime.tsx";
import { CloseEvidence } from "./PriceEvaluations.tsx";
import { PriceRules } from "./PriceRules.tsx";
import { ReviewCalendar } from "./ReviewCalendar.tsx";

const path = "/api/v1/monitoring/notifications";
const kinds = {
  PRICE_RULE: "Price alert",
  REVIEW_REMINDER: "Review reminder",
  PORTFOLIO_BRIEF: "Portfolio brief",
  VOLUME_RULE: "Volume alert",
  ALLOCATION_RULE: "Allocation alert",
  COMPANY_EVENT: "Company event",
};
const statuses = {
  PENDING: "Pending",
  DELIVERED: "Delivered",
  SUPPRESSED: "Suppressed",
  PREVIEWED: "Saved to local email preview",
  FAILED: "Failed",
};
const channelLabel = (value: NotificationDelivery["channel"]) =>
  value === "IN_APP" ? "In-app" : "Local email preview";

export function Inbox() {
  return (
    <section className="workspace-section">
      <RouteHeading>Inbox</RouteHeading>
      <NotificationList />
      <DeliveryStatus />
      <ReviewCalendar />
      <Briefs />
      <PriceRules />
      <IndicatorRules />
    </section>
  );
}

function NotificationList() {
  const [pages, setPages] = useState<string[]>([]);
  const before = pages.at(-1);
  const data = useResource(
    "NotificationPage",
    before ? `${path}?before=${before}` : path,
  );
  const [open, setOpen] = useState<string | null>(null);
  return (
    <section className="detail-card">
      <div className="section-heading">
        <h2>Notifications</h2>
        <button
          type="button"
          onClick={() => {
            setPages([]);
            data.reload();
          }}
        >
          Refresh notifications
        </button>
      </div>
      {data.error ? (
        <p role="alert">{data.error}</p>
      ) : !data.value ? (
        <p role="status">Loading notifications…</p>
      ) : data.value.items.length === 0 ? (
        <p>No in-app notifications on this page.</p>
      ) : (
        <ul className="security-list">
          {data.value.items.map((item) => (
            <li key={item.activityId}>
              <div>
                <strong>{item.title}</strong>
                <p>
                  {kinds[item.kind]} · {item.readAt ? "Read" : "Unread"} ·{" "}
                  <LocalTime value={item.createdAt} />
                </p>
                <button
                  type="button"
                  aria-expanded={open === item.activityId}
                  onClick={() =>
                    setOpen(open === item.activityId ? null : item.activityId)
                  }
                >
                  Details for {item.title}
                </button>
                {open === item.activityId && (
                  <NotificationDetails item={item} onChange={data.reload} />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {(pages.length > 0 || data.value?.nextBefore) && (
        <div className="pagination">
          <button
            type="button"
            disabled={pages.length === 0}
            onClick={() => {
              setPages(pages.slice(0, -1));
              setOpen(null);
            }}
          >
            Newer notifications
          </button>
          <button
            type="button"
            disabled={!data.value?.nextBefore}
            onClick={() => {
              if (data.value?.nextBefore) {
                setPages([...pages, data.value.nextBefore]);
                setOpen(null);
              }
            }}
          >
            Older notifications
          </button>
        </div>
      )}
    </section>
  );
}

function NotificationDetails({
  item,
  onChange,
}: {
  item: Notification;
  onChange: () => void;
}) {
  const endpoint = `${path}/${item.activityId}`;
  const detail = useResource("NotificationDetail", endpoint);
  const command = usePrivateCommand();
  return (
    <div className="settings-card">
      <button
        type="button"
        disabled={command.busy}
        onClick={async () => {
          const result = await command.run((csrf) =>
            requestContract("Notification", `${endpoint}/read`, {
              method: "POST",
              csrf,
              body: { read: item.readAt === null },
            }),
          );
          if (result) onChange();
        }}
      >
        {item.readAt ? "Mark unread" : "Mark read"}
      </button>
      {command.error && <p role="alert">{command.error}</p>}
      {detail.error ? (
        <p role="alert">{detail.error}</p>
      ) : !detail.value ? (
        <p role="status">Loading details…</p>
      ) : (
        <>
          {detail.value.price && (
            <>
              <p>
                Triggered by the saved close for{" "}
                {detail.value.price.sessionDate} · Rule version{" "}
                {detail.value.price.revision}.
              </p>
              <CloseEvidence value={detail.value.price.observation} />
            </>
          )}
          {detail.value.briefId && <SavedBrief id={detail.value.briefId} />}
          {detail.value.indicator && (
            <IndicatorEvidence value={detail.value.indicator} />
          )}
          {detail.value.reminder && (
            <p>
              Scheduled for <LocalTime value={detail.value.reminder.dueAt} /> ·
              Eligible from{" "}
              <LocalTime value={detail.value.reminder.deliverAt} />.
            </p>
          )}
          <ul>
            {detail.value.deliveries.map((delivery) => (
              <li key={delivery.channel}>
                {channelLabel(delivery.channel)} · {statuses[delivery.status]} ·{" "}
                {delivery.attempts} attempts
              </li>
            ))}
          </ul>
          {detail.value.attempts.length > 0 && (
            <details>
              <summary>Delivery attempts</summary>
              <ul>
                {detail.value.attempts.map((attempt) => (
                  <li key={`${attempt.channel}-${attempt.attempt}`}>
                    {channelLabel(attempt.channel)} · Attempt {attempt.attempt}{" "}
                    ·{" "}
                    {attempt.outcome === "RETRY"
                      ? "Retry scheduled"
                      : statuses[attempt.outcome]}{" "}
                    · <LocalTime value={attempt.attemptedAt} />
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </div>
  );
}

function DeliveryStatus() {
  const [open, setOpen] = useState(false);
  const status = useResource(
    "NotificationDeliveryPage",
    open ? "/api/v1/monitoring/deliveries" : null,
  );
  return (
    <details
      className="detail-card"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>Delivery status</summary>
      {open && (
        <>
          <button type="button" onClick={status.reload}>
            Refresh delivery status
          </button>
          {status.error ? (
            <p role="alert">{status.error}</p>
          ) : !status.value ? (
            <p role="status">Loading delivery status…</p>
          ) : (
            <>
              <p>
                {status.value.emailPreviewEnabled
                  ? "Email preview is available locally."
                  : "Email delivery requires a configured provider."}
              </p>
              <ul>
                {status.value.items.map((item) => (
                  <li key={`${item.activityId}-${item.delivery.channel}`}>
                    {item.title} · {channelLabel(item.delivery.channel)} ·{" "}
                    {statuses[item.delivery.status]} · {item.delivery.attempts}{" "}
                    attempts
                    {item.delivery.status === "PENDING" &&
                      item.delivery.attempts > 0 && (
                        <>
                          {" "}
                          · Retry after{" "}
                          <LocalTime value={item.delivery.nextAttemptAt} />
                        </>
                      )}
                  </li>
                ))}
              </ul>
              {status.value.items.length === 0 && <p>No delivery records.</p>}
            </>
          )}
        </>
      )}
    </details>
  );
}
