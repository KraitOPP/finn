import { useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const stages = [
  {
    label: "Holdings",
    title: "Review the opening holdings",
    description:
      "The fictional Groww workbook contains two positions dated 9 November 2020. The reviewer accepted the units and kept recorded costs unknown.",
    rows: [
      ["Fictional Alpha Equity", "3 units"],
      ["Fictional Beta Equity", "2 units"],
    ],
    detailTitle: "Import receipt",
    detail:
      "Two opening rows were accepted at ledger revision 2. The summary and detail cost discrepancy was acknowledged. The original workbook remains available in the isolated replay.",
  },
  {
    label: "Commitment",
    title: "Save the original thesis",
    description:
      "The investor links Cedar Tools’ May outlook to a measurable quarterly condition and keeps the original rationale.",
    rows: [
      ["Management guidance", "₹120–130 crore"],
      ["Thesis condition", "Revenue at least ₹120 crore"],
    ],
    detailTitle: "Cited management statement",
    detail:
      "Fictional Cedar Tools outlook · 10 May 2025 · version 1 · page 1, line 1. Management expects consolidated revenue of 120 to 130 crore.",
  },
  {
    label: "Results",
    title: "Compare guidance with delivery",
    description:
      "The July filing supplies consolidated INR revenue for the same June quarter. The condition and the guidance comparison use the reviewed figure.",
    rows: [
      ["Reported revenue", "₹110 crore"],
      ["Guidance outcome", "Missed"],
      ["Thesis condition", "Violated"],
    ],
    detailTitle: "Cited quarterly result",
    detail:
      "Fictional Cedar Tools results · 22 July 2025 · version 1 · page 1, line 1. Reported consolidated quarterly revenue of 110 crore.",
  },
  {
    label: "Decision",
    title: "Record the review decision",
    description:
      "The quarterly results event becomes a review task attached to thesis version 1. Replaying the same request yields the same task.",
    rows: [
      ["Inbox alert", "1 delivered"],
      ["Decision", "Revise"],
      ["Review note", "Revisit the fictional demand assumption"],
    ],
    detailTitle: "Retained evidence",
    detail:
      "The task keeps the original thesis, the dated guidance and result, the checked condition, and the cited decision note.",
  },
] as const;

function Walkthrough() {
  const [step, setStep] = useState(0);
  const stage = stages[step];
  return (
    <main className="walkthrough">
      <header className="masthead">
        <span className="wordmark">
          finn<span>.</span>
        </span>
        <p>Fictional portfolio walkthrough</p>
      </header>
      <section className="intro" aria-labelledby="title">
        <h1 id="title">From a holdings statement to a thesis decision</h1>
        <p>
          Follow a fictional company from a reviewed import through a missed
          commitment and an evidence-linked decision.
        </p>
      </section>
      <nav aria-label="Walkthrough stages">
        {stages.map((item, index) => (
          <button
            key={item.label}
            type="button"
            aria-current={index === step ? "step" : undefined}
            onClick={() => setStep(index)}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <article
        className="step"
        aria-labelledby="stage-title"
        aria-live="polite"
      >
        <div>
          <h2 id="stage-title">{stage.title}</h2>
          <p>{stage.description}</p>
          <details key={stage.label}>
            <summary>{stage.detailTitle}</summary>
            <p>{stage.detail}</p>
          </details>
        </div>
        <dl>
          {stage.rows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </article>
      <div className="controls">
        <button
          type="button"
          disabled={step === 0}
          onClick={() => setStep(step - 1)}
        >
          Previous
        </button>
        {step < stages.length - 1 ? (
          <button
            type="button"
            className="primary"
            onClick={() => setStep(step + 1)}
          >
            Next stage
          </button>
        ) : (
          <button type="button" className="primary" onClick={() => setStep(0)}>
            Restart walkthrough
          </button>
        )}
      </div>
    </main>
  );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<Walkthrough />);
