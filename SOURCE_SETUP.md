# Tossup source package

This archive contains the editable React/TypeScript frontend (`src/`), serverless Supabase API routes (`api/`), stock background images and favicon (`public/`), build configuration, and the ad setup guide. The generated `dist/`, installed dependencies, hosting credentials, `.env`, and deployment-specific `vercel.json` are intentionally excluded.

## Run it

1. Install Node.js and run `npm install`.
2. Copy `.env.example` to `.env.local` and fill in your own Supabase project values. Keep the service-role key **server-side only**. The frontend is a Vite app; `/api/*` routes need a compatible serverless or Node adapter when self-hosting, so `npm run dev` alone does not serve the API functions.
3. Run `schema.sql` in a new Supabase project, then seed the public catalog tables `themes`, `suggestions`, `option_collections`, and `result_messages`. The deployed Tossup instance uses an existing Supabase project; a new instance needs its own catalog content. The schema includes user ownership policies.
4. See `ADS_SETUP.md` for optional advertising integration.
5. Run `npm run build` for the production frontend output in `dist/`. Host the static files and deploy the API routes on your preferred compatible platform; this source package does not require using Vercel.

This archive does not contain credentials or a database export. It is the raw project source, not a snapshot of user data.
