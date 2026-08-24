# AiBlock Documentation

This repository contains the AiBlock VitePress documentation site. The source
files live under `content/latest/docs/` and are copied into `docs/docs/` by the
dev/build scripts.

## Local development

Install dependencies and start the local documentation server:

```bash
npm ci
npm run dev:latest
```

Build the production site and stage the artifacts:

```bash
npm run docs:build
npm run docs:stage-main
npm run build:latest
```

The staged production files are generated in:

```text
projects/AiBlock/en/latest/
```

## GitHub Pages deployment

The build artifacts under `projects/` are committed to the repository. Open
**Settings > Pages**, select **Deploy from a branch**, and choose **main** and
**/(root)**. Do not bind a custom domain.

The GitHub Pages direct URL is:

```text
https://Hiwonder-docs.github.io/AiBlock/projects/AiBlock/en/latest/
```

The public-facing URL (via the baota Nginx reverse proxy) is:

```text
https://wiki.hiwonder.com/projects/AiBlock/en/latest/docs/index.html
```
