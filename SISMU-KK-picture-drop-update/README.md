# KK Asset Board

This is a simple orange one-page asset inventory for the KK Music Festival archive.

Collaborators can:

- Drag existing asset cards between folder lanes.
- Add files without logging in.
- Preview image assets in the picture rail and on image cards.
- Create, rename, and remove folders.
- Edit asset names, owners, statuses, tags, and notes.
- Open tracked files from the archive.
- Delete tracked assets when needed.
- Publish inventory changes to GitHub.

## Files

- `index.html` is the one-page board interface.
- `styles.css` controls the playful orange visual design.
- `script.js` handles card drag-and-drop, no-login local drafts, editing, folder management, and GitHub publishing.
- `data/files.js` stores tracked asset records.
- `data/inventory.js` stores repository settings, folders, and statuses.
- `files/` stores the archive assets.

## No-Login Drafts

Renames, folder changes, and added files are saved in the browser first. This lets collaborators organize the board without a GitHub token.

Those drafts are local to the browser until someone with repository access clicks `Publish`.

## GitHub Publishing

Collaborators need repository access and a fine-grained GitHub token with repository Contents read/write permission.

Inside the site:

1. Click `Login`.
2. Enter owner `Bdkit50N`, repository `SISMU-KK`, branch `main`, and the token.
3. Add files, drag asset cards into folders, or edit their details.
4. Click `Publish`.

The app commits inventory changes through GitHub's REST repository contents API.
