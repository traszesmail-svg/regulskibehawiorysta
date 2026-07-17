const fs = require('node:fs')
const path = require('node:path')

const targetPath = path.join(
  process.cwd(),
  'node_modules',
  'next',
  'dist',
  'server',
  'lib',
  'incremental-cache',
  'index.js',
)

const patchMarkers = [
  '__regulskiBehawiorystaPatchedRevalidateTag',
  // Earlier project builds used this marker. Recognizing it keeps the prebuild
  // guard idempotent after `npm ci` restores a previously patched Next runtime.
  '__behawior15PatchedRevalidateTag',
]

function patchIncrementalCacheRuntime(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`[regulski-behawiorysta][prebuild] missing file: ${filePath}`)
    return
  }

  const source = fs.readFileSync(filePath, 'utf8')

  if (patchMarkers.some((marker) => source.includes(marker))) {
    return
  }

  const original = `    async revalidateTag(tags) {
        var _this_cacheHandler_revalidateTag, _this_cacheHandler;
        if (process.env.__NEXT_INCREMENTAL_CACHE_IPC_PORT && process.env.__NEXT_INCREMENTAL_CACHE_IPC_KEY && process.env.NEXT_RUNTIME !== "edge") {
            const invokeIpcMethod = require("../server-ipc/request-utils").invokeIpcMethod;
            return invokeIpcMethod({
                method: "revalidateTag",
                ipcPort: process.env.__NEXT_INCREMENTAL_CACHE_IPC_PORT,
                ipcKey: process.env.__NEXT_INCREMENTAL_CACHE_IPC_KEY,
                args: [
                    ...arguments
                ]
            });
        }
        return (_this_cacheHandler = this.cacheHandler) == null ? void 0 : (_this_cacheHandler_revalidateTag = _this_cacheHandler.revalidateTag) == null ? void 0 : _this_cacheHandler_revalidateTag.call(_this_cacheHandler, tags);
    }`

  const replacement = `    async revalidateTag(tags) {
        var _this_cacheHandler_revalidateTag, _this_cacheHandler;
        const ipcPort = process.env.__NEXT_INCREMENTAL_CACHE_IPC_PORT;
        const ipcKey = process.env.__NEXT_INCREMENTAL_CACHE_IPC_KEY;
        if (Array.isArray(tags) && tags.length === 0) {
            return;
        }
        if (ipcPort && ipcKey && ipcPort !== "undefined" && ipcKey !== "undefined" && ipcPort !== "null" && ipcKey !== "null" && process.env.NEXT_RUNTIME !== "edge") {
            const invokeIpcMethod = require("../server-ipc/request-utils").invokeIpcMethod;
            return invokeIpcMethod({
                method: "revalidateTag",
                ipcPort,
                ipcKey,
                args: [
                    ...arguments
                ]
            });
        }
        this.${patchMarkers[0]} = true;
        return (_this_cacheHandler = this.cacheHandler) == null ? void 0 : (_this_cacheHandler_revalidateTag = _this_cacheHandler.revalidateTag) == null ? void 0 : _this_cacheHandler_revalidateTag.call(_this_cacheHandler, tags);
    }`

  if (!source.includes(original)) {
    console.warn('[regulski-behawiorysta][prebuild] Next incremental cache patch target not found')
    return
  }

  fs.writeFileSync(filePath, source.replace(original, replacement))
  console.log('[regulski-behawiorysta][prebuild] patched Next incremental cache revalidateTag guard')
}

patchIncrementalCacheRuntime(targetPath)
