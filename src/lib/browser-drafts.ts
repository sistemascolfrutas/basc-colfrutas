"use client";

const DB_NAME = "colfrutas-basc-drafts";
const STORE_NAME = "form-drafts";
const DB_VERSION = 1;

export type BrowserDraft<TForm, TFiles> = {
  form: TForm;
  files: TFiles;
  updatedAt: string;
};

export async function loadBrowserDraft<TForm, TFiles>(key: string) {
  if (typeof indexedDB === "undefined") {
    return null;
  }

  const db = await openDraftDatabase();

  return new Promise<BrowserDraft<TForm, TFiles> | null>((resolve, reject) => {
    const request = db
      .transaction(STORE_NAME, "readonly")
      .objectStore(STORE_NAME)
      .get(key);

    request.onsuccess = () => {
      resolve((request.result as BrowserDraft<TForm, TFiles> | undefined) ?? null);
    };
    request.onerror = () => reject(request.error);
  }).finally(() => db.close());
}

export async function saveBrowserDraft<TForm, TFiles>(
  key: string,
  draft: BrowserDraft<TForm, TFiles>,
) {
  if (typeof indexedDB === "undefined") {
    return;
  }

  const db = await openDraftDatabase();

  return new Promise<void>((resolve, reject) => {
    const request = db
      .transaction(STORE_NAME, "readwrite")
      .objectStore(STORE_NAME)
      .put(draft, key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  }).finally(() => db.close());
}

export async function clearBrowserDraft(key: string) {
  if (typeof indexedDB === "undefined") {
    return;
  }

  const db = await openDraftDatabase();

  return new Promise<void>((resolve, reject) => {
    const request = db
      .transaction(STORE_NAME, "readwrite")
      .objectStore(STORE_NAME)
      .delete(key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  }).finally(() => db.close());
}

function openDraftDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
