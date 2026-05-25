# 🚨 CRITICAL FIX - Tauri v2 Configuration

## ⚡ The Problem

Two critical errors:
1. `TypeError: Cannot read properties of undefined (reading 'invoke')` - Database can't connect
2. `TypeError: Cannot read properties of undefined (reading 'metadata')` - Window API not available

## ✅ The Solution

### 1. Fixed `src-tauri/tauri.conf.json`

**CRITICAL CHANGE**: Set `withGlobalTauri` to `true`

```json
"app": {
  "withGlobalTauri": true  // ← This is CRITICAL for Tauri v2!
}
```

Without this, Tauri v2 cannot access window APIs and plugins won't work.

### 2. Updated `services/DatabaseService.ts`

Changed database name to `hesabflow.db`:

```typescript
this.db = await Database.load('sqlite:hesabflow.db');
```

### 3. `App.tsx` - Already Correct

The code was already correct, just needed the config fix:

```typescript
import { getCurrentWindow } from '@tauri-apps/api/window';
const appWindow = getCurrentWindow();
await appWindow.close();
```

## 🚨 IMPORTANT: You MUST Restart!

The `withGlobalTauri` change requires a COMPLETE restart:

```bash
# 1. Stop the running app (Ctrl+C in terminal)
# 2. Wait for process to fully stop
# 3. Restart:
npm run tauri dev
```

## ✅ Expected Console Output

After restart, you should see:

```
🔄 Loading database...
✅ Database loaded
✅ Tables created
✅ Database initialized successfully
✅ All data loaded from database
✅ Close handler registered
```

## ❌ Errors That Should Be GONE

- ❌ `Cannot read properties of undefined (reading 'invoke')`
- ❌ `Cannot read properties of undefined (reading 'metadata')`
- ❌ `Not in Tauri environment, skipping...`

## 🧪 Test After Restart

1. **Database Test**: Add product → close app → reopen → product still exists ✅
2. **Close Button Test**: Click X → app closes immediately ✅
3. **Notification Test**: Add product with stock=0 → see notification ✅

## 🔧 If Still Not Working

```bash
cd src-tauri
cargo clean
cargo build
cd ..
npm run tauri dev
```

## 📊 Summary

| File | Change | Status |
|------|--------|--------|
| `tauri.conf.json` | `withGlobalTauri: true` | ✅ Done |
| `DatabaseService.ts` | DB name: `hesabflow.db` | ✅ Done |
| `App.tsx` | Already correct | ✅ Needs restart |

## 🎉 Success!

After complete restart:
- ✅ Database initializes without errors
- ✅ Data saves and persists
- ✅ Close button works
- ✅ Notifications appear
- ✅ No invoke or metadata errors

**Remember: MUST restart completely for changes to take effect!**
