const authConfig = {
  providers: [
    {
      // Clerk issuer domain. Set CLERK_JWT_ISSUER_DOMAIN in the Convex
      // dashboard env (or `npx convex env set`) to your Clerk Frontend API
      // URL, e.g. https://<your-app>.clerk.accounts.dev
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex",
    },
  ],
};

export default authConfig;
