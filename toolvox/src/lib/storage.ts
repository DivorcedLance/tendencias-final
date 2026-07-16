const DB_NAME = "toolvox";
const DB_VERSION = 1;
const STORE_CHATS = "chats";
const STORE_MESSAGES = "messages";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_CHATS)) {
        const chatStore = db.createObjectStore(STORE_CHATS, { keyPath: "id" });
        chatStore.createIndex("demoId", "demoId", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_MESSAGES)) {
        const msgStore = db.createObjectStore(STORE_MESSAGES, { keyPath: "id" });
        msgStore.createIndex("chatId", "chatId", { unique: false });
      }
    };
  });
}

function sanitizeValue(val: any, seen?: Set<any>): any {
  if (val === null || val === undefined) return val;
  if (typeof val !== "object") return val;
  if (val instanceof Date || val instanceof RegExp) return val;
  if (typeof val === "function") return undefined;
  if (typeof val === "symbol") return undefined;

  seen = seen || new Set();
  if (seen.has(val)) return undefined;
  seen.add(val);

  if (Array.isArray(val)) {
    return val.map((item) => sanitizeValue(item, seen));
  }

  const clean: Record<string, any> = {};
  for (const key of Object.keys(val)) {
    const v = sanitizeValue(val[key], seen);
    if (v !== undefined) {
      clean[key] = v;
    }
  }
  return clean;
}

function sanitizeParts(parts: any[] | undefined): any[] | undefined {
  if (!parts || !Array.isArray(parts)) return undefined;
  return sanitizeValue(parts);
}

function filterToTextParts(parts: any[] | undefined): any[] | undefined {
  if (!parts || !Array.isArray(parts)) return undefined;
  return parts.filter((p: any) => p && p.type === "text" && typeof p.text === "string");
}

export interface StoredChat {
  id: string;
  demoId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface StoredMessage {
  id: string;
  chatId: string;
  role: "user" | "assistant" | "system";
  content: string;
  parts?: any[];
  createdAt: number;
}

export async function saveChat(chat: StoredChat): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_CHATS, "readwrite");
  tx.objectStore(STORE_CHATS).put(chat);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getChat(id: string): Promise<StoredChat | undefined> {
  const db = await openDB();
  const tx = db.transaction(STORE_CHATS, "readonly");
  const request = tx.objectStore(STORE_CHATS).get(id);
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getChatsByDemo(demoId: string): Promise<StoredChat[]> {
  const db = await openDB();
  const tx = db.transaction(STORE_CHATS, "readonly");
  const index = tx.objectStore(STORE_CHATS).index("demoId");
  const request = index.getAll(demoId);
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllChats(): Promise<StoredChat[]> {
  const db = await openDB();
  const tx = db.transaction(STORE_CHATS, "readonly");
  const request = tx.objectStore(STORE_CHATS).getAll();
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteChat(id: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction([STORE_CHATS, STORE_MESSAGES], "readwrite");
  tx.objectStore(STORE_CHATS).delete(id);
  const msgIndex = tx.objectStore(STORE_MESSAGES).index("chatId");
  const msgRequest = msgIndex.openCursor(IDBKeyRange.only(id));
  msgRequest.onsuccess = (event) => {
    const cursor = (event.target as IDBRequest).result;
    if (cursor) {
      cursor.delete();
      cursor.continue();
    }
  };
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveMessage(message: StoredMessage): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_MESSAGES, "readwrite");
  const sanitized = { ...message, parts: sanitizeParts(message.parts) };
  tx.objectStore(STORE_MESSAGES).put(sanitized);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getMessagesByChat(chatId: string): Promise<StoredMessage[]> {
  const db = await openDB();
  const tx = db.transaction(STORE_MESSAGES, "readonly");
  const index = tx.objectStore(STORE_MESSAGES).index("chatId");
  const request = index.getAll(chatId);
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const messages = request.result
        .sort((a, b) => a.createdAt - b.createdAt)
        .map((m) => ({ ...m, parts: filterToTextParts(m.parts) }));
      resolve(messages);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function clearAllData(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction([STORE_CHATS, STORE_MESSAGES], "readwrite");
  tx.objectStore(STORE_CHATS).clear();
  tx.objectStore(STORE_MESSAGES).clear();
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
