---
name: evidence-upload
description: Upload walk screenshots, GIFs and videos to the public evidence S3 bucket for embedding in GitHub issues and PRs. Returns permanent public URLs and ready-to-paste Markdown.
user_invocable: false
metadata:
  version: 2.0.0
---

# Evidence Upload

Upload visual evidence (screenshots, GIFs, videos) from flow walks straight to a
public S3 bucket and return Markdown-embeddable URLs.

**Why a bucket:** GitHub does not render repo-relative or
`raw.githubusercontent.com` images in **private** repos for viewers without a
session on that repo, and branch-hosted links die with the branch. A public,
content-addressed bucket renders everywhere and never expires.

## Public by URL — read before uploading

Anything uploaded is **publicly readable by anyone with the URL**. Never upload
secrets, tokens, customer PII or production data. Prefer screenshots of staging
or synthetic data; crop or redact first. The uploader cannot delete objects.

## When to Use

Called by:
- **flow-walk** — after a walk completes, upload screenshots and GIF
- **flow-reproduce** — attach reproduction evidence to the issue
- **flow-report** — embed evidence URLs in the friction report
- Any command that creates GitHub issues or PR comments from findings

## Configuration (environment only)

The script reads these and nothing else — never the general `AWS_*` variables,
never command-line arguments. Never print them.

| Variable | Meaning |
|---|---|
| `EVIDENCE_AWS_ACCESS_KEY_ID` / `EVIDENCE_AWS_SECRET_ACCESS_KEY` | Upload-only key (`s3:PutObject` on the bucket) |
| `EVIDENCE_BUCKET` | e.g. `fellowship-evidence-503081149087` |
| `EVIDENCE_REGION` | e.g. `us-east-1` |
| `EVIDENCE_PUBLIC_BASE_URL` | e.g. `https://fellowship-evidence-503081149087.s3.us-east-1.amazonaws.com` |

If any is missing the script exits 2 with *"evidence upload secret is not
configured for this environment"*. Treat that as an upload failure (see below);
do not substitute other credentials or another host.

`.flowchad/config.yml` `evidence.backend` accepts `s3` (default) or `none`
(skip uploads). The retired `git`, `pylot` and `navvi` values are treated as `s3`.

## Upload

Locate the script inside this skill's directory (path depends on how the skill
was installed):

```bash
UPLOAD=$(ls .flowchad/skills/evidence-upload/scripts/upload_evidence.sh \
            .claude/skills/evidence-upload/scripts/upload_evidence.sh \
            .agents/skills/evidence-upload/scripts/upload_evidence.sh 2>/dev/null | head -1)

bash "$UPLOAD" --prefix "sign-up/2026-03-24" --alt "Step 1" \
  ".flowchad/snapshots/2026-03-24-sign-up/step-01-navigate.png"
# https://<bucket>.s3.<region>.amazonaws.com/owner/repo/sign-up/2026-03-24/3f9c0a1b2c3d4e5f-step-01-navigate.png
# ![Step 1](https://<bucket>.s3.<region>.amazonaws.com/owner/repo/sign-up/2026-03-24/3f9c0a1b2c3d4e5f-step-01-navigate.png)
```

Interface: `upload_evidence.sh [--repo owner/repo] [--prefix path] [--alt text] [--url-only] [--dry-run] FILE...`

- Files: `png jpg jpeg gif webp mp4 webm pdf txt`.
- `--repo` defaults to `git remote get-url origin`.
- Key: `<owner>/<repo>/<YYYY>/<MM>/<sha256-first-16>-<basename>`; `--prefix`
  replaces the `YYYY/MM` segment (flowchad uses `{flow}/{date}`).
- Default output per file: the URL, then `![alt](url)` (images) or `[alt](url)`
  (video/PDF/text). `--url-only` prints just the URL.
- Exit `0` all uploaded and verified, `1` some file failed (no URL printed for
  it), `2` usage/config error.

The script signs one `PUT` with `curl --aws-sigv4` (curl ≥ 7.75; no AWS CLI),
sets `Content-Type` and `Cache-Control: public, max-age=31536000, immutable`,
passes credentials through a temporary 0600 curl config (never argv), and
verifies the public URL returns HTTP 200 before printing it.

## Integration with Flow Walk

After a walk completes and snapshots are saved:

1. Read `evidence.backend` from `config.yml` (default `s3`; `none` skips).
2. Upload each step screenshot with `--url-only --prefix "{flow}/{date}"`.
3. Upload the GIF (if generated) the same way.
4. Store the URLs in `results.json` under the `evidence` key:

```json
{
  "evidence": {
    "backend": "s3",
    "screenshots": {
      "step-01-navigate": "https://<bucket>.s3.<region>.amazonaws.com/owner/repo/sign-up/2026-03-24/3f9c0a1b2c3d4e5f-step-01-navigate.png"
    },
    "gif": "https://<bucket>.s3.<region>.amazonaws.com/owner/repo/sign-up/2026-03-24/9a8b7c6d5e4f3a2b-sign-up.gif",
    "video": null
  }
}
```

## Integration with Flow Report and GitHub Issues

Embed only URLs the script printed:

```markdown
## Evidence

![Step where failure occurs](https://<bucket>.s3.<region>.amazonaws.com/...)

### Full walk recording

![Walk GIF](https://<bucket>.s3.<region>.amazonaws.com/...)
```

## Failure handling

Evidence is best-effort: an upload failure never blocks a walk, but it is never
silent. Log the reason, fall back to local paths in the report, and say the
evidence is local-only.
