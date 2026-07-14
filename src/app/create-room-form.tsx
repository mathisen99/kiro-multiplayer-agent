"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { getBrowserClientId } from "@/lib/browser-client-id";
import { SafeErrorResponseSchema } from "@/lib/contracts";

const nicknameKey = (roomId: string) => `launch-room:nickname:${roomId}`;

export function CreateRoomForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const nickname = String(form.get("nickname") ?? "");

    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: getBrowserClientId(),
          name: form.get("name"),
          goal: form.get("goal"),
          roughIdea: form.get("roughIdea"),
          nickname,
        }),
      });
      const body: unknown = await response.json();

      if (!response.ok) {
        const parsed = SafeErrorResponseSchema.safeParse(body);
        throw new Error(
          parsed.success ? parsed.data.error.message : "Workspace could not be created.",
        );
      }

      const roomId = (body as { roomId?: unknown }).roomId;
      if (typeof roomId !== "string") {
        throw new Error("Workspace could not be created.");
      }

      localStorage.setItem(nicknameKey(roomId), nickname.trim());
      router.push(`/room/${roomId}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Workspace could not be created.");
      setBusy(false);
    }
  }

  return (
    <form className="create-form" onSubmit={submit}>
      <label>
        <span>Room name</span>
        <input name="name" maxLength={100} required placeholder="Weekend Launch" />
      </label>
      <label>
        <span>Goal <small>Optional</small></span>
        <textarea name="goal" maxLength={500} rows={2} placeholder="What should this room accomplish?" />
      </label>
      <label>
        <span>Rough idea</span>
        <textarea name="roughIdea" maxLength={900} rows={4} required placeholder="Describe the starting point for the team." />
      </label>
      <label>
        <span>Creator nickname</span>
        <input name="nickname" maxLength={50} required placeholder="Alex" />
      </label>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <button className="primary-button" disabled={busy} type="submit">
        {busy ? "Creating workspace…" : "Create workspace"}
      </button>
      <p className="form-note">No account required for this demo</p>
    </form>
  );
}
