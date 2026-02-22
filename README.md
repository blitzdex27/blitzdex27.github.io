# blitzdex27.github.io

# iOS Developer Portfolio (Svelte)

Portfolio website plus an admin frontend called **Portfolio Studio**.

## Run locally

1. Install Node.js 20+.
2. Install dependencies:

```bash
npm install
```

3. Start dev server:

```bash
npm run dev
```

4. Build production bundle:

```bash
npm run build
```

## Frontends

- Portfolio site: `http://localhost:5173/`
- Admin frontend (Portfolio Studio): `http://localhost:5173/admin.html`

## Deploy To GitHub Pages

This project includes a workflow at `.github/workflows/deploy-pages.yml` that deploys on every push to `main`.

1. Push this project to a GitHub repository.
2. In GitHub, open `Settings` -> `Pages`.
3. Under `Build and deployment`, set `Source` to `GitHub Actions`.
4. Push to `main` (or run the workflow manually from the `Actions` tab).
5. After deployment completes, open your Pages URL:
   - Project site: `https://<username>.github.io/<repo-name>/`
   - User/org site (`<username>.github.io` repo): `https://<username>.github.io/`

## Admin password

- Portfolio Studio is password-protected using `public/data/admin-auth.json`.
- You can rotate the password inside Portfolio Studio in the **Admin Access** section.
- After changing password, click **Save all changes** to write `admin-auth.json`.

## Content workflow

1. Open Portfolio Studio (`/admin.html`).
2. Edit content fields.
3. Click **Connect data folder** and select your `public/data` directory.
4. Click **Save all changes**.
5. Refresh the portfolio site to see updates.

If your browser does not allow direct file writes, use **Download changed (fallback)**.
For cloud hosting, browser save writes to your local selected folder only; uploading/deploying those files is still required.

## Theme toggle

- Portfolio visitors can switch between `Black Orange` and `Classic Light`.
- In Portfolio Studio -> `Site Content`, set `Default Theme` to control first-load theme.
- User toggle choice is saved in browser local storage.

## Project previews and links

- Each project supports image/GIF preview uploads.
- Hero/header also supports a profile image/GIF upload (`headerImageSrc`).
- Each project supports:
  - `App URL` (live app/demo link)
  - `Repo URL` (GitHub or source link)
- Preview uploads are stored as data URLs in `projects.json`.

The portfolio site reads from:

- `public/data/site.json`
- `public/data/projects.json`
- `public/data/skills.json`
- `public/data/experience.json`
- `public/data/admin-auth.json` (admin login only)

## Customize UI

Edit these files:

- `src/App.svelte` for portfolio layout/rendering.
- `src/app.css` for portfolio styling.
- `src/admin/App.svelte` for admin editor logic.
- `src/admin/admin.css` for admin styling.
