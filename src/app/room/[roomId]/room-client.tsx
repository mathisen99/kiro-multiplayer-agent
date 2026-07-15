"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import {
  Component,
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  FinalArtifactSchema,
  RoomSnapshotSchema,
  SafeErrorResponseSchema,
  agentDefinitions,
  sortRoomCards,
  type AgentRole,
  type CardSection,
  type FinalArtifact,
  type RoomCard,
  type RoomSnapshot,
} from "@/lib/contracts";
import { copyText } from "@/lib/browser-clipboard";
import { getBrowserClientId } from "@/lib/browser-client-id";

const sections: ReadonlyArray<{ id: CardSection; label: string; hint: string }> = [
  { id: "problem", label: "Problem", hint: "What needs to change?" },
  { id: "requirements", label: "Requirements", hint: "What must be true?" },
  { id: "risks", label: "Risks", hint: "What could block us?" },
  { id: "tasks", label: "Tasks", hint: "What do we do next?" },
];
const agentRoles = Object.keys(agentDefinitions) as AgentRole[];

type CardDraft = { section: CardSection; title: string; content: string };
type CardFieldErrors = Partial<Record<keyof CardDraft, string>>;

function nicknameKey(roomId: string) {
  return `launch-room:nickname:${roomId}`;
}

async function responseMessage(response: Response, fallback: string) {
  try {
    const parsed = SafeErrorResponseSchema.safeParse(await response.json());
    return parsed.success ? parsed.data.error.message : fallback;
  } catch {
    return fallback;
  }
}

function validateCard(draft: CardDraft): CardFieldErrors {
  const errors: CardFieldErrors = {};
  const titleLength = draft.title.trim().length;
  const contentLength = draft.content.trim().length;
  if (titleLength === 0) errors.title = "Add a title.";
  else if (titleLength > 100) errors.title = "Keep the title to 100 characters.";
  if (contentLength === 0) errors.content = "Add card content.";
  else if (contentLength > 900) errors.content = "Keep the content to 900 characters.";
  return errors;
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function CardForm({
  initial,
  submitLabel,
  onCancel,
  onSave,
}: {
  initial: CardDraft;
  submitLabel: string;
  onCancel: () => void;
  onSave: (draft: CardDraft) => Promise<string | null>;
}) {
  const [draft, setDraft] = useState(initial);
  const [fieldErrors, setFieldErrors] = useState<CardFieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateCard(draft);
    setFieldErrors(errors);
    setError(null);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    const result = await onSave({
      section: draft.section,
      title: draft.title.trim(),
      content: draft.content.trim(),
    });
    setSaving(false);
    if (result) setError(result);
    else onCancel();
  }

  return (
    <form className="card-form" onSubmit={submit}>
      <label>
        <span>Section</span>
        <select
          value={draft.section}
          onChange={(event) => setDraft({ ...draft, section: event.target.value as CardSection })}
        >
          {sections.map((section) => <option key={section.id} value={section.id}>{section.label}</option>)}
        </select>
      </label>
      <label>
        <span>Title</span>
        <input
          value={draft.title}
          maxLength={100}
          onChange={(event) => setDraft({ ...draft, title: event.target.value })}
          aria-invalid={Boolean(fieldErrors.title)}
          autoFocus
        />
        {fieldErrors.title ? <small className="field-error">{fieldErrors.title}</small> : null}
      </label>
      <label>
        <span>Content</span>
        <textarea
          value={draft.content}
          maxLength={900}
          rows={4}
          onChange={(event) => setDraft({ ...draft, content: event.target.value })}
          aria-invalid={Boolean(fieldErrors.content)}
        />
        {fieldErrors.content ? <small className="field-error">{fieldErrors.content}</small> : null}
      </label>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="card-form-actions">
        <button className="text-button" type="button" onClick={onCancel}>Cancel</button>
        <button className="primary-button compact-button" disabled={saving} type="submit">
          {saving ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

function CardComposer({
  section,
  onSave,
}: {
  section: CardSection;
  onSave: (draft: CardDraft) => Promise<string | null>;
}) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return <button className="add-card-button" onClick={() => setOpen(true)}>+ Add card</button>;
  }
  return (
    <CardForm
      initial={{ section, title: "", content: "" }}
      submitLabel="Add card"
      onCancel={() => setOpen(false)}
      onSave={onSave}
    />
  );
}

function HumanCard({
  card,
  onSave,
}: {
  card: RoomCard;
  onSave: (draft: CardDraft) => Promise<string | null>;
}) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <article className="planning-card editing-card" id={`card-${card.id}`}>
        <CardForm
          initial={{ section: card.section, title: card.title, content: card.content }}
          submitLabel="Save changes"
          onCancel={() => setEditing(false)}
          onSave={onSave}
        />
      </article>
    );
  }
  return (
    <article className="planning-card" id={`card-${card.id}`}>
      <div className="card-meta"><span>{card.authorName}</span><span>{formatTimestamp(card.updatedAt)}</span></div>
      <h4>{card.title}</h4>
      <p>{card.content}</p>
      <button className="edit-card-button" onClick={() => setEditing(true)}>Edit</button>
    </article>
  );
}

function AgentCard({
  card,
  sourceCards,
  onReview,
}: {
  card: RoomCard;
  sourceCards: RoomCard[];
  onReview: (action: "approve" | "reject") => Promise<string | null>;
}) {
  const [reviewing, setReviewing] = useState<"approve" | "reject" | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  async function review(action: "approve" | "reject") {
    setReviewing(action);
    setReviewError(null);
    const error = await onReview(action);
    setReviewing(null);
    if (error) setReviewError(error);
  }

  return (
    <article
      className="planning-card agent-card"
      data-agent-proposal={card.status === "proposed" ? "true" : undefined}
      id={`card-${card.id}`}
    >
      <div className="proposal-heading">
        <div>
          <strong>{card.authorName}</strong>
          <span>{card.agentRole ? agentDefinitions[card.agentRole].shortRole : "AI teammate"}</span>
        </div>
        <span className={`proposal-badge${card.status === "approved" ? " approved-badge" : ""}`}>
          {card.status === "approved" ? "Approved" : "Proposed"}
        </span>
      </div>
      <h4>{card.title}</h4>
      <p>{card.content}</p>
      {card.rationale ? (
        <div className="proposal-rationale"><strong>Rationale</strong><p>{card.rationale}</p></div>
      ) : null}
      {sourceCards.length > 0 ? (
        <div className="proposal-sources">
          <strong>Sources</strong>
          <div>{sourceCards.map((source) => (
            <a href={`#card-${source.id}`} key={source.id}>{source.title}</a>
          ))}</div>
        </div>
      ) : null}
      {card.status === "proposed" ? (
        <div className="proposal-review">
          {reviewError ? <p role="alert">{reviewError}</p> : null}
          <div>
            <button className="text-button reject-button" disabled={reviewing !== null} onClick={() => void review("reject")}>
              {reviewing === "reject" ? "Rejecting…" : "Reject"}
            </button>
            <button className="primary-button compact-button" disabled={reviewing !== null} onClick={() => void review("approve")}>
              {reviewing === "approve" ? "Approving…" : "Approve"}
            </button>
          </div>
        </div>
      ) : null}
      <span className="proposal-time">{formatTimestamp(card.updatedAt)}</span>
    </article>
  );
}

class MarkdownPreviewBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <p className="preview-error" role="alert">
          Preview could not be rendered. Copy or download the stored Markdown instead.
        </p>
      );
    }
    return this.props.children;
  }
}

function safeTitleSlug(title: string): string {
  const slug = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
  return slug || "plan";
}

function FinalArtifactDialog({
  artifact,
  onClose,
}: {
  artifact: FinalArtifact;
  onClose: () => void;
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  async function copyMarkdown() {
    if (await copyText(artifact.markdown)) {
      setCopyState("copied");
    } else {
      setCopyState("failed");
    }
  }

  function downloadMarkdown() {
    const blob = new Blob([artifact.markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `launch-room-${safeTitleSlug(artifact.title)}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="artifact-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        aria-label="Final artifact"
        aria-modal="true"
        className="artifact-dialog"
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div><p className="panel-kicker">Stored Markdown</p><h2>{artifact.title}</h2></div>
          <button aria-label="Close final artifact" className="text-button" onClick={onClose}>Close</button>
        </header>
        <div className="artifact-actions">
          <button className="secondary-button" onClick={() => void copyMarkdown()}>
            {copyState === "copied" ? "Markdown copied" : "Copy Markdown"}
          </button>
          <button className="primary-button" onClick={downloadMarkdown}>Download .md</button>
        </div>
        {copyState === "failed" ? <p className="artifact-action-error" role="alert">Markdown could not be copied. Download remains available.</p> : null}
        <div className="markdown-preview">
          <MarkdownPreviewBoundary key={artifact.markdown}>
            <ReactMarkdown>{artifact.markdown}</ReactMarkdown>
          </MarkdownPreviewBoundary>
        </div>
      </section>
    </div>
  );
}

type ConnectionState = "Live" | "Reconnecting";

function useRoomPolling(roomId: string) {
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>("Live");
  const refreshRef = useRef<() => void>(() => undefined);

  const refresh = useCallback(() => refreshRef.current(), []);

  useEffect(() => {
    let disposed = false;
    let timer: number | null = null;
    let controller: AbortController | null = null;
    let inFlight = false;
    let refreshQueued = false;
    let failureCount = 0;

    function clearTimer() {
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
    }

    function schedule(delay: number) {
      clearTimer();
      if (!disposed && document.visibilityState === "visible") {
        timer = window.setTimeout(run, delay);
      }
    }

    async function run() {
      if (disposed || document.visibilityState !== "visible") return;
      if (inFlight) {
        refreshQueued = true;
        return;
      }

      clearTimer();
      inFlight = true;
      controller = new AbortController();
      let succeeded = false;
      let roomMissing = false;

      try {
        const response = await fetch(`/api/rooms/${encodeURIComponent(roomId)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (response.status === 404) {
          roomMissing = true;
          setMissing(true);
          setSnapshot(null);
          return;
        }
        if (!response.ok) {
          throw new Error(await responseMessage(response, "Workspace could not be loaded."));
        }

        const parsed = RoomSnapshotSchema.safeParse(await response.json());
        if (!parsed.success) throw new Error("Workspace returned an invalid response.");

        setSnapshot({ ...parsed.data, cards: sortRoomCards(parsed.data.cards) });
        setMissing(false);
        setSyncError(null);
        setConnectionState("Live");
        failureCount = 0;
        succeeded = true;
      } catch (caught) {
        if (disposed || (caught instanceof DOMException && caught.name === "AbortError")) return;
        failureCount += 1;
        setSyncError(caught instanceof Error ? caught.message : "Workspace could not be loaded.");
        setConnectionState("Reconnecting");
      } finally {
        inFlight = false;
        controller = null;
        if (!disposed) setLoading(false);
        if (disposed || roomMissing) return;

        if (refreshQueued) {
          refreshQueued = false;
          if (document.visibilityState === "visible") schedule(0);
        } else if (succeeded) {
          schedule(1_250);
        } else {
          schedule(Math.min(1_250 * 2 ** Math.max(0, failureCount - 1), 5_000));
        }
      }
    }

    refreshRef.current = () => {
      clearTimer();
      if (document.visibilityState !== "visible") {
        refreshQueued = true;
      } else if (inFlight) {
        refreshQueued = true;
      } else {
        refreshQueued = false;
        schedule(0);
      }
    };

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        refreshRef.current();
      } else {
        clearTimer();
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    schedule(0);

    return () => {
      disposed = true;
      clearTimer();
      controller?.abort();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      refreshRef.current = () => undefined;
    };
  }, [roomId]);

  return { snapshot, loading, missing, syncError, connectionState, refresh };
}

export function RoomClient({ roomId }: { roomId: string }) {
  const { snapshot, loading, missing, syncError, connectionState, refresh } = useRoomPolling(roomId);
  const [joined, setJoined] = useState<boolean | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedAgentRole, setSelectedAgentRole] = useState<AgentRole>("product");
  const [invitingAgent, setInvitingAgent] = useState<AgentRole | null>(null);
  const [runningAgent, setRunningAgent] = useState<AgentRole | null>(null);
  const [agentInstruction, setAgentInstruction] = useState("");
  const [agentError, setAgentError] = useState<string | null>(null);
  const [agentNotice, setAgentNotice] = useState<string | null>(null);
  const agentCardsBeforeRunRef = useRef<Set<string> | null>(null);
  const agentThreadRef = useRef<HTMLDivElement | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [finalizationError, setFinalizationError] = useState<string | null>(null);
  const [generatedArtifact, setGeneratedArtifact] = useState<FinalArtifact | null>(null);
  const [artifactOpen, setArtifactOpen] = useState(false);

  useEffect(() => {
    const bootstrap = window.setTimeout(() => {
      setJoined(Boolean(localStorage.getItem(nicknameKey(roomId))));
    }, 0);
    return () => window.clearTimeout(bootstrap);
  }, [roomId]);

  useEffect(() => {
    const previousAgentCardIds = agentCardsBeforeRunRef.current;
    if (!snapshot || !previousAgentCardIds) return;

    const firstProposal = snapshot.cards.find(
      (card) =>
        card.authorType === "agent" &&
        card.status === "proposed" &&
        !previousAgentCardIds.has(card.id),
    );
    if (!firstProposal) return;

    agentCardsBeforeRunRef.current = null;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(`card-${firstProposal.id}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [snapshot]);

  useEffect(() => {
    const thread = agentThreadRef.current;
    if (thread) thread.scrollTop = thread.scrollHeight;
  }, [selectedAgentRole, snapshot?.conversations.length]);

  async function join(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setJoining(true);
    setActionError(null);
    const form = new FormData(event.currentTarget);
    const nickname = String(form.get("nickname") ?? "");

    try {
      const response = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: getBrowserClientId(), nickname }),
      });
      if (!response.ok) {
        throw new Error(await responseMessage(response, "Workspace could not be joined."));
      }
      localStorage.setItem(nicknameKey(roomId), nickname.trim());
      setJoined(true);
      refresh();
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Workspace could not be joined.");
    } finally {
      setJoining(false);
    }
  }

  async function saveCard(draft: CardDraft, cardId?: string): Promise<string | null> {
    try {
      const base = `/api/rooms/${encodeURIComponent(roomId)}/cards`;
      const response = await fetch(cardId ? `${base}/${encodeURIComponent(cardId)}` : base, {
        method: cardId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: getBrowserClientId(), ...draft }),
      });
      if (!response.ok) {
        return await responseMessage(response, "Card could not be saved.");
      }
      refresh();
      return null;
    } catch {
      return "Card could not be saved. Your board has not been cleared; try again.";
    }
  }

  async function reviewProposal(cardId: string, action: "approve" | "reject"): Promise<string | null> {
    try {
      const response = await fetch(
        `/api/rooms/${encodeURIComponent(roomId)}/cards/${encodeURIComponent(cardId)}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId: getBrowserClientId(), action }),
        },
      );
      if (!response.ok) {
        return await responseMessage(response, "Proposal could not be reviewed.");
      }
      refresh();
      return null;
    } catch {
      return "Proposal could not be reviewed. The board is unchanged; try again.";
    }
  }

  async function inviteAgent(role: AgentRole) {
    setInvitingAgent(role);
    setAgentError(null);
    setAgentNotice(null);
    try {
      const response = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/agents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: getBrowserClientId(), role }),
      });
      if (!response.ok) {
        throw new Error(await responseMessage(response, "Teammate could not be invited."));
      }
      setAgentNotice(`${agentDefinitions[role].name} joined the workspace.`);
      refresh();
    } catch (caught) {
      setAgentError(caught instanceof Error ? caught.message : "Teammate could not be invited.");
    } finally {
      setInvitingAgent(null);
    }
  }

  async function runAgent(event: FormEvent<HTMLFormElement>, participantId: string, role: AgentRole) {
    event.preventDefault();
    const instruction = agentInstruction.trim();
    if (instruction.length < 1 || instruction.length > 600) {
      setAgentError("Teammate could not complete this run");
      return;
    }

    setRunningAgent(role);
    setAgentError(null);
    setAgentNotice(null);
    agentCardsBeforeRunRef.current = new Set(
      (snapshot?.cards ?? [])
        .filter((card) => card.authorType === "agent")
        .map((card) => card.id),
    );
    try {
      const response = await fetch(
        `/api/rooms/${encodeURIComponent(roomId)}/agents/${encodeURIComponent(participantId)}/run`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId: getBrowserClientId(), instruction }),
        },
      );
      if (!response.ok) throw new Error("agent-run-failed");
      const body = (await response.json()) as { proposalCount?: unknown };
      const proposalCount = typeof body.proposalCount === "number" ? body.proposalCount : 0;
      setAgentInstruction("");
      setAgentNotice(
        proposalCount > 0
          ? `${agentDefinitions[role].name} replied and added ${proposalCount} proposal${proposalCount === 1 ? "" : "s"} for review.`
          : `${agentDefinitions[role].name} replied without changing the board.`,
      );
      refresh();
    } catch {
      agentCardsBeforeRunRef.current = null;
      setAgentError("Teammate could not complete this run");
    } finally {
      setRunningAgent(null);
    }
  }

  async function finalizePlan() {
    setFinalizing(true);
    setFinalizationError(null);
    try {
      const response = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: getBrowserClientId() }),
      });
      if (!response.ok) {
        throw new Error(await responseMessage(response, "Final artifact could not be generated. Try again."));
      }

      const body = (await response.json()) as { artifact?: unknown };
      const parsed = FinalArtifactSchema.safeParse(body.artifact);
      if (!parsed.success) throw new Error("Final artifact returned an invalid response. Try again.");
      setGeneratedArtifact(parsed.data);
      setArtifactOpen(true);
      refresh();
    } catch (caught) {
      setFinalizationError(
        caught instanceof Error
          ? caught.message
          : "Final artifact could not be generated. Try again.",
      );
    } finally {
      setFinalizing(false);
    }
  }

  async function copyLink() {
    if (await copyText(window.location.href)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } else {
      setActionError("The invite link could not be copied. Copy it from the address bar.");
    }
  }

  if (loading && !snapshot) {
    return <main className="center-state"><div className="state-card"><span className="status-dot" /> Loading workspace…</div></main>;
  }

  if (missing) {
    return (
      <main className="center-state">
        <div className="state-card error-state">
          <p className="eyebrow">Workspace unavailable</p>
          <h1>Room not found</h1>
          <p>This workspace does not exist or the shared link is incomplete.</p>
          <Link className="primary-button inline-button" href="/">Back to Launch Room</Link>
        </div>
      </main>
    );
  }

  if (!snapshot) {
    return (
      <main className="center-state">
        <div className="state-card error-state">
          <p className="eyebrow">Could not load</p>
          <h1>Workspace unavailable</h1>
          <p role="alert">{syncError ?? "Workspace could not be loaded."}</p>
          <button className="primary-button" onClick={refresh}>Try again</button>
          <Link href="/">Back home</Link>
        </div>
      </main>
    );
  }

  if (joined === null) {
    return <main className="center-state"><div className="state-card"><span className="status-dot" /> Checking workspace access…</div></main>;
  }

  if (joined === false) {
    return (
      <main className="join-shell">
        <div className="join-context">
          <p className="eyebrow">You’ve been invited</p>
          <h1>{snapshot.room.name}</h1>
          <p>{snapshot.room.goal || "Join the room to start shaping the plan."}</p>
        </div>
        <form className="join-form" onSubmit={join}>
          <p className="panel-kicker">Join workspace</p>
          <h2>What should we call you?</h2>
          <label><span>Nickname</span><input name="nickname" maxLength={50} required autoFocus placeholder="Sam" /></label>
          {actionError ? <p className="form-error" role="alert">{actionError}</p> : null}
          <button className="primary-button" disabled={joining} type="submit">{joining ? "Joining…" : "Join room"}</button>
          <Link className="text-button centered-link" href="/">Create a different room</Link>
          <p className="form-note">No account or password required</p>
        </form>
      </main>
    );
  }

  const visibleError = actionError ?? syncError;
  const invitedAgents = snapshot.participants.filter(
    (participant) => participant.type === "agent" && participant.agentRole !== null,
  );
  const selectedAgent = invitedAgents.find(
    (participant) => participant.agentRole === selectedAgentRole,
  );
  const selectedAgentTurns = selectedAgent
    ? snapshot.conversations.filter((turn) => turn.participantId === selectedAgent.id)
    : [];
  const artifact = generatedArtifact ?? snapshot.finalArtifact;

  return (
    <main className="room-shell">
      <header className="room-header">
        <div>
          <p className="eyebrow">Launch Room</p>
          <h1>{snapshot.room.name}</h1>
          <p className="room-goal">{snapshot.room.goal || "No goal has been set yet."}</p>
        </div>
        <div className="header-actions">
          <span className="connection-pill"><span className="status-dot" /> {connectionState}</span>
          <button className="secondary-button" onClick={() => void copyLink()}>{copied ? "Link copied" : "Copy invite link"}</button>
          <Link className="secondary-button inline-button" href="/">+ New room</Link>
        </div>
      </header>

      {visibleError ? <div className="error-banner" role="alert"><span>{visibleError}</span><button onClick={refresh}>Retry</button></div> : null}

      <section className="workflow-guide" aria-label="Workspace workflow">
        <strong>Plan in four moves</strong>
        <ol>
          <li>Add or edit board cards</li>
          <li>Brainstorm with specialist agents</li>
          <li>Approve or reject its proposals</li>
          <li>Generate the reviewed Markdown plan</li>
        </ol>
      </section>

      <section className="agent-workspace" aria-label="AI specialist conversations">
        <div className="agent-workspace-heading">
          <div><p className="panel-kicker">AI specialists</p><h2>Brainstorm, then shape the board</h2></div>
          <p>Ask questions and develop ideas freely. Agents only add optional proposals when they find a concrete board contribution.</p>
        </div>
        <div className="agent-tabs" role="tablist" aria-label="Choose a specialist">
          {agentRoles.map((role) => {
            const definition = agentDefinitions[role];
            const invited = invitedAgents.some((participant) => participant.agentRole === role);
            return (
              <button
                aria-selected={selectedAgentRole === role}
                className={`agent-tab${selectedAgentRole === role ? " selected" : ""}`}
                key={role}
                onClick={() => {
                  setSelectedAgentRole(role);
                  setAgentInstruction("");
                  setAgentError(null);
                  setAgentNotice(null);
                }}
                role="tab"
              >
                <span>{definition.name}</span>
                <small>{invited ? "Invited" : definition.shortRole}</small>
              </button>
            );
          })}
        </div>
        <div className="agent-conversation-panel">
          <aside className="agent-profile">
            <span className="avatar agent-avatar">{agentDefinitions[selectedAgentRole].name.slice(0, 1)}</span>
            <div>
              <h3>{agentDefinitions[selectedAgentRole].name}</h3>
              <p>{agentDefinitions[selectedAgentRole].description}</p>
            </div>
          </aside>
          {selectedAgent ? (
            <div className="agent-chat">
              <div className="agent-thread" aria-live="polite" ref={agentThreadRef}>
                {selectedAgentTurns.length === 0 ? (
                  <div className="agent-thread-empty">
                    <strong>Start with a question or idea.</strong>
                    <p>The reply appears here. Ask follow-ups—the recent thread and current board are included as context.</p>
                  </div>
                ) : selectedAgentTurns.map((turn) => (
                  <div className="conversation-turn" key={turn.id}>
                    <div className="chat-message human-message"><strong>You</strong><p>{turn.instruction}</p></div>
                    <div className="chat-message agent-message">
                      <div className="chat-message-header"><strong>{turn.agentName}</strong><span>{formatTimestamp(turn.createdAt)}</span></div>
                      <div className="chat-response"><ReactMarkdown>{turn.response}</ReactMarkdown></div>
                      {turn.proposalCount > 0 ? <small>{turn.proposalCount} board proposal{turn.proposalCount === 1 ? "" : "s"} added for review</small> : null}
                    </div>
                  </div>
                ))}
              </div>
              <form className="agent-run-form" onSubmit={(event) => void runAgent(event, selectedAgent.id, selectedAgentRole)}>
                <label>
                  <span>Message {agentDefinitions[selectedAgentRole].name}</span>
                  <textarea
                    value={agentInstruction}
                    maxLength={600}
                    rows={3}
                    required
                    disabled={runningAgent !== null}
                    placeholder="What are we overlooking? Help me explore a few options before we commit."
                    onChange={(event) => setAgentInstruction(event.target.value)}
                  />
                </label>
                <div className="agent-run-actions">
                  <span>{agentInstruction.length}/600</span>
                  <button className="primary-button compact-button" disabled={runningAgent !== null || agentInstruction.trim().length === 0} type="submit">
                    {runningAgent === selectedAgentRole ? "Thinking…" : "Send message"}
                  </button>
                </div>
                {agentError ? <p className="agent-error" role="alert">{agentError}</p> : null}
                {agentNotice ? <p className="agent-notice" role="status">{agentNotice}</p> : null}
              </form>
            </div>
          ) : (
            <div className="agent-invite-state">
              <div><strong>Invite this specialist</strong><p>Inviting is instant. The agent only uses your API key after you send a message.</p></div>
              <button className="primary-button" disabled={invitingAgent !== null} onClick={() => void inviteAgent(selectedAgentRole)}>
                {invitingAgent === selectedAgentRole ? "Inviting…" : `Invite ${agentDefinitions[selectedAgentRole].name}`}
              </button>
              {agentError ? <p className="agent-error" role="alert">{agentError}</p> : null}
              {agentNotice ? <p className="agent-notice" role="status">{agentNotice}</p> : null}
            </div>
          )}
        </div>
      </section>

      <div className="workspace-tools">
        <section className="tool-panel participants-panel">
          <div><p className="panel-kicker">In this room</p><h2>Participants</h2></div>
          <div className="participant-list">
            {snapshot.participants.map((participant) => (
              <span className="participant-chip" key={participant.id}>
                <span className={participant.type === "agent" ? "avatar agent-avatar" : "avatar"}>{participant.displayName.slice(0, 1).toUpperCase()}</span>
                {participant.displayName}
              </span>
            ))}
          </div>
        </section>
        <section className="tool-panel artifact-panel">
          <div>
            <p className="panel-kicker">Deliverable</p>
            <h2>Final artifact</h2>
            <p>{artifact ? artifact.title : "Generate a reviewed Markdown plan when the board is ready."}</p>
            {finalizationError ? <p className="artifact-error" role="alert">{finalizationError}</p> : null}
          </div>
          <div className="artifact-panel-actions">
            {artifact ? <button className="text-button" onClick={() => setArtifactOpen(true)}>Preview</button> : null}
            <button className="secondary-button" disabled={finalizing} onClick={() => void finalizePlan()}>
              {finalizing ? "Generating…" : finalizationError ? "Retry generation" : artifact ? "Regenerate plan" : "Generate plan"}
            </button>
          </div>
        </section>
      </div>

      <section className="board-region" aria-label="Planning board">
        <div className="board-heading"><div><p className="panel-kicker">Shared plan</p><h2>Planning board</h2></div><span>{snapshot.cards.length} {snapshot.cards.length === 1 ? "card" : "cards"}</span></div>
        <div className="board-grid">
          {sections.map((section) => {
            const cards = snapshot.cards.filter((card) => card.section === section.id);
            return (
              <section className="board-column" key={section.id}>
                <header><div><h3>{section.label}</h3><p>{section.hint}</p></div><span>{cards.length}</span></header>
                <div className="card-stack">
                  <CardComposer section={section.id} onSave={(draft) => saveCard(draft)} />
                  {cards.length === 0 ? <div className="empty-card">No cards yet</div> : cards.map((card) => (
                    card.authorType === "human" ? (
                      <HumanCard card={card} key={card.id} onSave={(draft) => saveCard(draft, card.id)} />
                    ) : (
                      <AgentCard
                        card={card}
                        key={card.id}
                        onReview={(action) => reviewProposal(card.id, action)}
                        sourceCards={card.sourceCardIds
                          .map((sourceId) => snapshot.cards.find((candidate) => candidate.id === sourceId))
                          .filter((source): source is RoomCard => Boolean(source))}
                      />
                    )
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </section>

      {artifactOpen && artifact ? (
        <FinalArtifactDialog artifact={artifact} onClose={() => setArtifactOpen(false)} />
      ) : null}
    </main>
  );
}
