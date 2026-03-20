import { Sidebar } from "@/components/sidebar";
import { calendarItems, financeQueue, household, summaryCards, tasks } from "@/lib/mock-data";

export default function Home() {
  return (
    <main className="shell">
      <Sidebar />

      <section className="content">
        <header className="hero" id="dashboard">
          <div>
            <p className="eyebrow">Phase 1 starter</p>
            <h2>Your private family operations hub</h2>
            <p className="heroText">
              This starter app gives you a clean dashboard with the exact modules we planned: tasks,
              finance, calendar, family visibility, and room for future circles.
            </p>
          </div>
          <div className="heroActions">
            <a className="button primary" href="#tasks">
              Review tasks
            </a>
            <a className="button" href="#finance">
              Review finance queue
            </a>
          </div>
        </header>

        <section className="grid cards">
          {summaryCards.map((card) => (
            <article key={card.title} className="panel statCard">
              <p className="panelTitle">{card.title}</p>
              <h3>{card.value}</h3>
              <p className="muted">{card.note}</p>
            </article>
          ))}
        </section>

        <section className="grid twoCols">
          <article className="panel" id="tasks">
            <div className="sectionHeader">
              <div>
                <p className="eyebrow">Tasks</p>
                <h3>Personal, household, and future circle planning</h3>
              </div>
              <span className="pill">Recurring ready</span>
            </div>
            <div className="list">
              {tasks.map((task) => (
                <div key={task.title} className="listRow">
                  <div>
                    <strong>{task.title}</strong>
                    <p className="muted">
                      {task.category} · {task.assignees}
                    </p>
                  </div>
                  <div className="rowMeta">
                    <span className="pill">{task.visibility}</span>
                    <span>{task.due}</span>
                    <span>{task.subtasks} subtasks</span>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="panel" id="finance">
            <div className="sectionHeader">
              <div>
                <p className="eyebrow">Finance</p>
                <h3>Email-driven finance queue</h3>
              </div>
              <span className="pill warning">No files stored in V1</span>
            </div>
            <div className="list">
              {financeQueue.map((item) => (
                <div key={item.issuer + item.type} className="listRow">
                  <div>
                    <strong>{item.issuer}</strong>
                    <p className="muted">{item.type}</p>
                  </div>
                  <div className="rowMeta">
                    <span>{item.amount}</span>
                    <span>{item.due}</span>
                    <span className="pill">{item.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="grid twoCols">
          <article className="panel" id="calendar">
            <div className="sectionHeader">
              <div>
                <p className="eyebrow">Calendar</p>
                <h3>Visibility-aware events</h3>
              </div>
              <span className="pill">Private / household / circle</span>
            </div>
            <div className="list">
              {calendarItems.map((item) => (
                <div key={item.title} className="listRow">
                  <div>
                    <strong>{item.title}</strong>
                    <p className="muted">{item.date}</p>
                  </div>
                  <div className="rowMeta">
                    <span className="pill">{item.visibility}</span>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="panel" id="family">
            <div className="sectionHeader">
              <div>
                <p className="eyebrow">Family</p>
                <h3>Household and future circles</h3>
              </div>
              <span className="pill">Location-ready</span>
            </div>
            <div className="list">
              {household.members.map((member) => (
                <div key={member.name} className="listRow">
                  <div>
                    <strong>{member.name}</strong>
                    <p className="muted">{member.role}</p>
                  </div>
                  <div className="rowMeta">
                    <span>{member.location}</span>
                    <span>{member.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="panel" id="settings">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">Next build steps</p>
              <h3>What we plug in after the first deploy</h3>
            </div>
          </div>
          <ol className="steps">
            <li>Deploy this starter to GitHub and Vercel.</li>
            <li>Add Supabase for login, family accounts, and database tables.</li>
            <li>Replace mock tasks with real database records.</li>
            <li>Connect Gmail first, then Outlook, then IMAP.</li>
            <li>Add the finance unlock flow for password-protected PDFs.</li>
          </ol>
        </section>
      </section>
    </main>
  );
}
