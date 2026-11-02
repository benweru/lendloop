"use client";

import { useMutation, useQuery } from "convex/react";import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { useState } from "react";
import { api } from "../convex/_generated/api";
import { Badge, Button, Card, Input, Select } from "../components/ui";

const CATEGORIES = [
  "power tools",
  "garden",
  "kitchen",
  "camping",
  "cleaning",
  "automotive",
  "other",
];

type PublicTool = { _id: string; name: string; category: string };
type Tool = PublicTool & {
  ownerId: string;
  condition: string;
  description: string;
  available: boolean;
  ownerTrusted: boolean;
};
type Loan = {
  _id: string;
  toolId: string;
  startDate: string;
  endDate: string;
  status: string;
  overdue: boolean;
};
type Reminder = { reminderDate: string };
type User = {
  _id: string;
  clerkId: string;
  email?: string;
  trustedLender: boolean;
};

function Header({ isAdmin }: { isAdmin: boolean }) {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <div>
          <h1 className="text-xl font-bold">LendLoop</h1>
          <p className="text-sm text-zinc-500">
            Borrow what you need. Lend what you don&apos;t.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && <Badge>Admin</Badge>}
          <SignedIn>
            <UserButton />
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <Button>Sign in to lend or borrow</Button>
            </SignInButton>
          </SignedOut>
        </div>
      </div>
    </header>
  );
}

function PublicList() {
  const tools = useQuery(api.tools.listPublic);
  if (tools === undefined) return <p>Loading…</p>;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {tools.map((t: PublicTool) => (
        <Card key={t._id}>
          <p className="font-medium">{t.name}</p>
          <Badge>{t.category}</Badge>
        </Card>
      ))}
      {tools.length === 0 && (
        <p className="text-sm text-zinc-500">No tools available yet.</p>
      )}
    </div>
  );
}

function ListToolForm({ onDone }: { onDone: () => void }) {
  const createTool = useMutation(api.tools.createTool);
  const [name, setName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [condition, setCondition] = useState("");
  const [description, setDescription] = useState("");
  return (
    <form
      className="grid gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        await createTool({ name, category, condition, description });
        onDone();
      }}
    >
      <Input
        placeholder="Tool name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <Select value={category} onChange={(e) => setCategory(e.target.value)}>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </Select>
      <Input
        placeholder="Condition (e.g. good, like new)"
        value={condition}
        onChange={(e) => setCondition(e.target.value)}
        required
      />
      <Input
        placeholder="Short description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        required
      />
      <Button type="submit">List tool</Button>
    </form>
  );
}

function BorrowButton({ toolId }: { toolId: string }) {
  const request = useMutation(api.requests.requestToBorrow);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [open, setOpen] = useState(false);
  if (!open) return <Button onClick={() => setOpen(true)}>Borrow</Button>;
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        await request({ toolId: toolId as never, startDate: start, endDate: end });
        setOpen(false);
      }}
    >
      <Input
        type="date"
        value={start}
        onChange={(e) => setStart(e.target.value)}
        required
      />
      <Input
        type="date"
        value={end}
        onChange={(e) => setEnd(e.target.value)}
        required
      />
      <Button type="submit">Request</Button>
    </form>
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
  if (tools === undefined) return <p>Loading…</p>;
  return (
    <div className="grid gap-3">
      <Select value={filter} onChange={(e) => setFilter(e.target.value)}>
        <option value="all">All categories</option>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </Select>
      {tools.map((t: Tool) => (
        <Card
          key={t._id}
          className="flex flex-wrap items-center justify-between gap-2"
        >
          <div>
            <p className="font-medium">
              {t.name} {t.ownerTrusted && <Badge>Trusted lender</Badge>}
            </p>
            <p className="text-sm text-zinc-500">
              {t.category} · {t.condition} ·{" "}
              {t.available ? "Available" : "On loan"}
            </p>
            <p className="text-sm">{t.description}</p>
          </div>
          {t.available && <BorrowButton toolId={t._id} />}
        </Card>
      ))}
    </div>
  );
}

function LoanActivity({ requestId }: { requestId: string }) {
  const activity = useQuery(api.requests.loanActivity, {
    requestId: requestId as never,
  });
  if (!activity || activity.length === 0) return null;
  return (
    <p className="text-xs text-zinc-500">
      {activity.map((a: Reminder) => `Reminder sent ${a.reminderDate}`).join(" · ")}
    </p>
  );
}

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

  return (
    <div className="grid gap-8">
      <section>
        <h2 className="mb-2 text-lg font-semibold">Browse tools</h2>
        <Browse filter={filter} setFilter={setFilter} />
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">My listings</h2>
          <Button variant="outline" onClick={() => setShowForm((s) => !s)}>
            {showForm ? "Close" : "List a tool"}
          </Button>
        </div>
        {showForm && <ListToolForm onDone={() => setShowForm(false)} />}
        <div className="mt-2 grid gap-2">
          {(listings ?? []).map((t: Tool) => (
            <Card key={t._id} className="flex items-center justify-between">
              <span>
                {t.name} <Badge>{t.available ? "Available" : "On loan"}</Badge>
              </span>
              <Button
                variant="destructive"
                onClick={() => remove({ toolId: t._id })}
              >
                Delete
              </Button>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">My requests</h2>
        <div className="grid gap-2">
          {(mine ?? []).map((r: Loan) => (
            <Card key={r._id}>
              <p className="text-sm">
                {r.startDate} → {r.endDate} · <Badge>{r.status}</Badge>{" "}
                {r.overdue && <Badge>Overdue</Badge>}
              </p>
              <LoanActivity requestId={r._id} />
              <div className="mt-1 flex gap-2">
                {r.status === "approved" && (
                  <Button
                    variant="outline"
                    onClick={() => returned({ requestId: r._id })}
                  >
                    Mark returned
                  </Button>
                )}
                {r.status === "pending" && (
                  <Button
                    variant="ghost"
                    onClick={() => cancel({ requestId: r._id })}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Incoming requests</h2>
        <div className="grid gap-2">
          {(incoming ?? []).map((r: Loan) => (
            <Card key={r._id} className="flex items-center justify-between">
              <p className="text-sm">
                {r.startDate} → {r.endDate}
              </p>
              <div className="flex gap-2">
                <Button onClick={() => approve({ requestId: r._id })}>
                  Approve
                </Button>
                <Button
                  variant="outline"
                  onClick={() => decline({ requestId: r._id })}
                >
                  Decline
                </Button>
              </div>
            </Card>
          ))}
          {(incoming ?? []).length === 0 && (
            <p className="text-sm text-zinc-500">No incoming requests.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function AdminPanel() {
  const all = useQuery(api.requests.allRequests);
  const users = useQuery(api.users.allUsers);
  const setTrusted = useMutation(api.users.setTrustedLender);
  const removeListing = useMutation(api.tools.adminRemoveListing);
  if (all === undefined) return null;
  return (
    <section className="mt-8 border-t border-zinc-200 pt-6">
      <h2 className="mb-2 text-lg font-semibold">Admin</h2>
      <h3 className="text-sm font-medium">All loans ({all.length})</h3>
      <div className="mt-1 grid gap-2">
        {all.map((r: Loan) => (
          <Card key={r._id} className="flex items-center justify-between">
            <p className="text-sm">
              {r.startDate} → {r.endDate} · <Badge>{r.status}</Badge>{" "}
              {r.overdue && <Badge>Overdue</Badge>}
            </p>
            <Button
              variant="destructive"
              onClick={() => removeListing({ toolId: r.toolId })}
            >
              Remove listing
            </Button>
          </Card>
        ))}
      </div>
      <h3 className="mt-4 text-sm font-medium">Lenders</h3>
      <div className="mt-1 grid gap-2">
        {(users ?? []).map((u: User) => (
          <Card key={u._id} className="flex items-center justify-between">
            <p className="text-sm">
              {u.email ?? u.clerkId} {u.trustedLender && <Badge>Trusted</Badge>}
            </p>
            <Button
              variant="outline"
              onClick={() =>
                setTrusted({ userId: u._id, trusted: !u.trustedLender })
              }
            >
              {u.trustedLender ? "Unmark" : "Mark trusted"}
            </Button>
          </Card>
        ))}
      </div>
    </section>
  );
}

function AuthedApp() {
  const ensureUser = useMutation(api.users.ensureUser);
  const me = useQuery(api.users.me);
  const [ready, setReady] = useState(false);
  if (me === undefined) return <p>Loading…</p>;
  if (me === null && !ready) {
    ensureUser({}).then(() => setReady(true));
    return <p>Setting up your account…</p>;
  }
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
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <SignedOut>
          <h2 className="mb-3 text-lg font-semibold">Available tools</h2>
          {authed ? (
            <PublicList />
          ) : (
            <p className="text-sm text-zinc-500">
              Connect Convex (NEXT_PUBLIC_CONVEX_URL) to see live tools.
            </p>
          )}
        </SignedOut>
        <SignedIn>
          <AuthedApp />
        </SignedIn>
        {!authed && (
          <p className="mt-4 text-sm text-zinc-500">
            Connect Clerk + Convex (see .env.example) to enable sign-in.
          </p>
        )}
      </main>
    </div>
  );
}



