// NOTE: This is a placeholder checked in so the repo typechecks standalone.
// Run `npx convex dev` (after Clerk/Convex setup) to regenerate the real file.
import type { ApiFromModules } from "convex/server";
import type * as helpers from "../helpers";
import type * as http from "../http";
import type * as internal from "../internal";
import type * as requests from "../requests";
import type * as tools from "../tools";
import type * as users from "../users";
import type * as webhooks from "../webhooks";

declare const fullApi: ApiFromModules<{
  helpers: typeof helpers;
  http: typeof http;
  internal: typeof internal;
  requests: typeof requests;
  tools: typeof tools;
  users: typeof users;
  webhooks: typeof webhooks;
}>;
export declare const api: typeof fullApi;
export declare const internal: typeof fullApi;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DataModel = any;
