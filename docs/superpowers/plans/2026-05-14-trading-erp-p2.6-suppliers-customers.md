# Trading ERP — Phase 1, Plan 2.6 (Suppliers + Customers) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `suppliers` and `customers` tables with CRUD pages and inline-create pickers wired into PURCHASE / SALE / RETURN transaction forms, replacing the free-text counterparty inputs with proper partner records while keeping the existing free-text fallback for legacy data.

**Architecture:** Two new identical-shape tables (`suppliers`, `customers`) with all-fields-optional-except-name. Two new CRUD pages mirror the existing `/skus` and `/cash-accounts` patterns. A shared `InlinePartnerCreateDialog` plus two thin pickers (`SupplierLinePicker`, `CustomerLinePicker`) provide the in-form selection + inline-create UX. The `transactions` table gains nullable `supplier_id` and `customer_id` FK columns; the existing `counterparty_name` text column stays as a denormalized historical record (frozen at save time) and as the legacy fallback for pre-2.6 rows. Pickers' `onChange` callback writes both id and name so historical names survive partner renames.

**Tech Stack:** Same as Plans 1 + 2 + 2.5 — Next.js 16 App Router, React 19, TypeScript, Supabase, Tailwind v4, shadcn/ui on `@base-ui/react`, react-hook-form + zod, Vitest.

**Reference spec:** `docs/superpowers/specs/2026-05-14-trading-erp-phase-1-plan-2.6-suppliers-customers-design.md`

**Working directory:** `~/trading-erp`

---

## Task 1: Migration `0005_add_partners`

**Files:**
- Create: `~/trading-erp/supabase/migrations/0005_add_partners.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0005_add_partners.sql`:
```sql
create table suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text not null default '',
  contact_person text not null default '',
  email text not null default '',
  phone text not null default '',
  tax_id text not null default '',
  address text not null default '',
  notes text not null default '',
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text not null default '',
  contact_person text not null default '',
  email text not null default '',
  phone text not null default '',
  tax_id text not null default '',
  address text not null default '',
  notes text not null default '',
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

alter table transactions
  add column supplier_id uuid references suppliers(id),
  add column customer_id uuid references customers(id);

create index idx_transactions_supplier on transactions (supplier_id)
  where supplier_id is not null;
create index idx_transactions_customer on transactions (customer_id)
  where customer_id is not null;

alter table suppliers enable row level security;
alter table customers enable row level security;

create policy "auth full access" on suppliers
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth full access" on customers
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
```

- [ ] **Step 2: Apply to remote DB (operator action — pause here if no auth)**

```bash
cd ~/trading-erp && supabase db push --yes
```

If the subagent's shell doesn't have `SUPABASE_ACCESS_TOKEN`/`SUPABASE_DB_PASSWORD`, stop with `NEEDS_CONTEXT` — the controller handles auth and re-dispatches. (Same pattern as Plan 2.5's T1.)

- [ ] **Step 3: Regenerate TypeScript types**

```bash
cd ~/trading-erp && npm run db:types
```

Confirm with `grep -c "suppliers" src/lib/supabase/database.types.ts` (≥ 3) and `grep -c "customers" src/lib/supabase/database.types.ts` (≥ 3).

If `db:types` fails due to revoked PAT (same situation as Plan 2.5's T1), STOP with NEEDS_CONTEXT — the controller patches `database.types.ts` manually with the new table types.

- [ ] **Step 4: Commit**

```bash
cd ~/trading-erp
git add supabase/migrations/0005_add_partners.sql src/lib/supabase/database.types.ts
git commit -m "feat(db): add suppliers + customers tables and FK columns on transactions"
```

---

## Task 2: zod schema — `lib/schemas/partner.ts`

**Files:**
- Create: `~/trading-erp/src/lib/schemas/partner.ts`

- [ ] **Step 1: Create the schema file**

Create `src/lib/schemas/partner.ts`:
```ts
import { z } from "zod";

export const partnerInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  country: z.string().trim().max(50).default(""),
  contactPerson: z.string().trim().max(120).default(""),
  email: z.string().trim().max(120).default(""),
  phone: z.string().trim().max(50).default(""),
  taxId: z.string().trim().max(50).default(""),
  address: z.string().trim().max(500).default(""),
  notes: z.string().trim().max(500).default(""),
});

export type PartnerInput = z.infer<typeof partnerInputSchema>;

// Same shape, distinct names — helps static analysis catch "supplier passed to customer action" mistakes.
export const supplierInputSchema = partnerInputSchema;
export const customerInputSchema = partnerInputSchema;
export type SupplierInput = PartnerInput;
export type CustomerInput = PartnerInput;
```

- [ ] **Step 2: Verify**

```bash
cd ~/trading-erp && npm run lint && npm test 2>&1 | tail -3 && npm run build 2>&1 | tail -3
```

Expected: lint clean (one pre-existing warning OK), 34 tests pass, build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/lib/schemas/partner.ts
git commit -m "feat(schemas): partner input schema (shared by supplier + customer)"
```

---

## Task 3: Server actions — suppliers + customers

**Files:**
- Create: `~/trading-erp/src/lib/actions/suppliers.ts`
- Create: `~/trading-erp/src/lib/actions/customers.ts`

- [ ] **Step 1: Create `suppliers.ts`**

Create `src/lib/actions/suppliers.ts`:
```ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { supplierInputSchema, type SupplierInput } from "@/lib/schemas/partner";

export async function createSupplier(input: SupplierInput): Promise<{ id: string; name: string }> {
  const parsed = supplierInputSchema.parse(input);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from("suppliers").insert({
    name: parsed.name,
    country: parsed.country,
    contact_person: parsed.contactPerson,
    email: parsed.email,
    phone: parsed.phone,
    tax_id: parsed.taxId,
    address: parsed.address,
    notes: parsed.notes,
    created_by: user?.id ?? null,
  }).select("id, name").single();
  if (error) throw new Error(error.message);
  revalidatePath("/suppliers");
  return data;
}

export async function updateSupplier(id: string, input: SupplierInput): Promise<void> {
  const parsed = supplierInputSchema.parse(input);
  const supabase = await createClient();
  const { error } = await supabase.from("suppliers").update({
    name: parsed.name,
    country: parsed.country,
    contact_person: parsed.contactPerson,
    email: parsed.email,
    phone: parsed.phone,
    tax_id: parsed.taxId,
    address: parsed.address,
    notes: parsed.notes,
  }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/suppliers");
}

export async function archiveSupplier(id: string, archived: boolean): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("suppliers").update({ is_archived: archived }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/suppliers");
}
```

- [ ] **Step 2: Create `customers.ts`**

Create `src/lib/actions/customers.ts` — same code with `supplier`/`suppliers` → `customer`/`customers`:
```ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { customerInputSchema, type CustomerInput } from "@/lib/schemas/partner";

export async function createCustomer(input: CustomerInput): Promise<{ id: string; name: string }> {
  const parsed = customerInputSchema.parse(input);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from("customers").insert({
    name: parsed.name,
    country: parsed.country,
    contact_person: parsed.contactPerson,
    email: parsed.email,
    phone: parsed.phone,
    tax_id: parsed.taxId,
    address: parsed.address,
    notes: parsed.notes,
    created_by: user?.id ?? null,
  }).select("id, name").single();
  if (error) throw new Error(error.message);
  revalidatePath("/customers");
  return data;
}

export async function updateCustomer(id: string, input: CustomerInput): Promise<void> {
  const parsed = customerInputSchema.parse(input);
  const supabase = await createClient();
  const { error } = await supabase.from("customers").update({
    name: parsed.name,
    country: parsed.country,
    contact_person: parsed.contactPerson,
    email: parsed.email,
    phone: parsed.phone,
    tax_id: parsed.taxId,
    address: parsed.address,
    notes: parsed.notes,
  }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/customers");
}

export async function archiveCustomer(id: string, archived: boolean): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("customers").update({ is_archived: archived }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/customers");
}
```

- [ ] **Step 3: Verify**

```bash
cd ~/trading-erp && npm run lint && npm run build 2>&1 | tail -3
```

Expected: lint clean (one pre-existing warning OK), build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/lib/actions/suppliers.ts src/lib/actions/customers.ts
git commit -m "feat(actions): supplier + customer create/update/archive"
```

---

## Task 4: `/suppliers` CRUD page

**Files:**
- Create: `~/trading-erp/src/app/(app)/suppliers/page.tsx`
- Create: `~/trading-erp/src/app/(app)/suppliers/SupplierTable.tsx`
- Create: `~/trading-erp/src/app/(app)/suppliers/SupplierFormDialog.tsx`

- [ ] **Step 1: Create `SupplierFormDialog.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supplierInputSchema, type SupplierInput } from "@/lib/schemas/partner";
import { createSupplier, updateSupplier } from "@/lib/actions/suppliers";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { z } from "zod";

type SupplierFormValues = z.input<typeof supplierInputSchema>;

type Props = {
  mode: "create" | "edit";
  initial?: { id: string } & SupplierInput;
  trigger: React.ReactNode;
};

export function SupplierFormDialog({ mode, initial, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierInputSchema),
    defaultValues: initial ?? {
      name: "", country: "", contactPerson: "", email: "", phone: "", taxId: "", address: "", notes: "",
    },
  });

  function onSubmit(data: SupplierFormValues) {
    setError(null);
    startTransition(async () => {
      try {
        const parsed = supplierInputSchema.parse(data);
        if (mode === "create") await createSupplier(parsed);
        else await updateSupplier(initial!.id, parsed);
        setOpen(false);
        reset();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New supplier" : "Edit supplier"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input id="name" {...register("name")} />
            {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
          </div>
          <div>
            <Label htmlFor="country">Country</Label>
            <Input id="country" {...register("country")} placeholder="e.g. China" />
          </div>
          <div>
            <Label htmlFor="contactPerson">Contact person</Label>
            <Input id="contactPerson" {...register("contactPerson")} />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" {...register("email")} />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" {...register("phone")} />
          </div>
          <div>
            <Label htmlFor="taxId">Tax ID</Label>
            <Input id="taxId" {...register("taxId")} />
          </div>
          <div>
            <Label htmlFor="address">Address</Label>
            <Input id="address" {...register("address")} />
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" {...register("notes")} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Create `SupplierTable.tsx`**

```tsx
"use client";

import { useTransition } from "react";
import { archiveSupplier } from "@/lib/actions/suppliers";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { SupplierFormDialog } from "./SupplierFormDialog";

type Row = {
  id: string;
  name: string;
  country: string;
  contact_person: string;
  email: string;
  phone: string;
  tax_id: string;
  address: string;
  notes: string;
  is_archived: boolean;
};

export function SupplierTable({ rows }: { rows: Row[] }) {
  const [pending, startTransition] = useTransition();

  function toggleArchive(id: string, current: boolean) {
    startTransition(() => archiveSupplier(id, !current));
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Country</TableHead>
          <TableHead>Contact</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell>{r.name}</TableCell>
            <TableCell>{r.country || "—"}</TableCell>
            <TableCell>{r.contact_person || "—"}</TableCell>
            <TableCell>{r.email || "—"}</TableCell>
            <TableCell>{r.is_archived ? "Archived" : "Active"}</TableCell>
            <TableCell className="space-x-2">
              <SupplierFormDialog
                mode="edit"
                initial={{
                  id: r.id,
                  name: r.name,
                  country: r.country,
                  contactPerson: r.contact_person,
                  email: r.email,
                  phone: r.phone,
                  taxId: r.tax_id,
                  address: r.address,
                  notes: r.notes,
                }}
                trigger={<Button size="sm" variant="outline">Edit</Button>}
              />
              <Button size="sm" variant="ghost" disabled={pending} onClick={() => toggleArchive(r.id, r.is_archived)}>
                {r.is_archived ? "Unarchive" : "Archive"}
              </Button>
            </TableCell>
          </TableRow>
        ))}
        {rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-slate-500 py-8">No suppliers yet.</TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
```

- [ ] **Step 3: Create `page.tsx`**

```tsx
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { SupplierFormDialog } from "./SupplierFormDialog";
import { SupplierTable } from "./SupplierTable";

export default async function SuppliersPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suppliers")
    .select("id, name, country, contact_person, email, phone, tax_id, address, notes, is_archived")
    .order("name");
  if (error) throw new Error(error.message);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Suppliers</h1>
        <SupplierFormDialog mode="create" trigger={<Button>New supplier</Button>} />
      </div>
      <div className="bg-white rounded-lg shadow">
        <SupplierTable rows={data ?? []} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify build + commit**

```bash
cd ~/trading-erp && npm run build 2>&1 | tail -3
git add src/app/\(app\)/suppliers/
git commit -m "feat(suppliers): CRUD page (list + form dialog + table)"
```

Expected: build succeeds, `/suppliers` appears in the route table.

---

## Task 5: `/customers` CRUD page

**Files:**
- Create: `~/trading-erp/src/app/(app)/customers/page.tsx`
- Create: `~/trading-erp/src/app/(app)/customers/CustomerTable.tsx`
- Create: `~/trading-erp/src/app/(app)/customers/CustomerFormDialog.tsx`

- [ ] **Step 1: Create `CustomerFormDialog.tsx`**

Same as `SupplierFormDialog.tsx` from T4 step 1, with these replacements:
- `Supplier`/`supplier` → `Customer`/`customer` (component name, action imports, dialog titles)
- `customerInputSchema`, `CustomerInput` imports from `@/lib/schemas/partner`
- `createCustomer`, `updateCustomer` imports from `@/lib/actions/customers`

Full file:
```tsx
"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { customerInputSchema, type CustomerInput } from "@/lib/schemas/partner";
import { createCustomer, updateCustomer } from "@/lib/actions/customers";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { z } from "zod";

type CustomerFormValues = z.input<typeof customerInputSchema>;

type Props = {
  mode: "create" | "edit";
  initial?: { id: string } & CustomerInput;
  trigger: React.ReactNode;
};

export function CustomerFormDialog({ mode, initial, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerInputSchema),
    defaultValues: initial ?? {
      name: "", country: "", contactPerson: "", email: "", phone: "", taxId: "", address: "", notes: "",
    },
  });

  function onSubmit(data: CustomerFormValues) {
    setError(null);
    startTransition(async () => {
      try {
        const parsed = customerInputSchema.parse(data);
        if (mode === "create") await createCustomer(parsed);
        else await updateCustomer(initial!.id, parsed);
        setOpen(false);
        reset();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New customer" : "Edit customer"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input id="name" {...register("name")} />
            {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
          </div>
          <div>
            <Label htmlFor="country">Country</Label>
            <Input id="country" {...register("country")} placeholder="e.g. Taiwan" />
          </div>
          <div>
            <Label htmlFor="contactPerson">Contact person</Label>
            <Input id="contactPerson" {...register("contactPerson")} />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" {...register("email")} />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" {...register("phone")} />
          </div>
          <div>
            <Label htmlFor="taxId">Tax ID</Label>
            <Input id="taxId" {...register("taxId")} />
          </div>
          <div>
            <Label htmlFor="address">Address</Label>
            <Input id="address" {...register("address")} />
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" {...register("notes")} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Create `CustomerTable.tsx`**

```tsx
"use client";

import { useTransition } from "react";
import { archiveCustomer } from "@/lib/actions/customers";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { CustomerFormDialog } from "./CustomerFormDialog";

type Row = {
  id: string;
  name: string;
  country: string;
  contact_person: string;
  email: string;
  phone: string;
  tax_id: string;
  address: string;
  notes: string;
  is_archived: boolean;
};

export function CustomerTable({ rows }: { rows: Row[] }) {
  const [pending, startTransition] = useTransition();

  function toggleArchive(id: string, current: boolean) {
    startTransition(() => archiveCustomer(id, !current));
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Country</TableHead>
          <TableHead>Contact</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell>{r.name}</TableCell>
            <TableCell>{r.country || "—"}</TableCell>
            <TableCell>{r.contact_person || "—"}</TableCell>
            <TableCell>{r.email || "—"}</TableCell>
            <TableCell>{r.is_archived ? "Archived" : "Active"}</TableCell>
            <TableCell className="space-x-2">
              <CustomerFormDialog
                mode="edit"
                initial={{
                  id: r.id,
                  name: r.name,
                  country: r.country,
                  contactPerson: r.contact_person,
                  email: r.email,
                  phone: r.phone,
                  taxId: r.tax_id,
                  address: r.address,
                  notes: r.notes,
                }}
                trigger={<Button size="sm" variant="outline">Edit</Button>}
              />
              <Button size="sm" variant="ghost" disabled={pending} onClick={() => toggleArchive(r.id, r.is_archived)}>
                {r.is_archived ? "Unarchive" : "Archive"}
              </Button>
            </TableCell>
          </TableRow>
        ))}
        {rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-slate-500 py-8">No customers yet.</TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
```

- [ ] **Step 3: Create `page.tsx`**

```tsx
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { CustomerFormDialog } from "./CustomerFormDialog";
import { CustomerTable } from "./CustomerTable";

export default async function CustomersPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, country, contact_person, email, phone, tax_id, address, notes, is_archived")
    .order("name");
  if (error) throw new Error(error.message);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Customers</h1>
        <CustomerFormDialog mode="create" trigger={<Button>New customer</Button>} />
      </div>
      <div className="bg-white rounded-lg shadow">
        <CustomerTable rows={data ?? []} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify + commit**

```bash
cd ~/trading-erp && npm run build 2>&1 | tail -3
git add src/app/\(app\)/customers/
git commit -m "feat(customers): CRUD page (list + form dialog + table)"
```

---

## Task 6: `InlinePartnerCreateDialog` shared component

**Files:**
- Create: `~/trading-erp/src/components/forms/InlinePartnerCreateDialog.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";

import { useState, useTransition } from "react";
import { createSupplier } from "@/lib/actions/suppliers";
import { createCustomer } from "@/lib/actions/customers";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  mode: "supplier" | "customer";
  onCreated: (partner: { id: string; name: string }) => void;
  trigger: React.ReactNode;
};

export function InlinePartnerCreateDialog({ mode, onCreated, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const action = mode === "supplier" ? createSupplier : createCustomer;
        const created = await action({
          name,
          country,
          contactPerson: "",
          email: "",
          phone: "",
          taxId: "",
          address: "",
          notes: "",
        });
        onCreated(created);
        setOpen(false);
        setName("");
        setCountry("");
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  const title = mode === "supplier" ? "New supplier" : "New customer";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label htmlFor="partnerName">Name *</Label>
            <Input id="partnerName" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="partnerCountry">Country</Label>
            <Input id="partnerCountry" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. China" />
          </div>
          <p className="text-xs text-slate-500">
            Other contact info can be added later from the {mode === "supplier" ? "Suppliers" : "Customers"} page.
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending || !name.trim()}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify + commit**

```bash
cd ~/trading-erp && npm run build 2>&1 | tail -3
git add src/components/forms/InlinePartnerCreateDialog.tsx
git commit -m "feat(forms): InlinePartnerCreateDialog (2-field create for in-form use)"
```

---

## Task 7: `SupplierLinePicker` + `CustomerLinePicker`

**Files:**
- Create: `~/trading-erp/src/components/forms/SupplierLinePicker.tsx`
- Create: `~/trading-erp/src/components/forms/CustomerLinePicker.tsx`

- [ ] **Step 1: Create `SupplierLinePicker.tsx`**

```tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { InlinePartnerCreateDialog } from "./InlinePartnerCreateDialog";

export type Partner = { id: string; name: string; country: string };

type Props = {
  value: string | null;
  onChange: (id: string | null, name: string) => void;
  initialPartners: Partner[];
};

export function SupplierLinePicker({ value, onChange, initialPartners }: Props) {
  const [partners, setPartners] = useState<Partner[]>(initialPartners);
  const supabase = createClient();

  async function refreshPartners() {
    const { data } = await supabase
      .from("suppliers")
      .select("id, name, country")
      .eq("is_archived", false)
      .order("name");
    if (data) setPartners(data);
  }

  async function handleCreated(p: { id: string; name: string }) {
    await refreshPartners();
    onChange(p.id, p.name);
  }

  return (
    <div className="flex gap-1 items-center">
      <Select
        value={value ?? null}
        onValueChange={(v) => {
          if (v !== null) {
            const found = partners.find((p) => p.id === v);
            onChange(v, found?.name ?? "");
          }
        }}
      >
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="Select supplier…">
            {(val: string | null) => {
              if (!val) return "Select supplier…";
              const p = partners.find((x) => x.id === val);
              return p ? (p.country ? `${p.name} — ${p.country}` : p.name) : val;
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {partners.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.country ? `${p.name} — ${p.country}` : p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <InlinePartnerCreateDialog
        mode="supplier"
        onCreated={handleCreated}
        trigger={
          <button
            type="button"
            title="Add new supplier"
            className="shrink-0 h-8 w-8 rounded-lg border border-input text-blue-600 hover:bg-slate-100 text-sm font-semibold"
          >
            +
          </button>
        }
      />
    </div>
  );
}
```

- [ ] **Step 2: Create `CustomerLinePicker.tsx`**

Same shape as `SupplierLinePicker.tsx`, with these replacements:
- Class name `SupplierLinePicker` → `CustomerLinePicker`
- `.from("suppliers")` → `.from("customers")`
- Placeholder text "Select supplier…" → "Select customer…"
- `mode="supplier"` → `mode="customer"`
- Button title "Add new supplier" → "Add new customer"

Full file:
```tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { InlinePartnerCreateDialog } from "./InlinePartnerCreateDialog";

export type Partner = { id: string; name: string; country: string };

type Props = {
  value: string | null;
  onChange: (id: string | null, name: string) => void;
  initialPartners: Partner[];
  disabled?: boolean;  // used by ReturnFields when linked to sale
};

export function CustomerLinePicker({ value, onChange, initialPartners, disabled }: Props) {
  const [partners, setPartners] = useState<Partner[]>(initialPartners);
  const supabase = createClient();

  async function refreshPartners() {
    const { data } = await supabase
      .from("customers")
      .select("id, name, country")
      .eq("is_archived", false)
      .order("name");
    if (data) setPartners(data);
  }

  async function handleCreated(p: { id: string; name: string }) {
    await refreshPartners();
    onChange(p.id, p.name);
  }

  return (
    <div className="flex gap-1 items-center">
      <Select
        value={value ?? null}
        disabled={disabled}
        onValueChange={(v) => {
          if (v !== null) {
            const found = partners.find((p) => p.id === v);
            onChange(v, found?.name ?? "");
          }
        }}
      >
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="Select customer…">
            {(val: string | null) => {
              if (!val) return "Select customer…";
              const p = partners.find((x) => x.id === val);
              return p ? (p.country ? `${p.name} — ${p.country}` : p.name) : val;
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {partners.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.country ? `${p.name} — ${p.country}` : p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {!disabled && (
        <InlinePartnerCreateDialog
          mode="customer"
          onCreated={handleCreated}
          trigger={
            <button
              type="button"
              title="Add new customer"
              className="shrink-0 h-8 w-8 rounded-lg border border-input text-blue-600 hover:bg-slate-100 text-sm font-semibold"
            >
              +
            </button>
          }
        />
      )}
    </div>
  );
}
```

(Note the `disabled` prop on `CustomerLinePicker` — used in T11 when the RETURN is linked to a sale. SupplierLinePicker doesn't need a disabled state because the Purchase form never locks the supplier.)

- [ ] **Step 3: Verify + commit**

```bash
cd ~/trading-erp && npm run build 2>&1 | tail -3
git add src/components/forms/SupplierLinePicker.tsx src/components/forms/CustomerLinePicker.tsx
git commit -m "feat(forms): SupplierLinePicker + CustomerLinePicker with inline create"
```

---

## Task 8: Update `transactionInputSchema` — add FK fields

**Files:**
- Modify: `~/trading-erp/src/lib/schemas/transaction.ts`

- [ ] **Step 1: Add `supplierId` to PURCHASE; `customerId` to SALE and RETURN**

The file currently has separate `purchaseSchema`, `saleSchema`, `returnSchema` etc. inside the discriminated union. Add the optional FK fields to each.

Find:
```ts
const purchaseSchema = z.object({
  type: z.literal("PURCHASE"),
  ...baseFields,
  currencyCode: currencyCodeSchema,
  lines: z.array(purchaseLineSchema).min(1),
  cashLegs: z.array(cashLegSchema).min(1),
});
```

Change to (just add the new line):
```ts
const purchaseSchema = z.object({
  type: z.literal("PURCHASE"),
  ...baseFields,
  currencyCode: currencyCodeSchema,
  lines: z.array(purchaseLineSchema).min(1),
  cashLegs: z.array(cashLegSchema).min(1),
  supplierId: uuid.nullable().default(null),
});
```

Find:
```ts
const saleSchema = z.object({
  type: z.literal("SALE"),
  ...baseFields,
  currencyCode: currencyCodeSchema,
  lines: z.array(saleLineSchema).min(1),
  cashLegs: z.array(cashLegSchema).min(1),
});
```

Change to:
```ts
const saleSchema = z.object({
  type: z.literal("SALE"),
  ...baseFields,
  currencyCode: currencyCodeSchema,
  lines: z.array(saleLineSchema).min(1),
  cashLegs: z.array(cashLegSchema).min(1),
  customerId: uuid.nullable().default(null),
});
```

Find:
```ts
const returnSchema = z.object({
  type: z.literal("RETURN"),
  ...baseFields,
  currencyCode: currencyCodeSchema,
  fromTransactionId: uuid.nullable().default(null),
  lines: z.array(returnLineSchema).min(1),
  cashLegs: z.array(cashLegSchema).default([]),
});
```

Change to:
```ts
const returnSchema = z.object({
  type: z.literal("RETURN"),
  ...baseFields,
  currencyCode: currencyCodeSchema,
  fromTransactionId: uuid.nullable().default(null),
  lines: z.array(returnLineSchema).min(1),
  cashLegs: z.array(cashLegSchema).default([]),
  customerId: uuid.nullable().default(null),
});
```

TRANSFER, ADJUSTMENT, FX_CONVERSION schemas are unchanged.

- [ ] **Step 2: Verify + commit**

```bash
cd ~/trading-erp && npm run lint && npm run build 2>&1 | tail -3
git add src/lib/schemas/transaction.ts
git commit -m "feat(schemas): add supplierId/customerId to PURCHASE/SALE/RETURN"
```

Expected: lint clean, build succeeds (no consumers yet — the field is optional).

---

## Task 9: Update `createTransaction` — write FK columns

**Files:**
- Modify: `~/trading-erp/src/lib/actions/transactions.ts`

- [ ] **Step 1: Add FK columns to the parent insert**

Find the existing `.insert({...})` for the transactions table inside `createTransaction`. It currently looks like:
```ts
const { data: txRow, error: txErr } = await supabase
  .from("transactions")
  .insert({
    type: parsed.type,
    occurred_at: parsed.occurredAt.toISOString(),
    currency_code: txCurrency,
    counterparty_name: parsed.counterpartyName,
    notes: parsed.type === "ADJUSTMENT" ? parsed.reason : parsed.notes,
    from_transaction_id: parsed.type === "RETURN" ? parsed.fromTransactionId : null,
    reverses_transaction_id: null,
    created_by: user?.id ?? null,
  })
  .select("id")
  .single();
```

Add the two new columns:
```ts
const { data: txRow, error: txErr } = await supabase
  .from("transactions")
  .insert({
    type: parsed.type,
    occurred_at: parsed.occurredAt.toISOString(),
    currency_code: txCurrency,
    counterparty_name: parsed.counterpartyName,
    notes: parsed.type === "ADJUSTMENT" ? parsed.reason : parsed.notes,
    from_transaction_id: parsed.type === "RETURN" ? parsed.fromTransactionId : null,
    reverses_transaction_id: null,
    supplier_id: parsed.type === "PURCHASE" ? parsed.supplierId : null,
    customer_id:
      parsed.type === "SALE" || parsed.type === "RETURN" ? parsed.customerId : null,
    created_by: user?.id ?? null,
  })
  .select("id")
  .single();
```

- [ ] **Step 2: Verify + commit**

```bash
cd ~/trading-erp && npm run lint && npm run build 2>&1 | tail -3
git add src/lib/actions/transactions.ts
git commit -m "feat(actions): createTransaction writes supplier_id + customer_id"
```

---

## Task 10: Wire `SupplierLinePicker` into PurchaseFields

**Files:**
- Modify: `~/trading-erp/src/components/forms/PurchaseFields.tsx`

- [ ] **Step 1: Add imports**

Add to existing imports:
```tsx
import { SupplierLinePicker, type Partner } from "./SupplierLinePicker";
```

- [ ] **Step 2: Replace `counterparty` state with `(supplierId, counterpartyName)` pair**

Find the existing `const [counterparty, setCounterparty] = useState("");`. Replace with:
```tsx
const [supplierId, setSupplierId] = useState<string | null>(null);
const [counterpartyName, setCounterpartyName] = useState("");
```

- [ ] **Step 3: Accept `suppliers` prop**

Find the props destructure:
```tsx
}: {
  skus: Sku[]; warehouses: Warehouse[]; cashAccounts: CashAccount[];
  onChange: (data: Partial<TransactionInput>) => void;
})
```

Change to:
```tsx
}: {
  skus: Sku[]; warehouses: Warehouse[]; cashAccounts: CashAccount[];
  suppliers: Partner[];
  onChange: (data: Partial<TransactionInput>) => void;
})
```

- [ ] **Step 4: Update the Supplier input in the JSX**

Find the existing Supplier field:
```tsx
        <div>
          <Label>Supplier</Label>
          <Input value={counterparty} onChange={(e) => setCounterparty(e.target.value)} />
        </div>
```

Replace with:
```tsx
        <div>
          <Label>Supplier</Label>
          <SupplierLinePicker
            value={supplierId}
            onChange={(id, name) => {
              setSupplierId(id);
              setCounterpartyName(name);
            }}
            initialPartners={suppliers}
          />
        </div>
```

- [ ] **Step 5: Update the `useEffect` payload to parent**

Find the existing `onChange({...})` call inside the useEffect. It includes `counterpartyName: counterparty,`. Replace with:
```tsx
      counterpartyName,
      supplierId,
```

And add `counterpartyName, supplierId` to the dependency array of that useEffect.

The full payload should now be:
```tsx
    onChange({
      type: "PURCHASE",
      counterpartyName,
      supplierId,
      currencyCode: currency,
      lines: lines.filter(/* ... */).map(/* ... */),
      cashLegs: cashLegs.filter(/* ... */).map(/* ... */),
    } as Partial<TransactionInput>);
```

And the dependency array:
```tsx
}, [counterpartyName, supplierId, currency, lines, cashLegs, onChange]);
```

- [ ] **Step 6: Verify + commit**

```bash
cd ~/trading-erp && npm run build 2>&1 | tail -3
git add src/components/forms/PurchaseFields.tsx
git commit -m "feat(purchase): supplier picker replaces free-text input"
```

---

## Task 11: Wire `CustomerLinePicker` into SaleFields

**Files:**
- Modify: `~/trading-erp/src/components/forms/SaleFields.tsx`

- [ ] **Step 1: Apply the same pattern as Task 10 but for customers**

a) Add imports:
```tsx
import { CustomerLinePicker, type Partner } from "./CustomerLinePicker";
```

b) Replace state `const [counterparty, setCounterparty] = useState("");` with:
```tsx
const [customerId, setCustomerId] = useState<string | null>(null);
const [counterpartyName, setCounterpartyName] = useState("");
```

c) Accept `customers` prop in props destructure:
```tsx
}: {
  skus: Sku[]; warehouses: Warehouse[]; cashAccounts: CashAccount[];
  customers: Partner[];
  onChange: (data: Partial<TransactionInput>) => void;
})
```

d) Replace the Customer Input JSX:
```tsx
        <div>
          <Label>Customer</Label>
          <CustomerLinePicker
            value={customerId}
            onChange={(id, name) => {
              setCustomerId(id);
              setCounterpartyName(name);
            }}
            initialPartners={customers}
          />
        </div>
```

e) Update the `useEffect` payload. The existing useEffect currently passes `counterpartyName: counterparty` and depends on `counterparty`. Replace the relevant lines so the payload becomes:

```tsx
    onChange({
      type: "SALE",
      counterpartyName,
      customerId,
      currencyCode: currency,
      lines: lines.filter((l) => l.skuId && l.warehouseId && l.qty && l.unit_price).map((l) => ({
        skuId: l.skuId, warehouseId: l.warehouseId, qty: Number(l.qty), unit_price: l.unit_price,
      })),
      cashLegs: cashLegs.filter((c) => c.cashAccountId && c.amount),
    } as Partial<TransactionInput>);
  }, [counterpartyName, customerId, currency, lines, cashLegs, onChange]);
```

- [ ] **Step 2: Verify + commit**

```bash
cd ~/trading-erp && npm run build 2>&1 | tail -3
git add src/components/forms/SaleFields.tsx
git commit -m "feat(sale): customer picker replaces free-text input"
```

---

## Task 12: Wire `CustomerLinePicker` into ReturnFields with lock

**Files:**
- Modify: `~/trading-erp/src/components/forms/ReturnFields.tsx`

- [ ] **Step 1: Add imports + accept customers prop**

```tsx
import { CustomerLinePicker, type Partner } from "./CustomerLinePicker";
```

Add `customers: Partner[]` to the props destructure.

- [ ] **Step 2: Replace counterparty state**

Find the existing `const [counterparty, setCounterparty] = useState("");`. Replace with:
```tsx
const [customerId, setCustomerId] = useState<string | null>(null);
const [counterpartyName, setCounterpartyName] = useState("");
```

- [ ] **Step 3: Update `loadSale` to populate customer from linked sale**

Find the existing `loadSale` function. After it sets `counterparty` from the sale, also fetch the sale's `customer_id`. Update the function:

```tsx
  async function loadSale(id: string) {
    setLinkedSaleId(id);
    if (!id) {
      setLinkedSaleSummary(null);
      setCustomerId(null);
      return;
    }
    const { data: tx } = await supabase.from("transactions")
      .select("id, counterparty_name, occurred_at, currency_code, customer_id")
      .eq("id", id).single();
    const { data: moves } = await supabase.from("stock_movements")
      .select("sku_id, warehouse_id, qty_delta, unit_cost_minor")
      .eq("transaction_id", id);
    if (!tx) return;
    setLinkedSaleSummary({
      id: tx.id,
      counterparty_name: tx.counterparty_name,
      occurred_at: tx.occurred_at,
      currency_code: tx.currency_code ?? "",
      lines: (moves ?? []).map((m) => ({
        sku_id: m.sku_id,
        warehouse_id: m.warehouse_id,
        qty: Math.abs(m.qty_delta),
        unit_price_minor: String(m.unit_cost_minor),
      })),
    });
    setCounterpartyName(tx.counterparty_name);
    setCustomerId(tx.customer_id ?? null);
    if (tx.currency_code) setCurrency(tx.currency_code as CurrencyCode);
    setLines((moves ?? []).map((m) => ({
      skuId: m.sku_id,
      warehouseId: m.warehouse_id,
      qty: String(Math.abs(m.qty_delta)),
      unit_price: "",
      intoDamaged: false,
      maxQty: Math.abs(m.qty_delta),
    })));
  }
```

- [ ] **Step 4: Replace the Customer Input JSX**

Find the existing customer Input that has `disabled={!!linkedSaleId}` already. Replace with:

```tsx
        <div>
          <Label>Customer</Label>
          <CustomerLinePicker
            value={customerId}
            onChange={(id, name) => {
              setCustomerId(id);
              setCounterpartyName(name);
            }}
            initialPartners={customers}
            disabled={!!linkedSaleId}
          />
        </div>
```

- [ ] **Step 5: Update the `useEffect` payload**

Replace the existing `counterpartyName: counterparty,` (or similar) in the payload with `counterpartyName, customerId,` and add both to the dependency array.

- [ ] **Step 6: Verify + commit**

```bash
cd ~/trading-erp && npm run build 2>&1 | tail -3
git add src/components/forms/ReturnFields.tsx
git commit -m "feat(return): customer picker (locked when linked to sale)"
```

---

## Task 13: Update `/new` page to fetch suppliers + customers

**Files:**
- Modify: `~/trading-erp/src/app/(app)/new/page.tsx`

- [ ] **Step 1: Add two queries to the parallel fetch**

Find the existing `Promise.all` that fetches SKUs / warehouses / cash accounts:

```tsx
  const [{ data: skus }, { data: warehouses }, { data: cashAccounts }] = await Promise.all([
    supabase.from("skus").select("id, code, name").eq("is_archived", false).order("code"),
    supabase.from("warehouses").select("id, name, is_damaged").order("name"),
    supabase.from("cash_accounts").select("id, name, currency_code").eq("is_archived", false).order("name"),
  ]);
```

Replace with:
```tsx
  const [
    { data: skus },
    { data: warehouses },
    { data: cashAccounts },
    { data: suppliers },
    { data: customers },
  ] = await Promise.all([
    supabase.from("skus").select("id, code, name").eq("is_archived", false).order("code"),
    supabase.from("warehouses").select("id, name, is_damaged").order("name"),
    supabase.from("cash_accounts").select("id, name, currency_code").eq("is_archived", false).order("name"),
    supabase.from("suppliers").select("id, name, country").eq("is_archived", false).order("name"),
    supabase.from("customers").select("id, name, country").eq("is_archived", false).order("name"),
  ]);
```

- [ ] **Step 2: Pass new arrays into NewTransactionForm**

Find:
```tsx
      <NewTransactionForm
        skus={skus ?? []}
        warehouses={warehouses ?? []}
        cashAccounts={cashAccounts ?? []}
      />
```

Replace with:
```tsx
      <NewTransactionForm
        skus={skus ?? []}
        warehouses={warehouses ?? []}
        cashAccounts={cashAccounts ?? []}
        suppliers={suppliers ?? []}
        customers={customers ?? []}
      />
```

- [ ] **Step 3: Update `NewTransactionForm` to accept + forward the props**

Open `src/components/forms/NewTransactionForm.tsx`. Import `Partner` from one of the pickers (single source of truth — the `Partner` type is exported from both `SupplierLinePicker` and `CustomerLinePicker`; we pick one):

```tsx
import { type Partner } from "./SupplierLinePicker";
```

Update its Props type and destructure:

```tsx
type Sku = { id: string; code: string; name: string };
type Warehouse = { id: string; name: string; is_damaged: boolean };
type CashAccount = { id: string; name: string; currency_code: string };

type Props = {
  skus: Sku[];
  warehouses: Warehouse[];
  cashAccounts: CashAccount[];
  suppliers: Partner[];
  customers: Partner[];
};

export function NewTransactionForm({ skus, warehouses, cashAccounts, suppliers, customers }: Props) {
```

Pass `suppliers` to `<PurchaseFields>` and `customers` to `<SaleFields>` and `<ReturnFields>`:

```tsx
      {type === "PURCHASE" && (
        <PurchaseFields skus={skus} warehouses={warehouses} cashAccounts={cashAccounts} suppliers={suppliers} onChange={setTypedData} />
      )}
      {type === "SALE" && (
        <SaleFields skus={skus} warehouses={warehouses} cashAccounts={cashAccounts} customers={customers} onChange={setTypedData} />
      )}
      {type === "RETURN" && (
        <ReturnFields skus={skus} warehouses={warehouses} cashAccounts={cashAccounts} customers={customers} onChange={setTypedData} />
      )}
```

(TRANSFER, ADJUSTMENT, FX_CONVERSION still don't need partners. Leave their `<XxxFields ... />` calls unchanged.)

- [ ] **Step 4: Verify + commit**

```bash
cd ~/trading-erp && npm run build 2>&1 | tail -3
git add src/app/\(app\)/new/page.tsx src/components/forms/NewTransactionForm.tsx
git commit -m "feat(new): fetch + pass suppliers/customers to forms"
```

---

## Task 14: Sidebar — add Suppliers + Customers entries

**Files:**
- Modify: `~/trading-erp/src/components/AppSidebar.tsx`

- [ ] **Step 1: Add two entries to NAV**

Find the existing `const NAV = [...]` array. Insert two new entries after the existing "Cash accounts" entry:
```tsx
const NAV = [
  { href: "/", label: "Overview" },
  { href: "/new", label: "New transaction" },
  { href: "/transactions", label: "Transactions" },
  { href: "/skus", label: "SKUs" },
  { href: "/cash-accounts", label: "Cash accounts" },
  { href: "/suppliers", label: "Suppliers" },
  { href: "/customers", label: "Customers" },
];
```

- [ ] **Step 2: Verify + commit**

```bash
cd ~/trading-erp && npm run build 2>&1 | tail -3
git add src/components/AppSidebar.tsx
git commit -m "feat(nav): add Suppliers and Customers sidebar entries"
```

---

## Task 15: Transaction detail page — show linked partner name

**Files:**
- Modify: `~/trading-erp/src/app/(app)/transactions/[id]/page.tsx`

- [ ] **Step 1: Fetch linked partner alongside other data**

Find the existing `Promise.all` that fetches stock_movements / cash_movements / skus / warehouses / cash_accounts. Right after that block (since it depends on `tx.supplier_id` / `tx.customer_id`), add two more queries:

```tsx
  const linkedSupplier = tx.supplier_id
    ? (await supabase.from("suppliers").select("id, name").eq("id", tx.supplier_id).maybeSingle()).data
    : null;
  const linkedCustomer = tx.customer_id
    ? (await supabase.from("customers").select("id, name").eq("id", tx.customer_id).maybeSingle()).data
    : null;
```

- [ ] **Step 2: Update the counterparty display**

Find the line that currently displays `tx.counterparty_name`:
```tsx
        <div><strong>Counterparty:</strong> {tx.counterparty_name || "—"}</div>
```

Replace with:
```tsx
        <div>
          <strong>Counterparty:</strong>{" "}
          {linkedSupplier
            ? `${linkedSupplier.name} (Supplier)`
            : linkedCustomer
            ? `${linkedCustomer.name} (Customer)`
            : tx.counterparty_name || "—"}
        </div>
```

- [ ] **Step 3: Verify + commit**

```bash
cd ~/trading-erp && npm run build 2>&1 | tail -3
git add src/app/\(app\)/transactions/\[id\]/page.tsx
git commit -m "feat(transactions): detail page shows linked partner name"
```

---

## Task 16: Deploy + smoke test

**Files:** none (operator action + verification)

- [ ] **Step 1: Final pre-push verification**

```bash
cd ~/trading-erp
npm run lint 2>&1 | tail -3
npm test 2>&1 | tail -3
npm run build 2>&1 | tail -5
```

Expected: lint clean (one pre-existing warning OK), 34 tests pass, build succeeds with `/suppliers` and `/customers` in the route table.

- [ ] **Step 2: Push**

```bash
git push
```

- [ ] **Step 3: Wait for Vercel + curl check**

```bash
sleep 90
echo "/login (200):"; curl -s -m 15 -o /dev/null -w "  HTTP %{http_code}\n" https://trading-erp-five.vercel.app/login
echo "/suppliers (307):"; curl -s -m 15 -o /dev/null -w "  HTTP %{http_code}\n" https://trading-erp-five.vercel.app/suppliers
echo "/customers (307):"; curl -s -m 15 -o /dev/null -w "  HTTP %{http_code}\n" https://trading-erp-five.vercel.app/customers
```

Expected: /login 200, /suppliers and /customers each 307 (redirect to /login).

- [ ] **Step 4: OPERATOR — manual end-to-end smoke test**

Sign in at https://trading-erp-five.vercel.app/ and:

1. **Suppliers CRUD**: Visit `/suppliers` → "New supplier" → name `Acme Supplier` + country `China` → Save. Edit it → fill in contact_person, email, phone → Save. Archive it → status flips to Archived. Unarchive it.

2. **Customers CRUD**: Same flow at `/customers` with `Test Customer` + country `Taiwan`.

3. **PURCHASE with picker**: `/new` → PURCHASE tab → pick the Acme Supplier from the new picker → set currency CNY → add a line + cash leg → Save. On the resulting detail page, "Counterparty" should show `Acme Supplier (Supplier)`.

4. **Inline-create on PURCHASE**: Open PURCHASE form again → click the `+` button next to the supplier picker → 2-field dialog → name `Quick Supplier 2` → Save. Should auto-select. Save the transaction.

5. **SALE with picker**: Same flow with the Customer picker on SALE.

6. **RETURN linked to sale**: `/new` → RETURN tab → paste the SALE's UUID (from step 5) → tab out → customer auto-populates from the sale and the picker is **disabled** (greyed out, no `+` button visible). Save.

7. **Pre-2.6 transactions**: Open a PURCHASE/SALE/RETURN from before this plan — counterparty should still display correctly via the free-text fallback (no link, just the typed name).

- [ ] **Step 5: Update CLAUDE.md**

Edit `~/trading-erp/CLAUDE.md`: change the Plan 2.6 row to `**shipped YYYY-MM-DD**` (today's date), and add a "What Plan 2.6 delivered" section. Then:

```bash
cd ~/trading-erp
git add CLAUDE.md
git commit -m "docs: mark plan 2.6 shipped + roadmap update"
git push
```

---

## End of Plan 2.6

**Acceptance check (from spec §9):**

- [ ] `suppliers` + `customers` tables with 11 columns each; RLS enabled.
- [ ] `transactions.supplier_id` + `customer_id` columns (nullable); partial indexes present.
- [ ] `/suppliers` works end-to-end (create with name only; create with all fields; edit; archive + unarchive).
- [ ] `/customers` works end-to-end (same).
- [ ] PURCHASE Supplier picker + inline-create + saves with both `supplier_id` and `counterparty_name`.
- [ ] SALE Customer picker + inline-create + saves with both `customer_id` and `counterparty_name`.
- [ ] RETURN customer picker disabled and pre-filled when linked to a sale; editable when unlinked.
- [ ] Sidebar shows Suppliers and Customers entries.
- [ ] Detail page shows linked partner name when FK is set; free-text fallback otherwise.
- [ ] Pre-2.6 transactions display correctly via free-text fallback.
- [ ] `npm test` passes (34 tests; no new tests required).
- [ ] `npm run build` and `npm run lint` clean.
- [ ] Deployed at `trading-erp-five.vercel.app` and the operator-facing smoke test passes.

When all are ticked, Plan 2.6 is shipped. Next: Plan 3 (Overview dashboard) — the final plan in Phase 1.
