# Splity Agent Rules

- Do not hardcode user-facing English in React components, server actions, page metadata, toasts, aria labels, modal titles, table headers, badges, or button labels. Add keys to `apps/web/lib/i18n/messages/en.ts` and `apps/web/lib/i18n/messages/zh.ts`, then render through `T` or `t()`.
- Do not use `font-[var(--splity-display)]`. Use the `.splity-display` class from `apps/web/app/globals.css` with separate weight classes such as `font-bold` or `font-extrabold`.
- Before handing off UI work, run `rg -n 'font-\[var\(--splity-display\)\]' apps/web` and fix every result.
- For Group Detail work, keep actions in the current page with modal popups and toast feedback unless the user explicitly asks for a separate route.
- Never open a new port to check, always use 3000 to check.
