"use client";

const DB_NAME = "colfrutas-basc-drafts";
const STORE_NAME = "form-drafts";
const DB_VERSION = 1;

export type BrowserDraft<TForm, TFiles> = {
  form: TForm;
  files: TFiles;
  updatedAt: string;
};

type StoredFile = {
  __type: "browser-draft-file";
  name: string;
  type: string;
  lastModified: number;
  data: ArrayBuffer;
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
      const draft = request.result as
        | BrowserDraft<TForm, Record<string, File | StoredFile | null>>
        | undefined;

      if (!draft) {
        resolve(null);
        return;
      }

      resolve({
        ...draft,
        files: reviveDraftFiles(draft.files) as TFiles,
      });
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
  const storableDraft = {
    ...draft,
    files: await serializeDraftFiles(draft.files),
  };

  return new Promise<void>((resolve, reject) => {
    const request = db
      .transaction(STORE_NAME, "readwrite")
      .objectStore(STORE_NAME)
      .put(storableDraft, key);

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

async function serializeDraftFiles<TFiles>(files: TFiles) {
  const entries = await Promise.all(
    Object.entries(files as Record<string, File | null>).map(async ([key, file]) => {
      if (!file) {
        return [key, null] as const;
      }

      return [
        key,
        {
          __type: "browser-draft-file",
          name: file.name,
          type: file.type,
          lastModified: file.lastModified,
          data: await file.arrayBuffer(),
        } satisfies StoredFile,
      ] as const;
    }),
  );

  return Object.fromEntries(entries);
}

function reviveDraftFiles(files: Record<string, File | StoredFile | null>) {
  return Object.fromEntries(
    Object.entries(files).map(([key, file]) => {
      if (!file || file instanceof File) {
        return [key, file];
      }

      if (isStoredFile(file)) {
        return [
          key,
          new File([file.data], file.name, {
            type: file.type,
            lastModified: file.lastModified,
          }),
        ];
      }

      return [key, null];
    }),
  );
}

function isStoredFile(file: File | StoredFile): file is StoredFile {
  return "__type" in file && file.__type === "browser-draft-file";
}
