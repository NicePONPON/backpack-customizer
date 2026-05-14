# Trading ERP — Phase 1, Plan 2.5 (Barcode + Bulk Scan) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add device-camera barcode/QR scanning with bulk-entry mode to the four transactional forms (PURCHASE, SALE, RETURN, TRANSFER), letting the operator scan many items in succession with auto-consolidation and unknown-code resolution.

**Architecture:** One new `skus.barcode` column (partial unique). A reusable `ScanModal` component (full-screen, mobile-first) opens from a "📷 Scan barcodes" button on each form; it owns the camera (`html5-qrcode`, lazy-imported), accumulates tally rows in local state, and on Done merges into the parent form's line items via a pure `mergeTally()` function. Unknown codes become placeholder rows resolved via a "Map to existing SKU / Create new SKU with this barcode" dialog before submit is allowed.

**Tech Stack:** Same as Plans 1 + 2 — Next.js 16 App Router, React 19, TypeScript, Supabase, Tailwind v4, shadcn/ui on `@base-ui/react`, Vitest. Adds `html5-qrcode` (~85kb gzipped, lazy-imported).

**Reference spec:** `docs/superpowers/specs/2026-05-14-trading-erp-phase-1-plan-2.5-barcode-scan-design.md`

**Working directory:** `~/trading-erp`

---

## Task 1: Migration `0004_add_barcode_to_skus`

**Files:**
- Create: `~/trading-erp/supabase/migrations/0004_add_barcode_to_skus.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0004_add_barcode_to_skus.sql`:
```sql
alter table skus add column barcode text;

create unique index idx_skus_barcode on skus (barcode)
  where barcode is not null;
```

- [ ] **Step 2: Apply to remote DB (operator action — pause here if no auth)**

```bash
cd ~/trading-erp && supabase db push --yes
```

If the subagent's shell doesn't have `SUPABASE_ACCESS_TOKEN`/`SUPABASE_DB_PASSWORD` env vars, stop with `NEEDS_CONTEXT` — the controller handles the auth and re-dispatches. The controller is the one who can apply the migration.

- [ ] **Step 3: Regenerate types**

```bash
cd ~/trading-erp && npm run db:types
```

Confirm `grep -c "barcode" src/lib/supabase/database.types.ts` returns ≥ 3 (Row, Insert, Update).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0004_add_barcode_to_skus.sql src/lib/supabase/database.types.ts
git commit -m "feat(db): add skus.barcode with partial unique index"
```

---

## Task 2: Extend zod SKU schema with `barcode`

**Files:**
- Modify: `~/trading-erp/src/lib/schemas/sku.ts`

- [ ] **Step 1: Add the field**

In `src/lib/schemas/sku.ts`, update `skuInputSchema`:

```ts
import { z } from "zod";

export const skuInputSchema = z.object({
  code: z.string().trim().min(1, "Code is required").max(50),
  name: z.string().trim().min(1, "Name is required").max(120),
  description: z.string().trim().max(500).default(""),
  isCustom: z.boolean().default(false),
  barcode: z.string().trim().max(50).nullable().optional(),
});

export type SkuInput = z.infer<typeof skuInputSchema>;
```

(Add only the `barcode` line; keep everything else.)

- [ ] **Step 2: Verify build + tests**

```bash
cd ~/trading-erp && npm run lint && npm test 2>&1 | tail -3 && npm run build 2>&1 | tail -3
```

Expected: lint clean (1 pre-existing warning), 29 tests pass, build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/lib/schemas/sku.ts
git commit -m "feat(schemas): optional barcode field on SkuInput"
```

---

## Task 3: Update SKU server actions to handle `barcode`

**Files:**
- Modify: `~/trading-erp/src/lib/actions/skus.ts`

- [ ] **Step 1: Update `createSku`**

The function already exists from Plan 2 (returns `{id, code, name}` after the inline-create fix). Update the insert to include `barcode`:

```ts
export async function createSku(input: SkuInput): Promise<{ id: string; code: string; name: string }> {
  const parsed = skuInputSchema.parse(input);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from("skus").insert({
    code: parsed.code,
    name: parsed.name,
    description: parsed.description,
    is_custom: parsed.isCustom,
    barcode: parsed.barcode ?? null,
    created_by: user?.id ?? null,
  }).select("id, code, name").single();
  if (error) throw new Error(error.message);
  revalidatePath("/skus");
  return data;
}
```

Only the `barcode: parsed.barcode ?? null,` line is added. Everything else is unchanged.

- [ ] **Step 2: Update `updateSku`**

```ts
export async function updateSku(id: string, input: SkuInput) {
  const parsed = skuInputSchema.parse(input);
  const supabase = await createClient();
  const { error } = await supabase
    .from("skus")
    .update({
      code: parsed.code,
      name: parsed.name,
      description: parsed.description,
      is_custom: parsed.isCustom,
      barcode: parsed.barcode ?? null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/skus");
}
```

Same — only the new `barcode` line is added.

- [ ] **Step 3: Add `findSkuByBarcode`**

Append to the file:

```ts
export async function findSkuByBarcode(
  barcode: string,
): Promise<{ id: string; code: string; name: string } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("skus")
    .select("id, code, name")
    .eq("barcode", barcode)
    .eq("is_archived", false)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
```

- [ ] **Step 4: Verify and commit**

```bash
cd ~/trading-erp && npm run lint && npm run build 2>&1 | tail -3
git add src/lib/actions/skus.ts
git commit -m "feat(actions): SKU create/update accept barcode; add findSkuByBarcode"
```

---

## Task 4: Extend SkuFormDialog with the Barcode field

**Files:**
- Modify: `~/trading-erp/src/app/(app)/skus/SkuFormDialog.tsx`

- [ ] **Step 1: Add the field to the form**

Inside the dialog form (after the description input), insert a Barcode input. Locate the existing block where description is rendered and add immediately after:

```tsx
<div>
  <Label htmlFor="barcode">Barcode / QR code (optional)</Label>
  <Input
    id="barcode"
    {...register("barcode")}
    placeholder="e.g. 4901234567894"
  />
  {errors.barcode && <p className="text-sm text-red-600">{errors.barcode.message}</p>}
</div>
```

Also update the `defaultValues` to include `barcode`. Find the `useForm` call and update its defaults:

```tsx
defaultValues: initial ?? { code: "", name: "", description: "", isCustom: false, barcode: "" },
```

If you have an `initial` for edit mode, also map `initial.barcode` from the DB row. The page that renders the dialog needs to pass it; see next step.

- [ ] **Step 2: Update the SkuTable to pass the barcode through**

In `src/app/(app)/skus/SkuTable.tsx`, the `Row` type and the `initial` prop passed to `SkuFormDialog` need to include barcode. Open the file and:

a) Update `Row` type:
```ts
type Row = {
  id: string;
  code: string;
  name: string;
  description: string;
  is_custom: boolean;
  is_archived: boolean;
  barcode: string | null;
};
```

b) Update the SkuFormDialog `initial` mapping to include barcode (currently maps id/code/name/description/isCustom; add `barcode: r.barcode ?? ""`).

- [ ] **Step 3: Update the SKU page query**

In `src/app/(app)/skus/page.tsx`, update the select to include `barcode`:

```ts
const { data, error } = await supabase
  .from("skus")
  .select("id, code, name, description, is_custom, is_archived, barcode")
  .order("created_at", { ascending: false });
```

- [ ] **Step 4: Verify build + commit**

```bash
cd ~/trading-erp && npm run lint && npm run build 2>&1 | tail -3
git add src/app/\(app\)/skus/
git commit -m "feat(skus): expose Barcode field in create/edit dialog"
```

---

## Task 5: TDD — `lib/barcode/mergeTally.ts`

**Files:**
- Create: `~/trading-erp/src/lib/barcode/mergeTally.ts`
- Create: `~/trading-erp/src/lib/barcode/__tests__/mergeTally.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/barcode/__tests__/mergeTally.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { mergeTally, type TallyRow, type FormLine } from "@/lib/barcode/mergeTally";

describe("mergeTally", () => {
  it("returns the tally as new form lines when existing is empty", () => {
    const tally: TallyRow[] = [
      { skuId: "sku-1", warehouseId: "wh-1", qty: 3 },
      { skuId: "sku-2", warehouseId: "wh-1", qty: 1 },
    ];
    const result = mergeTally([], tally);
    expect(result).toEqual([
      { skuId: "sku-1", warehouseId: "wh-1", qty: 3, unit_price: "" },
      { skuId: "sku-2", warehouseId: "wh-1", qty: 1, unit_price: "" },
    ]);
  });

  it("merges by (skuId, warehouseId) and preserves existing unit_price", () => {
    const existing: FormLine[] = [
      { skuId: "sku-1", warehouseId: "wh-1", qty: 2, unit_price: "10.00" },
    ];
    const tally: TallyRow[] = [
      { skuId: "sku-1", warehouseId: "wh-1", qty: 3 },
    ];
    const result = mergeTally(existing, tally);
    expect(result).toEqual([
      { skuId: "sku-1", warehouseId: "wh-1", qty: 5, unit_price: "10.00" },
    ]);
  });

  it("keeps same-SKU different-warehouse rows separate", () => {
    const existing: FormLine[] = [
      { skuId: "sku-1", warehouseId: "wh-1", qty: 2, unit_price: "10.00" },
    ];
    const tally: TallyRow[] = [
      { skuId: "sku-1", warehouseId: "wh-2", qty: 3 },
    ];
    const result = mergeTally(existing, tally);
    expect(result).toEqual([
      { skuId: "sku-1", warehouseId: "wh-1", qty: 2, unit_price: "10.00" },
      { skuId: "sku-1", warehouseId: "wh-2", qty: 3, unit_price: "" },
    ]);
  });

  it("does not mutate the input arrays", () => {
    const existing: FormLine[] = [
      { skuId: "sku-1", warehouseId: "wh-1", qty: 2, unit_price: "10.00" },
    ];
    const tally: TallyRow[] = [{ skuId: "sku-1", warehouseId: "wh-1", qty: 3 }];
    const existingSnapshot = JSON.stringify(existing);
    const tallySnapshot = JSON.stringify(tally);
    mergeTally(existing, tally);
    expect(JSON.stringify(existing)).toBe(existingSnapshot);
    expect(JSON.stringify(tally)).toBe(tallySnapshot);
  });

  it("handles multiple tally rows merging into different existing lines", () => {
    const existing: FormLine[] = [
      { skuId: "sku-1", warehouseId: "wh-1", qty: 2, unit_price: "10.00" },
      { skuId: "sku-2", warehouseId: "wh-1", qty: 1, unit_price: "20.00" },
    ];
    const tally: TallyRow[] = [
      { skuId: "sku-1", warehouseId: "wh-1", qty: 3 },
      { skuId: "sku-2", warehouseId: "wh-1", qty: 2 },
      { skuId: "sku-3", warehouseId: "wh-1", qty: 1 },
    ];
    const result = mergeTally(existing, tally);
    expect(result).toEqual([
      { skuId: "sku-1", warehouseId: "wh-1", qty: 5, unit_price: "10.00" },
      { skuId: "sku-2", warehouseId: "wh-1", qty: 3, unit_price: "20.00" },
      { skuId: "sku-3", warehouseId: "wh-1", qty: 1, unit_price: "" },
    ]);
  });
});
```

- [ ] **Step 2: Confirm failure**

```bash
cd ~/trading-erp && npm test
```

Expected: tests fail because `@/lib/barcode/mergeTally` doesn't exist.

- [ ] **Step 3: Implement `mergeTally.ts`**

Create `src/lib/barcode/mergeTally.ts`:
```ts
export type TallyRow = {
  skuId: string;
  warehouseId: string;
  qty: number;
};

export type FormLine = {
  skuId: string;
  warehouseId: string;
  qty: number;
  unit_price: string;
};

/**
 * Pure merge: given existing form line items and a tally of scanned items,
 * return a new array of form lines where matching (skuId, warehouseId) pairs
 * have their qty summed and existing unit_price preserved; new pairs are
 * appended with unit_price: "".
 *
 * Does not mutate the inputs.
 */
export function mergeTally(existing: FormLine[], tally: TallyRow[]): FormLine[] {
  const result: FormLine[] = existing.map((l) => ({ ...l }));
  for (const t of tally) {
    const idx = result.findIndex(
      (l) => l.skuId === t.skuId && l.warehouseId === t.warehouseId,
    );
    if (idx >= 0) {
      result[idx] = { ...result[idx], qty: result[idx].qty + t.qty };
    } else {
      result.push({
        skuId: t.skuId,
        warehouseId: t.warehouseId,
        qty: t.qty,
        unit_price: "",
      });
    }
  }
  return result;
}
```

- [ ] **Step 4: Verify pass**

```bash
cd ~/trading-erp && npm test
```

Expected: all mergeTally tests pass; total now 29 + 5 = 34.

- [ ] **Step 5: Commit**

```bash
git add src/lib/barcode/
git commit -m "feat: mergeTally pure function for scan modal -> form merge"
```

---

## Task 6: Install `html5-qrcode`

**Files:**
- Modify: `~/trading-erp/package.json`

- [ ] **Step 1: Install**

```bash
cd ~/trading-erp && npm install html5-qrcode
```

- [ ] **Step 2: Verify**

```bash
grep html5-qrcode ~/trading-erp/package.json
```

Should print a line including `"html5-qrcode": "^X.Y.Z"`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add html5-qrcode for camera scanning"
```

---

## Task 7: `ScanResolveDialog` component

**Files:**
- Create: `~/trading-erp/src/components/forms/ScanResolveDialog.tsx`

- [ ] **Step 1: Create the file**

Create `src/components/forms/ScanResolveDialog.tsx`:
```tsx
"use client";

import { useState, useTransition } from "react";
import { createSku, updateSku, findSkuByBarcode } from "@/lib/actions/skus";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Sku = { id: string; code: string; name: string };

type Props = {
  unknownCode: string;
  skus: Sku[];
  onResolved: (sku: Sku) => void;
  trigger: React.ReactNode;
};

export function ScanResolveDialog({ unknownCode, skus, onResolved, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"map" | "create">("map");
  // Map mode state
  const [selectedSkuId, setSelectedSkuId] = useState<string>("");
  // Create mode state
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleMap() {
    setError(null);
    startTransition(async () => {
      try {
        const target = skus.find((s) => s.id === selectedSkuId);
        if (!target) throw new Error("Pick a SKU first");
        // Save the barcode to that SKU so future scans resolve.
        await updateSku(selectedSkuId, {
          code: target.code,
          name: target.name,
          description: "",
          isCustom: false,
          barcode: unknownCode,
        });
        onResolved(target);
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      try {
        const created = await createSku({
          code: newCode,
          name: newName,
          description: "",
          isCustom: false,
          barcode: unknownCode,
        });
        onResolved(created);
        setOpen(false);
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
          <DialogTitle>Resolve barcode</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-600">
          Scanned code: <span className="font-mono">{unknownCode}</span>
        </p>

        <div className="flex gap-2">
          <label className="flex items-center gap-1 text-sm">
            <input type="radio" checked={mode === "map"} onChange={() => setMode("map")} />
            Map to existing SKU
          </label>
          <label className="flex items-center gap-1 text-sm">
            <input type="radio" checked={mode === "create"} onChange={() => setMode("create")} />
            Create new SKU
          </label>
        </div>

        {mode === "map" ? (
          <div className="space-y-2">
            <Label>SKU</Label>
            <Select value={selectedSkuId ?? null} onValueChange={(v) => { if (v !== null) setSelectedSkuId(v); }}>
              <SelectTrigger>
                <SelectValue placeholder="Pick a SKU…">
                  {(val: string | null) => {
                    if (!val) return "Pick a SKU…";
                    const s = skus.find((x) => x.id === val);
                    return s ? `${s.code} — ${s.name}` : val;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {skus.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.code} — {s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">
              The barcode will be saved to this SKU so future scans resolve automatically.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div>
              <Label htmlFor="newCode">Code</Label>
              <Input id="newCode" value={newCode} onChange={(e) => setNewCode(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="newName">Name</Label>
              <Input id="newName" value={newName} onChange={(e) => setNewName(e.target.value)} required />
            </div>
            <p className="text-xs text-slate-500">
              The scanned barcode <span className="font-mono">{unknownCode}</span> will be saved to this new SKU.
            </p>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          {mode === "map" ? (
            <Button onClick={handleMap} disabled={pending || !selectedSkuId}>
              {pending ? "Saving…" : "Map"}
            </Button>
          ) : (
            <Button onClick={handleCreate} disabled={pending || !newCode || !newName}>
              {pending ? "Creating…" : "Create"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

(Note: `findSkuByBarcode` import isn't used inside this component but exists for completeness in actions/skus. Remove the import if lint complains.)

- [ ] **Step 2: Verify build + commit**

```bash
cd ~/trading-erp && npm run build 2>&1 | tail -3
git add src/components/forms/ScanResolveDialog.tsx
git commit -m "feat(scan): ScanResolveDialog for unknown barcode rows"
```

---

## Task 8: `ScanTallyTable` component

**Files:**
- Create: `~/trading-erp/src/components/forms/ScanTallyTable.tsx`

- [ ] **Step 1: Create the file**

Create `src/components/forms/ScanTallyTable.tsx`:
```tsx
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScanResolveDialog } from "./ScanResolveDialog";

type Sku = { id: string; code: string; name: string };

export type TallyEntry = {
  skuId: string | null;  // null = unknown, scannedCode is set
  scannedCode: string | null;  // null = manually added without scan
  qty: number;
};

type Props = {
  entries: TallyEntry[];
  onChange: (next: TallyEntry[]) => void;
  skus: Sku[];
  onSkusUpdated: () => Promise<void>;  // called after Resolve creates/maps a SKU
};

export function ScanTallyTable({ entries, onChange, skus, onSkusUpdated }: Props) {
  function updateQty(i: number, qty: number) {
    if (qty < 1) return;
    onChange(entries.map((e, j) => (j === i ? { ...e, qty } : e)));
  }
  function removeRow(i: number) {
    onChange(entries.filter((_, j) => j !== i));
  }

  async function handleResolved(i: number, sku: Sku) {
    await onSkusUpdated();
    onChange(entries.map((e, j) => (j === i ? { ...e, skuId: sku.id, scannedCode: null } : e)));
  }

  if (entries.length === 0) {
    return <p className="text-sm text-slate-500 italic">No items yet — start scanning or use Add manually.</p>;
  }

  return (
    <div className="space-y-1">
      {entries.map((e, i) => {
        const isUnknown = e.skuId === null;
        const sku = e.skuId ? skus.find((s) => s.id === e.skuId) : null;
        return (
          <div key={i} className="flex gap-2 items-center text-sm">
            <div className="flex-1">
              {isUnknown ? (
                <span className="text-amber-600">?? <span className="font-mono">{e.scannedCode}</span></span>
              ) : (
                <span className="font-mono">{sku?.code ?? e.skuId} — {sku?.name ?? ""}</span>
              )}
            </div>
            <span className="text-slate-500">×</span>
            <Input
              type="number"
              min={1}
              value={e.qty}
              onChange={(ev) => updateQty(i, Number(ev.target.value) || 1)}
              className="w-20 text-right"
            />
            {isUnknown && e.scannedCode && (
              <ScanResolveDialog
                unknownCode={e.scannedCode}
                skus={skus}
                onResolved={(sku) => handleResolved(i, sku)}
                trigger={<Button type="button" size="sm" variant="outline">Resolve…</Button>}
              />
            )}
            <Button type="button" size="sm" variant="ghost" onClick={() => removeRow(i)}>✕</Button>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verify build + commit**

```bash
cd ~/trading-erp && npm run build 2>&1 | tail -3
git add src/components/forms/ScanTallyTable.tsx
git commit -m "feat(scan): ScanTallyTable subcomponent for running tally"
```

---

## Task 9: `ScanModal` — skeleton (no camera yet)

**Files:**
- Create: `~/trading-erp/src/components/forms/ScanModal.tsx`

- [ ] **Step 1: Create the file with shell + warehouse picker + tally + bottom bar**

Create `src/components/forms/ScanModal.tsx`:
```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ScanTallyTable, type TallyEntry } from "./ScanTallyTable";
import { SkuLinePicker } from "./SkuLinePicker";
import type { TallyRow } from "@/lib/barcode/mergeTally";

type Sku = { id: string; code: string; name: string };
type Warehouse = { id: string; name: string; is_damaged: boolean };

type Props = {
  open: boolean;
  onClose: () => void;
  onDone: (rows: TallyRow[]) => void;
  initialSkus: Sku[];
  warehouses: Warehouse[];
  defaultWarehouseId?: string;
};

export function ScanModal({
  open, onClose, onDone, initialSkus, warehouses, defaultWarehouseId,
}: Props) {
  const [skus, setSkus] = useState<Sku[]>(initialSkus);
  const [warehouseId, setWarehouseId] = useState<string>(defaultWarehouseId ?? "");
  const [entries, setEntries] = useState<TallyEntry[]>([]);
  const [scanning, setScanning] = useState(true);
  const [lastRead, setLastRead] = useState<string | null>(null);

  // Manual add row state
  const [manualSkuId, setManualSkuId] = useState<string>("");
  const [manualQty, setManualQty] = useState<string>("1");

  const supabase = createClient();

  async function refreshSkus() {
    const { data } = await supabase
      .from("skus")
      .select("id, code, name")
      .eq("is_archived", false)
      .order("code");
    if (data) setSkus(data);
  }

  function addManually() {
    if (!manualSkuId) return;
    const qty = Math.max(1, Number(manualQty) || 1);
    // Consolidate by SKU if already present
    setEntries((prev) => {
      const idx = prev.findIndex((e) => e.skuId === manualSkuId);
      if (idx >= 0) {
        return prev.map((e, j) => (j === idx ? { ...e, qty: e.qty + qty } : e));
      }
      return [...prev, { skuId: manualSkuId, scannedCode: null, qty }];
    });
    setManualSkuId("");
    setManualQty("1");
  }

  function handleDone() {
    if (!warehouseId) return;
    // Build TallyRow[] for the merge; skip any still-unknown rows (Done should be disabled, but guard anyway).
    const rows: TallyRow[] = entries
      .filter((e) => e.skuId !== null)
      .map((e) => ({
        skuId: e.skuId as string,
        warehouseId,
        qty: e.qty,
      }));
    onDone(rows);
    setEntries([]);
    onClose();
  }

  function handleCancel() {
    setEntries([]);
    onClose();
  }

  const hasUnknown = entries.some((e) => e.skuId === null);
  const doneDisabled = entries.length === 0 || hasUnknown || !warehouseId;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between p-3 border-b">
        <Button variant="ghost" onClick={handleCancel}>✕ Close</Button>
        <span className="text-sm">{scanning ? "Scanning…" : "Paused"}</span>
        <Button
          variant={scanning ? "default" : "outline"}
          onClick={() => setScanning((s) => !s)}
        >
          {scanning ? "⏸ Stop" : "▶ Start"}
        </Button>
      </div>

      {/* Warehouse picker */}
      <div className="p-3 border-b">
        <label className="text-xs text-slate-500 mr-2">Warehouse for this session:</label>
        <Select value={warehouseId ?? null} onValueChange={(v) => { if (v !== null) setWarehouseId(v); }}>
          <SelectTrigger className="w-48 inline-flex">
            <SelectValue placeholder="Pick a warehouse">
              {(val: string | null) => {
                if (!val) return "Pick a warehouse";
                const w = warehouses.find((x) => x.id === val);
                return w?.name ?? val;
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {warehouses.map((w) => (
              <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Camera placeholder — replaced in Task 10 */}
      <div className="flex-1 flex items-center justify-center bg-slate-100 m-3 rounded">
        <p className="text-slate-500">Camera coming in Task 10</p>
      </div>

      {/* Last read feedback */}
      {lastRead && (
        <div className="px-3 pb-2 text-xs text-slate-500">Last read: <span className="font-mono">{lastRead}</span></div>
      )}

      {/* Tally */}
      <div className="border-t p-3 max-h-64 overflow-y-auto">
        <h3 className="text-xs font-semibold mb-2">Tally</h3>
        <ScanTallyTable
          entries={entries}
          onChange={setEntries}
          skus={skus}
          onSkusUpdated={refreshSkus}
        />
        <div className="mt-3 pt-3 border-t flex gap-2 items-center">
          <span className="text-xs text-slate-500">Add manually:</span>
          <div className="flex-1"><SkuLinePicker value={manualSkuId} onChange={setManualSkuId} initialSkus={skus} /></div>
          <input
            type="number"
            min={1}
            value={manualQty}
            onChange={(e) => setManualQty(e.target.value)}
            className="w-20 text-right border rounded px-2 py-1 text-sm"
          />
          <Button type="button" size="sm" onClick={addManually}>Add</Button>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t p-3 flex justify-between">
        <Button variant="ghost" onClick={handleCancel}>Cancel</Button>
        <Button onClick={handleDone} disabled={doneDisabled}>
          Done ({entries.filter((e) => e.skuId !== null).length})
          {hasUnknown && " — resolve unknowns first"}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build + commit**

```bash
cd ~/trading-erp && npm run build 2>&1 | tail -3
git add src/components/forms/ScanModal.tsx
git commit -m "feat(scan): ScanModal skeleton — warehouse picker, tally, manual add"
```

---

## Task 10: `ScanModal` — wire `html5-qrcode` camera + detection

**Files:**
- Modify: `~/trading-erp/src/components/forms/ScanModal.tsx`

- [ ] **Step 1: Replace the camera placeholder with the live camera**

Add at the top of `ScanModal.tsx` (after existing imports):

```tsx
import { findSkuByBarcode } from "@/lib/actions/skus";
import type { Html5Qrcode as Html5QrcodeType } from "html5-qrcode";
```

Add new refs + state inside the component (next to existing state):

```tsx
  const cameraDivRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<Html5QrcodeType | null>(null);
  const lastReadAtRef = useRef<Record<string, number>>({}); // code -> last-read ms
  const [cameraError, setCameraError] = useState<string | null>(null);
```

Replace the placeholder block:
```tsx
      {/* Camera placeholder — replaced in Task 10 */}
      <div className="flex-1 flex items-center justify-center bg-slate-100 m-3 rounded">
        <p className="text-slate-500">Camera coming in Task 10</p>
      </div>
```

with:
```tsx
      {/* Camera */}
      <div className="flex-1 flex items-center justify-center bg-black m-3 rounded overflow-hidden">
        {cameraError ? (
          <div className="text-center p-6 text-white">
            <p>{cameraError}</p>
            <p className="mt-2 text-xs opacity-75">Use Add manually below.</p>
          </div>
        ) : (
          <div id="scan-region" ref={cameraDivRef} className="w-full" />
        )}
      </div>
```

Add a new `useEffect` for camera lifecycle (paste below the existing `refreshSkus` function):

```tsx
  // Camera lifecycle
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function startCamera() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled || !cameraDivRef.current) return;
        const scanner = new Html5Qrcode("scan-region");
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 12,
            qrbox: { width: Math.min(window.innerWidth * 0.8, 420), height: Math.min(window.innerWidth * 0.5, 260) },
            aspectRatio: 1.6,
          },
          handleScanSuccess,
          undefined, // ignore per-frame errors
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Camera unavailable";
        setCameraError(msg);
      }
    }
    if (scanning) startCamera();
    return () => {
      cancelled = true;
      const s = scannerRef.current;
      if (s) {
        s.stop().catch(() => {}).finally(() => {
          s.clear();
          scannerRef.current = null;
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, scanning]);
```

Add the `handleScanSuccess` function inside the component (above `addManually`):

```tsx
  async function handleScanSuccess(decodedText: string) {
    const now = Date.now();
    const lastAt = lastReadAtRef.current[decodedText] ?? 0;
    if (now - lastAt < 1000) return; // 1s cooldown per code
    lastReadAtRef.current[decodedText] = now;
    setLastRead(decodedText);

    // Look up the SKU server-side
    try {
      const sku = await findSkuByBarcode(decodedText);
      if (sku) {
        // Consolidate or add new known row
        setEntries((prev) => {
          const idx = prev.findIndex((e) => e.skuId === sku.id);
          if (idx >= 0) return prev.map((e, j) => (j === idx ? { ...e, qty: e.qty + 1 } : e));
          return [...prev, { skuId: sku.id, scannedCode: null, qty: 1 }];
        });
      } else {
        // Unknown row — consolidate by scannedCode
        setEntries((prev) => {
          const idx = prev.findIndex((e) => e.skuId === null && e.scannedCode === decodedText);
          if (idx >= 0) return prev.map((e, j) => (j === idx ? { ...e, qty: e.qty + 1 } : e));
          return [...prev, { skuId: null, scannedCode: decodedText, qty: 1 }];
        });
      }
    } catch (err) {
      // Network/auth error: surface to operator but don't block
      setLastRead(`error: ${err instanceof Error ? err.message : "lookup failed"}`);
    }
  }
```

- [ ] **Step 2: Verify build + commit**

```bash
cd ~/trading-erp && npm run build 2>&1 | tail -5
git add src/components/forms/ScanModal.tsx
git commit -m "feat(scan): wire html5-qrcode camera with 1s cooldown per code"
```

---

## Task 11: Wire `📷 Scan barcodes` button into `PurchaseFields`

**Files:**
- Modify: `~/trading-erp/src/components/forms/PurchaseFields.tsx`

- [ ] **Step 1: Import dependencies**

Add to existing imports at the top of `PurchaseFields.tsx`:
```tsx
import { useState } from "react";  // already imported — keep
import { ScanModal } from "./ScanModal";
import { mergeTally, type TallyRow, type FormLine } from "@/lib/barcode/mergeTally";
```

- [ ] **Step 2: Add scan-modal state**

In the component body (after the existing `useState` declarations):
```tsx
const [scanOpen, setScanOpen] = useState(false);
```

- [ ] **Step 3: Add the `📷 Scan barcodes` button**

Locate the existing `+ Add line` button. Wrap it and the new button in a flex container:
```tsx
        <div className="flex justify-between items-center mb-2">
          <Label>Line items</Label>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm"
              onClick={() => setScanOpen(true)}>
              📷 Scan barcodes
            </Button>
            <Button type="button" variant="outline" size="sm"
              onClick={() => setLines([...lines, { skuId: "", warehouseId: "", qty: "", unit_price: "" }])}>
              + Add line
            </Button>
          </div>
        </div>
```

- [ ] **Step 4: Add the modal at the bottom of the JSX (before the closing `</div>`)**

```tsx
      <ScanModal
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onDone={(rows: TallyRow[]) => {
          // Convert string-qty lines into typed FormLine for merge
          const existingTyped: FormLine[] = lines
            .filter((l) => l.skuId && l.warehouseId)
            .map((l) => ({
              skuId: l.skuId,
              warehouseId: l.warehouseId,
              qty: Number(l.qty) || 0,
              unit_price: l.unit_price,
            }));
          const merged = mergeTally(existingTyped, rows);
          // Convert back into the string-qty Line shape used by the form
          setLines(
            merged.map((m) => ({
              skuId: m.skuId,
              warehouseId: m.warehouseId,
              qty: String(m.qty),
              unit_price: m.unit_price,
            })),
          );
        }}
        initialSkus={skus}
        warehouses={warehouses}
        defaultWarehouseId={lines.find((l) => l.warehouseId)?.warehouseId ?? liveWarehouses[0]?.id}
      />
```

- [ ] **Step 5: Verify build + commit**

```bash
cd ~/trading-erp && npm run build 2>&1 | tail -3
git add src/components/forms/PurchaseFields.tsx
git commit -m "feat(purchase): scan barcodes button + merge into line items"
```

---

## Task 12: Wire into `SaleFields`

**Files:**
- Modify: `~/trading-erp/src/components/forms/SaleFields.tsx`

- [ ] **Step 1: Add imports**

At the top of `SaleFields.tsx`, add to existing imports:
```tsx
import { ScanModal } from "./ScanModal";
import { mergeTally, type TallyRow, type FormLine } from "@/lib/barcode/mergeTally";
```

- [ ] **Step 2: Add scan-modal state**

After the existing `useState` declarations in the component body:
```tsx
const [scanOpen, setScanOpen] = useState(false);
```

- [ ] **Step 3: Replace the `+ Add line` button with a button row**

Find the existing JSX that renders the Line items header and `+ Add line` button:

```tsx
        <div className="flex justify-between items-center mb-2">
          <Label>Line items</Label>
          <Button type="button" variant="outline" size="sm"
            onClick={() => setLines([...lines, { skuId: "", warehouseId: "", qty: "", unit_price: "" }])}>
            + Add line
          </Button>
        </div>
```

Replace with:
```tsx
        <div className="flex justify-between items-center mb-2">
          <Label>Line items</Label>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm"
              onClick={() => setScanOpen(true)}>
              📷 Scan barcodes
            </Button>
            <Button type="button" variant="outline" size="sm"
              onClick={() => setLines([...lines, { skuId: "", warehouseId: "", qty: "", unit_price: "" }])}>
              + Add line
            </Button>
          </div>
        </div>
```

- [ ] **Step 4: Add the modal at the bottom of the component's JSX (before the final closing `</div>`)**

```tsx
      <ScanModal
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onDone={(rows: TallyRow[]) => {
          const existingTyped: FormLine[] = lines
            .filter((l) => l.skuId && l.warehouseId)
            .map((l) => ({
              skuId: l.skuId,
              warehouseId: l.warehouseId,
              qty: Number(l.qty) || 0,
              unit_price: l.unit_price,
            }));
          const merged = mergeTally(existingTyped, rows);
          setLines(
            merged.map((m) => ({
              skuId: m.skuId,
              warehouseId: m.warehouseId,
              qty: String(m.qty),
              unit_price: m.unit_price,
            })),
          );
        }}
        initialSkus={skus}
        warehouses={warehouses}
        defaultWarehouseId={lines.find((l) => l.warehouseId)?.warehouseId ?? liveWarehouses[0]?.id}
      />
```

- [ ] **Step 5: Verify build + commit**

```bash
cd ~/trading-erp && npm run build 2>&1 | tail -3
git add src/components/forms/SaleFields.tsx
git commit -m "feat(sale): scan barcodes button + merge into line items"
```

---

## Task 13: Wire into `ReturnFields` (only when not linked)

**Files:**
- Modify: `~/trading-erp/src/components/forms/ReturnFields.tsx`

- [ ] **Step 1: Apply the pattern, conditional on `linkedSaleId`**

a) Add imports:
```tsx
import { ScanModal } from "./ScanModal";
import { mergeTally, type TallyRow, type FormLine } from "@/lib/barcode/mergeTally";
```

b) Add `const [scanOpen, setScanOpen] = useState(false);`.

c) Find the existing `+ Add line` button at the bottom of the line items block (it's only rendered when `!linkedSaleId`). Replace it with a flex container holding both buttons, but **only when `!linkedSaleId`**:

```tsx
        {!linkedSaleId && (
          <div className="mt-2 flex gap-2">
            <Button type="button" variant="outline" size="sm"
              onClick={() => setScanOpen(true)}>
              📷 Scan barcodes
            </Button>
            <Button type="button" variant="outline" size="sm"
              onClick={() => setLines([...lines, { skuId: "", warehouseId: "", qty: "", unit_price: "", intoDamaged: false }])}>
              + Add line
            </Button>
          </div>
        )}
```

d) Add the modal at the bottom. RETURN's `Line` shape adds `intoDamaged` — when merging, default that to `false` for new lines, preserve for existing:

```tsx
      <ScanModal
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onDone={(rows: TallyRow[]) => {
          const existingTyped: FormLine[] = lines
            .filter((l) => l.skuId && l.warehouseId)
            .map((l) => ({
              skuId: l.skuId,
              warehouseId: l.warehouseId,
              qty: Number(l.qty) || 0,
              unit_price: l.unit_price,
            }));
          const merged = mergeTally(existingTyped, rows);
          // Map back to ReturnLine shape (preserve intoDamaged from original if same skuId+warehouseId)
          setLines(
            merged.map((m) => {
              const orig = lines.find((l) => l.skuId === m.skuId && l.warehouseId === m.warehouseId);
              return {
                skuId: m.skuId,
                warehouseId: m.warehouseId,
                qty: String(m.qty),
                unit_price: m.unit_price,
                intoDamaged: orig?.intoDamaged ?? false,
              };
            }),
          );
        }}
        initialSkus={skus}
        warehouses={warehouses}
        defaultWarehouseId={lines.find((l) => l.warehouseId)?.warehouseId ?? liveWarehouses[0]?.id}
      />
```

- [ ] **Step 2: Verify build + commit**

```bash
cd ~/trading-erp && npm run build 2>&1 | tail -3
git add src/components/forms/ReturnFields.tsx
git commit -m "feat(return): scan barcodes button (unlinked returns only)"
```

---

## Task 14: Wire into `TransferFields`

**Files:**
- Modify: `~/trading-erp/src/components/forms/TransferFields.tsx`

- [ ] **Step 1: Apply the pattern, but TRANSFER lines have no warehouse on each line**

TransferFields' `Line` type is `{ skuId, qty }` — no per-line warehouse. The TRANSFER form has source/destination warehouses at the top. The scan modal's session warehouse becomes the **destination** for the merge.

a) Add imports:
```tsx
import { ScanModal } from "./ScanModal";
```

(We don't need `mergeTally` here because TRANSFER's merge is simpler — see step c.)

b) Add state: `const [scanOpen, setScanOpen] = useState(false);`.

c) Add the buttons alongside `+ Add line`:
```tsx
        <div className="flex justify-between items-center mb-2">
          <Label>Line items</Label>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm"
              onClick={() => setScanOpen(true)}>
              📷 Scan barcodes
            </Button>
            <Button type="button" variant="outline" size="sm"
              onClick={() => setLines([...lines, { skuId: "", qty: "" }])}>+ Add line</Button>
          </div>
        </div>
```

d) Add the modal:
```tsx
      <ScanModal
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onDone={(rows) => {
          // TRANSFER lines are just (skuId, qty); merge by SKU only.
          setLines((prev) => {
            const next = prev.map((l) => ({ ...l }));
            for (const r of rows) {
              const idx = next.findIndex((l) => l.skuId === r.skuId);
              if (idx >= 0) {
                next[idx] = { ...next[idx], qty: String((Number(next[idx].qty) || 0) + r.qty) };
              } else {
                next.push({ skuId: r.skuId, qty: String(r.qty) });
              }
            }
            return next;
          });
        }}
        initialSkus={skus}
        warehouses={warehouses}
        defaultWarehouseId={dst || warehouses.find((w) => !w.is_damaged)?.id}
      />
```

(Note: the modal's session "warehouse" picker shows; for TRANSFER the destination warehouse is what gets pre-selected. The session warehouse value is informational only when merging since TRANSFER lines don't carry one.)

- [ ] **Step 2: Verify build + commit**

```bash
cd ~/trading-erp && npm run build 2>&1 | tail -3
git add src/components/forms/TransferFields.tsx
git commit -m "feat(transfer): scan barcodes button"
```

---

## Task 15: Deploy + smoke test

**Files:** none (operator action)

- [ ] **Step 1: Push (Vercel auto-deploys)**

```bash
cd ~/trading-erp && git push
```

- [ ] **Step 2: Wait + curl check**

```bash
sleep 90
curl -s -m 15 -o /dev/null -w "HTTP %{http_code}\n" https://trading-erp-five.vercel.app/login
```

Expected: HTTP 200. /new and /transactions still 307 (redirect to /login).

- [ ] **Step 3: OPERATOR — exercise on a mobile device**

Open `https://trading-erp-five.vercel.app` on your phone:

1. Go to `/skus` → edit an existing SKU → put a real barcode in the new "Barcode / QR code" field (or use the GTIN printed on any consumer product you have at hand). Save.
2. Go to `/new` → PURCHASE tab → fill currency + supplier → click "📷 Scan barcodes".
3. Grant camera permission when prompted.
4. **Pick a warehouse** in the modal.
5. **Point at the SKU's barcode you set in step 1** → the tally should add `× 1` for that SKU. Scan again → qty becomes 2.
6. **Point at any unknown barcode** (a random product). It appears as `?? × <code>`. Click "Resolve…" → choose "Map to existing SKU" → pick an existing SKU → confirm. The row converts to that SKU.
7. **Click ⏸ Stop** to pause; tally edits don't trigger any new scans.
8. **Edit a qty** in the tally — should accept new value.
9. **Click "+ Add manually"** at the bottom → pick a SKU + qty → Add. Row appears in the tally.
10. **Click Done** → modal closes, line items table in the parent form now shows your scanned items.
11. **Fill in prices** for each line → Save → lands on the transaction detail page.
12. Verify the stock_movements + cash_movements rows in the detail page match what you scanned.

Repeat for SALE, RETURN (unlinked), TRANSFER as time allows.

- [ ] **Step 4: Update CLAUDE.md to mark Plan 2.5 shipped**

```bash
cd ~/trading-erp
# edit CLAUDE.md: change "Phase 1, Plan 2.5 — Barcode + bulk scan" row to "shipped YYYY-MM-DD"
git add CLAUDE.md
git commit -m "docs: mark plan 2.5 shipped"
git push
```

---

## End of Plan 2.5

**Acceptance check (from spec §9):**

- [ ] `skus.barcode` column exists, partial unique index enforces uniqueness.
- [ ] `/skus` create/edit dialog has the "Barcode / QR code" field.
- [ ] PURCHASE, SALE, RETURN (unlinked only), TRANSFER forms have the 📷 button.
- [ ] Continuous detection works on a mobile device; 1s cooldown verified.
- [ ] Unknown codes show as `?? × <code>` and the Done button disables until resolved.
- [ ] Resolve dialog: Map and Create paths both work.
- [ ] Manual entry works inside the modal.
- [ ] qty editable in tally; ✕ removes a row.
- [ ] Done merges into the parent form by (SKU, warehouse).
- [ ] Cancel + ✕ leave the form untouched.
- [ ] Camera permission denial shows the manual-entry fallback.
- [ ] `npm test` passes (34 total: 29 existing + 5 mergeTally tests).
- [ ] `npm run build` and `npm run lint` clean.
- [ ] Deployed at `trading-erp-five.vercel.app` and tested on at least one mobile device.

When the above are ticked, Plan 2.5 is shipped — move on to Plan 2.6 (Suppliers + Customers).
