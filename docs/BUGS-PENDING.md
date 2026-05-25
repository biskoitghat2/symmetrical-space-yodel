# Bug Audit & Pending Work

Full-codebase audit run **2026-05-25** across 4 parallel review streams (money/ledger, async/race, DB/migration, UI/keyboard). All CRITICAL items fixed and committed in this session; MEDIUM + LOW remain for the next session.

---

## ✅ Fixed in this session (CRITICAL)

### 1. Ledger gaps — stock mutations bedun-e inventory_movements
Repair receipt + production flows mutated `products.stock` without writing to `inventory_movements`, so `reconcileAllStocks` silently reverted every change on next reload.

- `store/dataStore.ts:378-392` — `addProduct` now writes an `OPENING_STOCK` movement when initial stock ≠ 0.
- `store/dataStore.ts:2553-2649` — `deleteProduction` (COMPLETED) calls `deleteInventoryMovementsByRef(production.id)` + reloads `inventoryMovements`.
- `store/dataStore.ts:2802-2940` — `deleteRepairReceipt` writes `RETURN_SALE` reversal movements for every restored used-part.
- `store/dataStore.ts:2942-3010` — `addUsedPart` validates stock FIRST (so insufficient-stock throw doesn't orphan a saved part), then writes `SALE` movement.
- `store/dataStore.ts:3012-3062` — `removeUsedPart` writes `RETURN_SALE` reversal movement.

### 2. convertToInvoice atomicity + Check field bugs
- `store/dataStore.ts:3065-3296` — Removed the premature optimistic `set(...status: 'DELIVERED', invoiceId: 'PENDING')` that ran before any DB write (~15 awaits could throw and leave UI showing DELIVERED, DB still REPAIRED).
- Linked checks now write the correct `{ refInvoiceId: invoice.id }` instead of `{ invoiceId, status: 'RECEIVED' as CheckStatus }`. The previous cast hid the fact that `'RECEIVED'` is not in the `CheckStatus = 'PENDING' | 'PASSED' | 'RETURNED'` enum, AND the FK column is `refInvoiceId`, not `invoiceId`.

### 3. Date sorting — raw Persian date comparison
- `components/Dashboard.tsx:140` and `components/Inventory.tsx:51` now wrap both sides in `normalizePersianDate()` before `localeCompare`. Raw comparison broke for unpadded `"1404/12/5"` vs `"1404/2/15"`.

### 4. Delete FK guards (Tauri `FOREIGN KEY constraint failed` crashes)
- `store/dataStore.ts:625-680` — `deleteCustomer` now blocks deletion when the customer has any rows in the `transactions` table (`transactions.customerId REFERENCES customers(id) ON DELETE RESTRICT`).
- `store/dataStore.ts:2222-2360` — `deleteInvoice` nulls out `repair_receipts.invoiceId` for every repair receipt pointing at the invoice (REPAIR-type invoices created via `convertToInvoice` set this FK), then reloads `repairReceipts` in the post-delete refresh.

### 5. WebDatabase `INSERT OR REPLACE` / `OR IGNORE`
- `services/WebDatabase.ts:72-101` — Implemented upsert on first listed column (PK by convention: `id`, or `key` for the `settings` table). Without this, `saveSettings` would grow the `settings` table unbounded in browser mode and `getSettings` would re-apply every old row in order.

### 6. Native `window.confirm()` removed
- `components/forms/InvoiceForm.tsx` — `handleClearAll` uses themed `confirm` (`variant: 'danger'`). Over-payment confirmation moved out of `validateAndBuild` into `handleSubmit` → calls themed `confirm` → `proceedSubmit(after)` on accept.
- `components/forms/ProductForm.tsx:238-263` — `handleAddUnit` uses themed confirm with both `onConfirm`/`onCancel` branches (yes = decimal unit, cancel = integer unit).
- `components/forms/ProductForm.tsx:333-347` — Sell-price-less-than-buy warning uses themed `warning` confirm with a re-entry pattern (`_priceWarningAccepted` flag on synthetic event).

### 7. Global hotkey gating
- `components/Calculator.tsx:120-160` — Keydown listener now early-returns unless the Calculator window is the active non-minimized window. Previously, digits/Backspace/Enter typed in any other form were swallowed and `e.preventDefault()`-ed.
- `components/Dashboard.tsx:21-58` — F2/F3/F4/F8 now early-return when any window is open OR `currentPage !== 'dashboard'`. Previously F2 inside an open InvoiceForm spawned a second invoice.

### 8. ConfirmModal upgrade
- `components/ui/ConfirmModal.tsx` — Raised to `z-[30000]` so confirms triggered from inside `ProductSearchModal` / `CustomerSearchModal` (z-[10000]) or `ConfirmDuplicateModal` (z-[20000]) are no longer trapped behind. Added `warning` variant, `onCancel` callback, Esc/Enter keyboard shortcuts. Switched from `animate-pop-in` to `animate-modal-open`. `ConfirmOptions` updated in `store/uiStore.ts:13-21`.

---

## 🟡 Pending (MEDIUM) — next session

### Stale state caches in `dataStore.ts` actions
- **`addInvoice` ~1605-1612** — Stock validation reads from `state.products` captured before the `withTransaction` queue ran. Two concurrent SALE invoices for the same product can both pass validation. Re-fetch fresh stock inside the queue.
- **`addCheck` / `updateCheck` / `updateCheckStatus` / `deleteCheck`** (lines 744-789, 798, 909, 1127) — Capture `customer` outside `withTransaction`. If a queued op modifies that customer's balance first, the new balance overwrites the prior change. Re-fetch inside the queue.

### DB layer
- **`deleteProduct` (446-515)** — Relies on `ON DELETE CASCADE` for `inventory_movements`. WebDatabase doesn't honor FKs → orphan movement rows survive in browser mode. Add explicit `DELETE FROM inventory_movements WHERE productId=$1` before deleting the product. (Tauri is fine.)
- **`DatabaseService.updateBankAccount` (1048-1058)** — Writes `account.openingBalance ?? 0`. Any caller forgetting to pass `openingBalance` silently zeros it, breaking reconciliation. Fix: read existing row first, or throw if missing.
- **`DatabaseService.derivedBankBalance` (1125-1138)** — Passes 6 params for one `$1` placeholder. Tauri/sqlx may reject extra params depending on version. Fix: pass `[accountId]` only.

### Async / hook races
- **`App.tsx:174-205`** — `initializeApp` `useEffect` with `[]` deps. Under React StrictMode (active in `index.tsx:19`), runs twice in dev. The `isSubscribed` flag guards state setters but doesn't prevent the in-flight init from continuing against a `DatabaseService.close()`-ed DB. Use a module-level `isInitializing` flag or a ref.
- **`hooks/useDraft.ts:8-17`** — Initial draft load races with form `initialData` population (CustomerForm:31, ProductForm:168, TaskForm:33). Switch to lazy initial state: `useState(() => JSON.parse(localStorage.getItem(draftKey)) ?? initialState)`.

### Raw money arithmetic (violates §5 of architecture skill)
- `components/forms/InvoiceForm.tsx:374` — `totals.itemsDiscount + formState.finalDiscount` → use `moneyAdd`.
- `components/forms/InvoiceForm.tsx:583` — `(item.unitPrice - item.buyPriceSnapshot) * item.quantity` (display) → use `calcItemProfit`.
- `components/forms/ProductionForm.tsx:106` — `qty * item.unitPrice` → use `moneyMul`.
- `services/LedgerService.ts:56` — `movements.reduce((a, m) => a + m.quantityChange, 0)` → use `moneySum(movements.map(m => m.quantityChange))`. Affects decimal-unit products (kg/m).

### UI standards violations
- **Native `<input type="checkbox">` as boolean toggle** — `components/forms/ProductionForm.tsx:350` + `ProductionSimulation.tsx:222` ("داخلی؟"). Use `<Toggle>` per app standard.
- **Modals at `z-50` inside Windows** (below the app modal stack `z-[200]+`): `RepairReceiptPrintModal.tsx:57`, `Workshop.tsx:34`, `ProductionForm.tsx:466`, `ProductionSimulation.tsx:329`, `RepairReceiptForm.tsx:984, 1324`, `ProjectManager.tsx:590`. Raise each to at least `z-[200]`.
- **`NotificationPanel.tsx:41` vs `ToastContainer.tsx:12`** both at `z-[100]` — toasts overlap panel unpredictably.
- **Dates rendered with `font-mono` instead of `font-date`** — `CustomerCardex.tsx:219, 221, 299`, `ProductCardex.tsx:194`, `NotificationPanel.tsx:81`. Breaks tabular alignment.
- **No focus-restore on modal close** anywhere — modals drop focus to `<body>`. Pattern: save `document.activeElement` on open, restore on close.

### convertToInvoice double-click guard followup
The pre-fix had a `set(... status: 'DELIVERED', invoiceId: 'PENDING')` that doubled as a double-click guard. After the atomicity fix that guard is gone. Bring it back as an in-memory `Set<string>` of in-flight receipt IDs, OR verify `RepairReceiptForm`'s `submitting` flag is sufficient.

---

## 🟢 Pending (LOW)

- **~40 raw `new Decimal(...)` in `store/dataStore.ts`** — Numerically correct (Decimal-backed) but violates §5 convention. Bypasses the `num()` NaN guard.
- **`SettingsForm.tsx:42-44, 101-108, 187-190`** — 3× `setTimeout(reload)` with no cleanup. If form unmounts before timeout, reload still fires.
- **`AdjustStockForm.tsx:53`** — `updateProductStock(...)` promise discarded; window closes before DB confirm.
- **`WebDatabase.ts:13-18`** — `KNOWN_COLUMNS` contains `barcode` which is never added as a migration. Future genuine `barcode` migration would be silently skipped. Remove or document.
- **`RepairReceiptForm.tsx:1277`** — Cosmetic check-prefill drift from raw arithmetic.

---

## ✓ Verified clean during audit (no findings)

- All 13 migrations idempotent + self-consistent (no destructive ALTERs).
- All CRUD parameter counts match their placeholders.
- All bool/JSON columns coerced on read (`isDebtor`, `isCompleted`, `isGuest`, `images`, `items`, `linkedCheckIds`, `pricingStrategy`, `rawMaterials`, `costs`, `usedParts`, `tags`, `details`, `notes`, `photos`).
- No native `<select>` anywhere — all use `Select`.
- All `space-x-*` paired with `space-x-reverse`.
- No JOIN / GROUP BY / multi-condition WHERE / OR / LIMIT in reads that would silently break WebDatabase.
- `clearAllData` delete order respects all FK RESTRICT constraints.
- All centered modals correctly use `animate-modal-open` / `animate-pop-in`.

---

## How to resume

Tackle the MEDIUM list in order — they're prioritized roughly by correctness impact:
1. Stale state caches first (real concurrency bugs)
2. DB layer fixes (`deleteProduct` browser orphans, `updateBankAccount` openingBalance, `derivedBankBalance` extra params)
3. Hook races (`App.tsx` StrictMode, `useDraft`)
4. Raw money arithmetic
5. UI standards (native checkboxes → Toggle, z-50 modals, font-date, focus restore)

Then sweep LOW items for hygiene.
