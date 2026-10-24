const DB_NAME = "dreamhouse-floorplan-assets";
const STORE = "images";

function openAssetDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB open failed"));
  });
}

export async function saveFloorplanAsset(assetId: string, url: string) {
  if (typeof window === "undefined" || !url) throw new Error("asset source unavailable");
  const response = await fetch(url);
  if (!response.ok) throw new Error(`asset download failed: HTTP ${response.status}`);
  const blob = await response.blob();
  const db = await openAssetDb();
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction(STORE, "readwrite").objectStore(STORE).put(blob, assetId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error("asset save failed"));
  });
  db.close();
}

export async function loadFloorplanAsset(assetId: string) {
  if (typeof window === "undefined") return null;
  const db = await openAssetDb();
  const blob = await new Promise<Blob | null>((resolve, reject) => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).get(assetId);
    request.onsuccess = () => resolve(request.result instanceof Blob ? request.result : null);
    request.onerror = () => reject(request.error || new Error("asset load failed"));
  });
  db.close();
  return blob ? URL.createObjectURL(blob) : null;
}

export async function clearFloorplanAssets(prefix: string) {
  if (typeof window === "undefined" || !prefix) return;
  const db = await openAssetDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE, "readwrite");
    const store = transaction.objectStore(STORE);
    const request = store.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      if (String(cursor.key).startsWith(prefix)) cursor.delete();
      cursor.continue();
    };
    request.onerror = () => reject(request.error || new Error("asset cleanup failed"));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("asset cleanup failed"));
  });
  db.close();
}
