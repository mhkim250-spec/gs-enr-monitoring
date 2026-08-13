# Claude Code handoff

- Read `README.md` before changing the project.
- Preserve the Vinext + Cloudflare Workers architecture and D1 cache behavior.
- Never commit `.env`, API keys, Cloudflare tokens, database IDs, or passwords.
- Keep failed-source fallback behavior: existing cached data must survive collection failures.
- Preserve the schedules: events daily at 09:00 KST and news every three hours.
- Run `npm run build` before proposing or publishing changes.
- Use a feature branch and pull request; do not push unreviewed changes directly to `main`.
