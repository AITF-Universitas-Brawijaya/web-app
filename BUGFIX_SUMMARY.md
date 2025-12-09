# Bug Fixes - Domain Generator Errors

**Date:** 2025-12-09  
**Status:** ✅ Fixed and Deployed

## Issues Identified

Based on the console errors from the Domain Generator modal:

### 1. ❌ API Endpoint Error (404)
```
POST https://nghbz6f39eg4xx-80.proxy.runpod.net/undefined/api/crawler/start 404 (Not Found)
```

**Root Cause:** `NEXT_PUBLIC_API_URL` was `undefined` in `CrawlingModal.tsx`, causing the API endpoint to be `undefined/api/crawler/start`.

**Fix Applied:** Changed line 8 in `CrawlingModal.tsx`:
```typescript
// Before
const API_BASE = process.env.NEXT_PUBLIC_API_URL

// After
const API_BASE = process.env.NEXT_PUBLIC_API_URL || ""
```

This ensures the API uses relative URLs (handled by Nginx proxy) when `NEXT_PUBLIC_API_URL` is not set, consistent with other components in the application.

---

### 2. ❌ Vercel Analytics 404 Error
```
GET https://nghbz6f39eg4xx-80.proxy.runpod.net/_vercel/insights/script.js net::ERR_ABORTED 404 (Not Found)
[Vercel Web Analytics] Failed to load script from /_vercel/insights/script.js
```

**Root Cause:** Vercel Analytics was included in the application but not configured for the RunPod deployment environment.

**Fix Applied:** Removed Vercel Analytics from `layout.tsx`:
- Removed import: `import { Analytics } from '@vercel/analytics/next'`
- Removed component: `<Analytics />`

---

### 3. ⚠️ Accessibility Warning
```
Warning: Missing `Description` or `aria-describedby={undefined}` for {DialogContent}.
```

**Root Cause:** The `CrawlingModal` Dialog component was missing an accessibility description required by Radix UI.

**Fix Applied:** Added `DialogDescription` component:
```typescript
// Added import
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/Dialog"

// Added to DialogHeader
<DialogHeader>
    <DialogTitle>Domain Generator</DialogTitle>
    <DialogDescription>
        Configure and generate domains for phishing detection
    </DialogDescription>
</DialogHeader>
```

---

## Files Modified

1. **`/frontend/src/components/modals/CrawlingModal.tsx`**
   - Fixed `API_BASE` undefined issue
   - Added `DialogDescription` for accessibility

2. **`/frontend/src/app/layout.tsx`**
   - Removed Vercel Analytics import and component

---

## Deployment Steps Completed

1. ✅ Built frontend with fixes: `npm run build`
2. ✅ Restarted PM2 frontend process: `pm2 restart prd-analyst-frontend`

---

## Testing Recommendations

After deployment, verify:

1. **Domain Generator Modal:**
   - Open the Domain Generator modal
   - Click "Generate" button
   - Verify the API endpoint is called correctly (should be `/api/crawler/start` via Nginx proxy)
   - Check browser console for errors

2. **Console Errors:**
   - No more `undefined/api/crawler/start` errors
   - No more Vercel Analytics 404 errors
   - No more Dialog accessibility warnings

3. **Functionality:**
   - Domain generation process starts successfully
   - Logs stream correctly
   - Results display properly

---

## Additional Notes

- The application uses **Nginx as a reverse proxy**, so relative URLs (empty string) work correctly for API calls
- This is consistent with the pattern used in other components like `api.ts` and `AuthContext.tsx`
- The `ecosystem.config.js` confirms `NEXT_PUBLIC_API_URL` is intentionally not set for production (uses Nginx proxying)

---

## Environment Configuration

**Production (PM2 + RunPod):**
- `NEXT_PUBLIC_API_URL` is **not set** (uses relative URLs)
- Nginx handles proxying from frontend to backend
- Frontend runs on port 3000
- Backend runs on port 8000

**Local Development:**
- Set `NEXT_PUBLIC_API_URL=http://localhost:8001` in `frontend/.env.local` for separate ports
- See `scripts/start-dev.sh` for local development setup
