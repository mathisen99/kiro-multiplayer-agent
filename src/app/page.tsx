import { CreateRoomForm } from "./create-room-form";

export default function Home() {
  return (
    <main className="home-shell">
      <section className="home-intro">
        <p className="eyebrow">Collaborative product planning</p>
        <h1>Launch Room</h1>
        <p className="home-lede">Turn a rough product idea into a focused, shared implementation plan with people and one invited AI teammate.</p>
        <div className="principle-card">
          <span>Human-led by design</span>
          <p>AI proposes inside the board. Your team reviews every contribution.</p>
        </div>
      </section>
      <section className="form-panel">
        <div className="form-heading"><p className="panel-kicker">New workspace</p><h2>Start with the idea.</h2><p>Give your team enough context to make the first useful decision.</p></div>
        <CreateRoomForm />
      </section>
    </main>
  );
}
