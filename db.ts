
import { StoryContext, Scene, DirectorSettings } from './types';

const DB_NAME = 'CineFlowDB';
const STORE_NAME = 'projects';
const DB_VERSION = 1;

export interface ProjectData {
  context: StoryContext;
  scenes: Scene[];
  settings: DirectorSettings;
}

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'context.id' });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

export const saveProjectToDB = async (data: ProjectData): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.error("IndexedDB Put Error:", request.error);
        reject(request.error);
      };
    });
  } catch (e) {
    console.error("Failed to open DB for saving:", e);
    throw e;
  }
};

export const getProjectsFromDB = async (): Promise<ProjectData[]> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
          try {
            const res = (request.result || []) as ProjectData[];
            // Sort by lastUpdated desc, handling potential missing timestamps
            res.sort((a, b) => {
              const timeA = a.context?.lastUpdated || 0;
              const timeB = b.context?.lastUpdated || 0;
              return timeB - timeA;
            });
            resolve(res);
          } catch (err) {
            console.error("Error processing DB results:", err);
            resolve([]); // Return empty array on sort error rather than crashing
          }
      };
      request.onerror = () => {
        console.error("IndexedDB Get Error:", request.error);
        reject(request.error);
      };
    });
  } catch (e) {
    console.error("Failed to open DB for reading:", e);
    return [];
  }
};

export const deleteProjectFromDB = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};
