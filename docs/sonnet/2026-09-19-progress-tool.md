# 2026-09-19 — Progress tool: mechanical follow-through

`tools/progress.html` reads `docs/PROGRESS.md` and `docs/task-dependencies.json` and shows every task
with its status and dependencies, filterable by name, status and dependency. Serve the project over
HTTP and open `/tools/progress.html`, like the other tools.

**Already decided, do not re-litigate:**
- The board is the only source of status. The tool parses it; nothing is copied.
- Dependencies live in `docs/task-dependencies.json`, keyed by the START of a task's name.
- Status is worked out, not stored: Done is Completed; In Progress is In progress; Backlog is Blocked
  if it waits on something outside the code (`waitingOn`) or on a dependency that is not Done,
  otherwise Not started. A row the board marks Blocked stays Blocked.
- Dependencies were authored from the architecture layers in `CLAUDE.md` and from what each row says
  it builds on. They are an editable first draft, not the developer's.

1. **Keep the dependency file in step with the board.** When a story row is added to
   `docs/PROGRESS.md`, add an entry for it in `docs/task-dependencies.json`. The tool shows a yellow
   warning at the top of the page for a board task with no entry, an entry that matches no task, and
   a prefix that matches two tasks. Done when the page shows no warning.

2. **Mention the tool in the working protocol.** Add one line to `CLAUDE.md`, under "Working
   protocol", saying the board can be browsed with `tools/progress.html` and that a new board row needs
   a dependency entry. Nothing else in that file changes.

3. **Optionally, a "waiting on" list.** If the user asks which tasks are waiting on the developer,
   the tool already shows a "Waiting on" chip per task from `waitingOn`; a filter for it would be one
   more pill in `drawControls`, matching `t.waitingOn`. Ask before adding it.
