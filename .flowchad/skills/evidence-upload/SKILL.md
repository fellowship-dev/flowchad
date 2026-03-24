---
name: evidence-upload
description: Upload walk screenshots and GIFs to GitHub for embedding in issues and PRs. Supports orphan branch (default), S3, or Navvi backends.
user_invocable: false
---

# Evidence Upload

Upload visual evidence (screenshots, GIFs, videos) from flow walks to a hosting backend, returning markdown-embeddable URLs.

## When to Use

This skill is called automatically by:
- **flow-walk** — after a walk completes, upload screenshots and GIF
- **flow-report** — embed evidence URLs in the friction report
- Any command that creates GitHub issues from findings

## Configuration

Check `.flowchad/config.yml` for the evidence backend:

```yaml
evidence:
  backend: git        # git (default) | s3 | navvi
  branch: evidence    # orphan branch name (git backend)
  # s3_bucket: my-bucket          # S3 backend
  # s3_endpoint: https://...      # S3/R2 endpoint
  # s3_public_url: https://...    # public base URL for embeds
```

If no `evidence` config exists, default to `git` backend.

## Backend A: Git Orphan Branch (default)

Zero external deps. Uses only the GitHub Contents API.

### First-time setup

Check if the evidence branch exists. If not, create it:

```bash
./scripts/evidence-init.sh owner/repo evidence
```

The script creates an orphan branch via the API — no local git operations needed.

### Upload

For each file to upload:

```bash
# Detect repo from git remote
REPO=$(git remote get-url origin | sed -E 's|.*github\.com[:/]([^/]+/[^/.]+)(\.git)?$|\1|')

# Upload and get URL
URL=$(./scripts/evidence-upload.sh \
  ".flowchad/snapshots/2026-03-24-sign-up/step-01-navigate.png" \
  "$REPO" \
  "sign-up/2026-03-24/step-01-navigate.png")

echo "![Step 1]($URL)"
```

### URL format

```
https://raw.githubusercontent.com/OWNER/REPO/evidence/FLOW/DATE/FILENAME
```

### Limitations

- `raw.githubusercontent.com` URLs require authentication for **private repos** — images won't render for users without repo access
- Adds commits to the evidence branch (acceptable — it's an orphan branch, doesn't affect main history)
- GitHub may cache raw URLs for up to 5 minutes

## Backend B: S3/R2

For teams with existing cloud storage. Reuses the speckit visual evidence pipeline.

### Upload

```bash
# Upload to S3/R2
aws s3 cp "$FILE" "s3://${S3_BUCKET}/flowchad/${FLOW}/${DATE}/${FILENAME}" \
  --endpoint-url "$S3_ENDPOINT" \
  --content-type "image/png"

# Return public URL
echo "${S3_PUBLIC_URL}/flowchad/${FLOW}/${DATE}/${FILENAME}"
```

### Advantages over git backend

- Works for private repos (public URLs, no auth needed)
- No git history pollution
- Better for high-volume evidence (many walks/day)

## Backend C: Navvi Browser Upload

Last resort. Opens the GitHub PR/issue in a headed browser and drags the file into the comment box.

### When to use

- Need GitHub-hosted URLs (`user-attachments.githubusercontent.com`)
- Private repo where raw.githubusercontent.com URLs won't render
- No S3/R2 infrastructure available

### Requirements

- Navvi running with headed Chromium
- GitHub credentials accessible to the agent (own account or shared)

### Process

1. Open the PR/issue URL in Navvi
2. Click the comment text area
3. Drag the image file into the text area
4. Wait for upload to complete (GitHub shows the markdown URL)
5. Extract the generated URL from the textarea content
6. Cancel the comment (we only needed the URL)

This is intentionally undocumented in detail — it's fragile and should only be used when A and B aren't viable.

## Integration with Flow Walk

After a walk completes and snapshots are saved:

1. Read the evidence backend from `config.yml` (default: `git`)
2. Upload each step screenshot: `{flow}/{date}/step-{N}-{action}.png`
3. Upload the GIF (if generated): `{flow}/{date}/{flow}.gif`
4. Store the URLs in `results.json` under a new `evidence` key:

```json
{
  "evidence": {
    "backend": "git",
    "screenshots": {
      "step-01-navigate": "https://raw.githubusercontent.com/owner/repo/evidence/sign-up/2026-03-24/step-01-navigate.png",
      "step-02-fill": "https://raw.githubusercontent.com/owner/repo/evidence/sign-up/2026-03-24/step-02-fill.png"
    },
    "gif": "https://raw.githubusercontent.com/owner/repo/evidence/sign-up/2026-03-24/sign-up.gif",
    "video": null
  }
}
```

## Integration with Flow Report

When generating a report, if `evidence` URLs exist in `results.json`:

- Embed screenshots inline in each finding:
  ```markdown
  **Screenshot:** ![Step 3](https://raw.githubusercontent.com/...)
  ```
- Embed GIF in the summary section:
  ```markdown
  **Walk recording:** ![Flow GIF](https://raw.githubusercontent.com/...)
  ```

## Integration with GitHub Issues

When creating issues from Critical findings:

1. Upload the relevant screenshot(s)
2. Upload the GIF
3. Embed in the issue body:

```markdown
## Evidence

![Step where failure occurs](https://raw.githubusercontent.com/...)

### Full walk recording

![Walk GIF](https://raw.githubusercontent.com/...)
```
