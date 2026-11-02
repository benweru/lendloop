"use client";

import { useMutation, useQuery } from "convex/react";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import {
  Bell,
  CalendarRange,
  Car,
  Check,
  CookingPot,
  Drill,
  Hammer,
  Inbox,
  Leaf,
  Package,
  PackageOpen,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  SprayCan,
  TentTree,
  Trash2,
  Wrench,
  X,
  ScrollText,
} from "lucide-react";
import { useState } from "react";
import type { Id } from "../convex/_generated/dataModel";
import { api } from "../convex/_generated/api";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  SectionTitle,
  Select,
  Skeleton,
  StatusBadge,
} from "../components/ui";

const CATEGORIES = [
  "power tools",
  "garden",
  "kitchen",
  "camping",
  "cleaning",
  "automotive",
  "other",
] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_ICONS: Record<string, typeof Wrench> = {
  "power tools": Drill,
  garden: Leaf,
  kitchen: CookingPot,
  camping: TentTree,
  cleaning: SprayCan,
  automotive: Car,
  other: Package,
};

type PublicTool = { _id: Id<"tools">; name: string; category: string };
type Tool = PublicTool & {
  ownerId: Id<"users">;
  condition: string;
  description: string;
  available: boolean;
  ownerTrusted: boolean;
};
type Loan = {
  _id: Id<"requests">;
  toolId: Id<"tools">;
  startDate: string;
  endDate: string;
  status: string;
  overdue: boolean;
};
type Reminder = { reminderDate: string };
type User = {
  _id: Id<"users">;
  clerkId: string;
  email?: string;
  trustedLender: boolean;
};

function formatDate(iso: string) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function Header({ isAdmin }: { isAdmin: boolean }) {
  return (
    <header className="sticky top-0 z-10 border-b border-stone-200/80 bg-[#faf8f3]/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-sm">
            <Hammer size={18} />
          </span>
          <div>
            <h1 className="text-lg leading-tight font-extrabold tracking-tight">
              LendLoop
            </h1>
            <p className="hidden text-xs text-stone-500 sm:block">
              Borrow what you need. Lend what you don&apos;t.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Badge tone="violet">
              <ShieldCheck size={12} /> Admin
            </Badge>
          )}
          <Show when="signed-in">
            <UserButton />
          </Show>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <Button>Sign in</Button>
            </SignInButton>
          </Show>
        </div>
      </div>
    </header>
  );
}

function ToolIcon({ category }: { category: string }) {
  const Icon = CATEGORY_ICONS[category] ?? Package;
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-700/10 text-emerald-800">
      <Icon size={20} />
    </span>
  );
}

function PublicList() {
  const tools = useQuery(api.tools.listPublic);
  if (tools === undefined)
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  if (tools.length === 0)
    return (
      <EmptyState
        icon={<PackageOpen size={28} />}
        title="No tools available yet"
        hint="Be the first neighbor to list something."
      />
    );
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {tools.map((t: PublicTool) => (
        <Card key={t._id} className="flex items-center gap-3">
          <ToolIcon category={t.category} />
          <div>
            <p className="font-semibold text-stone-900">{t.name}</p>
            <Badge>{t.category}</Badge>
          </div>
        </Card>
      ))}
    </div>
  );
}

function ListToolForm({ onDone }: { onDone: () => void }) {
  const createTool = useMutation(api.tools.createTool);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>(CATEGORIES[0]);
  const [condition, setCondition] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <Card className="mb-3 border-emerald-700/20 bg-emerald-50/40">
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          try {
            await createTool({ name, category, condition, description });
            onDone();
          } finally {
            setSaving(false);
          }
        }}
      >
        <Field label="Tool name">
          <Input
            placeholder="e.g. Cordless drill"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </Field>
        <Field label="Category">
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Condition">
          <Input
            placeholder="e.g. good, like new"
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            required
          />
        </Field>
        <Field label="Description">
          <Input
            placeholder="Anything borrowers should know"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </Field>
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" disabled={saving}>
            <Plus size={15} /> {saving ? "Listing…" : "List tool"}
          </Button>
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}

function BorrowForm({ toolId, onDone }: { toolId: Id<"tools">; onDone: () => void }) {
  const request = useMutation(api.requests.requestToBorrow);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <form
      className="mt-3 flex flex-wrap items-end gap-2 rounded-lg bg-stone-50 p-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
          await request({ toolId, startDate: start, endDate: end });
          onDone();
        } finally {
          setSaving(false);
        }
      }}
    >
      <Field label="From">
        <Input
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          required
        />
      </Field>
      <Field label="Until">
        <Input
          type="date"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          required
        />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={saving}>
          <Check size={14} /> {saving ? "Sending…" : "Send request"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function ToolCard({ tool }: { tool: Tool }) {
  const [borrowing, setBorrowing] = useState(false);
  return (
    <Card className="transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <ToolIcon category={tool.category} />
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-1.5 font-semibold text-stone-900">
              {tool.name}
              {tool.ownerTrusted && (
                <Badge tone="violet">
                  <Sparkles size={11} /> Trusted lender
                </Badge>
              )}
            </p>
            <p className="mt-0.5 text-[13px] text-stone-500">
              {tool.category} · {tool.condition}
            </p>
            <p className="mt-1 text-sm text-stone-700">{tool.description}</p>
          </div>
        </div>
        <Badge tone={tool.available ? "green" : "stone"}>
          {tool.available ? "Available" : "On loan"}
        </Badge>
      </div>
      {tool.available && !borrowing && (
        <div className="mt-3">
          <Button size="sm" onClick={() => setBorrowing(true)}>
            <CalendarRange size={14} /> Borrow
          </Button>
        </div>
      )}
      {tool.available && borrowing && (
        <BorrowForm toolId={tool._id} onDone={() => setBorrowing(false)} />
      )}
    </Card>
  );
}

function Browse({
  filter,
  setFilter,
}: {
  filter: string;
  setFilter: (f: string) => void;
}) {
  const tools = useQuery(
    api.tools.listAll,
    filter === "all" ? {} : { category: filter },
  );
  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-2">
        <Search size={16} className="shrink-0 text-stone-400" />
        <Select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full sm:w-56"
        >
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </div>
      {tools === undefined && (
        <>
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </>
      )}
      {(tools ?? []).map((t: Tool) => (
        <ToolCard key={t._id} tool={t} />
      ))}
      {tools !== undefined && tools.length === 0 && (
        <EmptyState
          icon={<Search size={28} />}
          title="Nothing here"
          hint="Try a different category, or list the tool yourself."
        />
      )}
    </div>
  );
}

function LoanActivity({ requestId }: { requestId: Id<"requests"> }) {
  const activity = useQuery(api.requests.loanActivity, { requestId });
  if (!activity || activity.length === 0) return null;
  return (
    <p className="mt-1.5 flex items-center gap-1 text-xs text-stone-500">
      <Bell size={12} />
      {activity.map((a: Reminder) => `Reminder sent ${a.reminderDate}`).join(" · ")}
    </p>
  );
}

function LoanCard({
  loan,
  actions,
}: {
  loan: Loan;
  actions?: React.ReactNode;
}) {
  return (
    <Card>
      <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-stone-900">
        <CalendarRange size={14} className="text-stone-400" />
        {formatDate(loan.startDate)} → {formatDate(loan.endDate)}
        <StatusBadge status={loan.status} />
        {loan.overdue && <Badge tone="red">Overdue</Badge>}
      </p>
      <LoanActivity requestId={loan._id} />
      {actions && <div className="mt-2.5 flex flex-wrap gap-2">{actions}</div>}
    </Card>
  );
}

const TABS = [
  { id: "browse", label: "Browse", icon: Search },
  { id: "listings", label: "My listings", icon: Wrench },
  { id: "requests", label: "My requests", icon: Package },
  { id: "incoming", label: "Incoming", icon: Inbox },
] as const;
type TabId = (typeof TABS)[number]["id"];

function Dashboard() {
  const listings = useQuery(api.tools.myListings);
  const mine = useQuery(api.requests.myRequests);
  const incoming = useQuery(api.requests.incomingRequests);
  const approve = useMutation(api.requests.approveRequest);
  const decline = useMutation(api.requests.declineRequest);
  const returned = useMutation(api.requests.markReturned);
  const cancel = useMutation(api.requests.cancelRequest);
  const remove = useMutation(api.tools.deleteTool);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("all");
  const [tab, setTab] = useState<TabId>("browse");

  const pendingCount = (incoming ?? []).length;

  return (
    <div>
      <nav className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-stone-200/80 bg-white p-1 shadow-sm">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors ${
              tab === t.id
                ? "bg-emerald-700 text-white shadow-sm"
                : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            <t.icon size={15} />
            {t.label}
            {t.id === "incoming" && pendingCount > 0 && (
              <span
                className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold ${
                  tab === t.id ? "bg-white text-emerald-800" : "bg-amber-400 text-amber-950"
                }`}
              >
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </nav>

      {tab === "browse" && (
        <section>
          <SectionTitle hint="Tools your neighbors are sharing right now.">
            Browse tools
          </SectionTitle>
          <Browse filter={filter} setFilter={setFilter} />
        </section>
      )}

      {tab === "listings" && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <SectionTitle hint="Tools you're lending out.">My listings</SectionTitle>
            <Button variant="outline" size="sm" onClick={() => setShowForm((s) => !s)}>
              <Plus size={14} /> {showForm ? "Close" : "List a tool"}
            </Button>
          </div>
          {showForm && <ListToolForm onDone={() => setShowForm(false)} />}
          <div className="grid gap-2">
            {listings === undefined && (
              <>
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </>
            )}
            {(listings ?? []).map((t) => (
              <Card key={t._id} className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2.5">
                  <ToolIcon category={t.category} />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-stone-900">
                      {t.name}
                    </span>
                    <Badge tone={t.available ? "green" : "stone"}>
                      {t.available ? "Available" : "On loan"}
                    </Badge>
                  </span>
                </span>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => remove({ toolId: t._id })}
                >
                  <Trash2 size={14} />
                </Button>
              </Card>
            ))}
            {listings !== undefined && listings.length === 0 && !showForm && (
              <EmptyState
                icon={<Wrench size={28} />}
                title="No listings yet"
                hint="List your first tool to start sharing."
              />
            )}
          </div>
        </section>
      )}

      {tab === "requests" && (
        <section>
          <SectionTitle hint="Tools you've asked to borrow.">My requests</SectionTitle>
          <div className="grid gap-2">
            {mine === undefined && (
              <>
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </>
            )}
            {(mine ?? []).map((r: Loan) => (
              <LoanCard
                key={r._id}
                loan={r}
                actions={
                  <>
                    {r.status === "approved" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => returned({ requestId: r._id })}
                      >
                        <RotateCcw size={14} /> Mark returned
                      </Button>
                    )}
                    {r.status === "pending" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => cancel({ requestId: r._id })}
                      >
                        <X size={14} /> Cancel
                      </Button>
                    )}
                  </>
                }
              />
            ))}
            {mine !== undefined && mine.length === 0 && (
              <EmptyState
                icon={<Package size={28} />}
                title="No requests yet"
                hint="Find something you need in Browse."
              />
            )}
          </div>
        </section>
      )}

      {tab === "incoming" && (
        <section>
          <SectionTitle hint="Neighbors asking to borrow your tools.">
            Incoming requests
          </SectionTitle>
          <div className="grid gap-2">
            {incoming === undefined && (
              <>
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </>
            )}
            {(incoming ?? []).map((r: Loan) => (
              <LoanCard
                key={r._id}
                loan={r}
                actions={
                  <>
                    <Button size="sm" onClick={() => approve({ requestId: r._id })}>
                      <Check size={14} /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => decline({ requestId: r._id })}
                    >
                      <X size={14} /> Decline
                    </Button>
                  </>
                }
              />
            ))}
            {incoming !== undefined && incoming.length === 0 && (
              <EmptyState
                icon={<Inbox size={28} />}
                title="All caught up"
                hint="No one is waiting on your tools."
              />
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function AdminPanel() {
  const all = useQuery(api.requests.allRequests);
  const users = useQuery(api.users.allUsers);
  const setTrusted = useMutation(api.users.setTrustedLender);
  const removeListing = useMutation(api.tools.adminRemoveListing);
  const auditEntries = useQuery(api.users.auditLog, { limit: 30 });
  if (all === undefined) return null;
  const userLabel = new Map(
    (users ?? []).map((u: User) => [u._id as string, u.email ?? u.clerkId]),
  );
  return (
    <section className="mt-8 rounded-xl border border-violet-200 bg-violet-50/50 p-4">
      <SectionTitle hint="Visible only to admins.">Admin</SectionTitle>
      <h3 className="mb-1.5 text-sm font-semibold text-stone-700">
        All loans ({all.length})
      </h3>
      <div className="grid gap-2">
        {all.map((r: Loan) => (
          <LoanCard
            key={r._id}
            loan={r}
            actions={
              <Button
                size="sm"
                variant="destructive"
                onClick={() => removeListing({ toolId: r.toolId })}
              >
                <Trash2 size={14} /> Remove listing
              </Button>
            }
          />
        ))}
      </div>
      <h3 className="mt-4 mb-1.5 text-sm font-semibold text-stone-700">Lenders</h3>
      <div className="grid gap-2">
        {(users ?? []).map((u: User) => (
          <Card key={u._id} className="flex items-center justify-between gap-2">
            <p className="min-w-0 truncate text-sm font-medium text-stone-900">
              {u.email ?? u.clerkId}{" "}
              {u.trustedLender && (
                <Badge tone="violet">
                  <Sparkles size={11} /> Trusted
                </Badge>
              )}
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setTrusted({ userId: u._id, trusted: !u.trustedLender })}
            >
              {u.trustedLender ? "Unmark" : "Mark trusted"}
            </Button>
          </Card>
        ))}
      </div>
      <h3 className="mt-4 mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-stone-700">
        <ScrollText size={14} /> Audit log (latest {auditEntries?.length ?? 0})
      </h3>
      <Card className="divide-y divide-stone-100 p-0">
        {(auditEntries ?? []).length === 0 && (
          <p className="p-3 text-sm text-stone-500">No activity yet.</p>
        )}
        {(auditEntries ?? []).map((e) => (
          <div
            key={e._id}
            className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
          >
            <span className="min-w-0 truncate text-stone-800">
              <Badge tone="violet">{e.action}</Badge>{" "}
              <span className="text-stone-600">
                by {userLabel.get(e.actorId) ?? e.actorId}
              </span>{" "}
              <span className="font-mono text-xs text-stone-400">{e.targetId}</span>
              {e.detail && <span className="text-stone-500"> ({e.detail})</span>}
            </span>
            <time className="text-xs text-stone-500">
              {new Date(e.at).toLocaleString()}
            </time>
          </div>
        ))}
      </Card>
    </section>
  );
}

function AuthedApp() {
  const ensureUser = useMutation(api.users.ensureUser);
  const me = useQuery(api.users.me);
  const [error, setError] = useState<string | null>(null);
  if (me === undefined && !error)
    return (
      <div className="grid gap-3">
        <Skeleton className="h-12" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    );
  if ((me === null || me === undefined) && !error) {
    ensureUser({}).catch((e) => setError(String(e?.message ?? e)));
    if (!error) return <p className="text-sm text-stone-500">Setting up your account…</p>;
  }
  if (error)
    return (
      <p className="text-sm text-red-600">
        Couldn&apos;t set up your account: {error}. Check that
        CLERK_JWT_ISSUER_DOMAIN is set in the Convex dashboard env settings.
      </p>
    );
  return (
    <>
      <Dashboard />
      {me?.role === "admin" && <AdminPanel />}
    </>
  );
}

export default function HomeClient() {
  const authed = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  return (
    <div className="flex min-h-full flex-col">
      <Header isAdmin={false} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <Show when="signed-out">
          <div className="mb-6 rounded-2xl bg-emerald-800 px-6 py-8 text-white shadow-md">
            <h2 className="text-2xl font-extrabold tracking-tight">
              Borrow what you need. Lend what you don&apos;t.
            </h2>
            <p className="mt-1 max-w-lg text-sm text-emerald-100">
              Your neighborhood tool library: drills, ladders, camping gear
              and more, shared by people nearby.
            </p>
            <div className="mt-4">
              <SignInButton mode="modal">
                <Button className="bg-white text-emerald-900 hover:bg-emerald-50">
                  Sign in to get started
                </Button>
              </SignInButton>
            </div>
          </div>
          <SectionTitle hint="A preview of what's being shared.">
            Available tools
          </SectionTitle>
          {authed ? (
            <PublicList />
          ) : (
            <p className="text-sm text-stone-500">
              Connect Convex (NEXT_PUBLIC_CONVEX_URL) to see live tools.
            </p>
          )}
        </Show>
        <Show when="signed-in">
          <AuthedApp />
        </Show>
        {!authed && (
          <p className="mt-4 text-sm text-stone-500">
            Connect Clerk + Convex (see .env.example) to enable sign-in.
          </p>
        )}
      </main>
      <footer className="border-t border-stone-200/70 py-4 text-center text-xs text-stone-400">
        LendLoop: share more, buy less.
      </footer>
    </div>
  );
}
