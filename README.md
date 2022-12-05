# NEAR Transaction Tracking App

Transaction Tracking App (TTA) produces a report that helps teams across the ecosystem to see a simplified view of all transactions over a certain period (e.g. the Finance/Legal/Operations team uses it to reconcile their transactions and stay compliant).

# Framework

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

# Deployments

It automatically deploys each commit of the `main` branch to https://tta-basic.onrender.com (which is the production location).

The production URL soon will be https://transactions.nearfoundation.engineering via CNAME.

See https://dashboard.render.com/

# Getting Started

## Install VSC extensions:

- https://marketplace.visualstudio.com/items?itemName=bradymholt.pgformatter
- https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode
- https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint
- https://marketplace.visualstudio.com/items?itemName=fabiospampinato.vscode-highlight (optional)

## Edit the environment variables

`cp .env.development.local.example .env.development.local`

Then edit the values.

## Run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `pages/index.tsx`. The page auto-updates as you edit the file.

[API routes](https://nextjs.org/docs/api-routes/introduction) can be accessed on [http://localhost:3000/api/hello](http://localhost:3000/api/hello). This endpoint can be edited in `pages/api/hello.ts`.

The `pages/api` directory is mapped to `/api/*`. Files in this directory are treated as [API routes](https://nextjs.org/docs/api-routes/introduction) instead of React pages.
