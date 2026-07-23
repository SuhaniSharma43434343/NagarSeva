import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_STORAGE_KEY = '@nagarseva_offline_frames_queue';

export interface OfflineQueueItem {
    id: string;
    frames: string[];
    routeId: string;
    wardId: string;
    surveySessionId: string;
    assignmentId: string;
    timestamp: number;
}

class OfflineQueueManager {
    async getQueue(): Promise<OfflineQueueItem[]> {
        try {
            const raw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (error) {
            console.error('Failed to read offline queue:', error);
            return [];
        }
    }

    async enqueueBatch(
        frames: string[],
        routeId: string,
        wardId: string,
        surveySessionId: string,
        assignmentId: string
    ): Promise<void> {
        if (frames.length === 0) return;

        try {
            const currentQueue = await this.getQueue();
            const newItem: OfflineQueueItem = {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                frames,
                routeId,
                wardId,
                surveySessionId,
                assignmentId,
                timestamp: Date.now(),
            };

            const updatedQueue = [...currentQueue, newItem];
            await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(updatedQueue));
            console.log(`📥 Offline Queue: Saved ${frames.length} frames locally. Queue size: ${updatedQueue.length}`);
        } catch (error) {
            console.error('Failed to enqueue offline frames:', error);
        }
    }

    async syncQueue(
        uploadFn: (item: OfflineQueueItem) => Promise<boolean>
    ): Promise<{ synced: number; remaining: number }> {
        const currentQueue = await this.getQueue();
        if (currentQueue.length === 0) return { synced: 0, remaining: 0 };

        console.log(`🔄 Attempting auto-sync for ${currentQueue.length} offline batch(es)...`);
        let syncedCount = 0;
        const remainingQueue: OfflineQueueItem[] = [];

        for (const item of currentQueue) {
            try {
                const success = await uploadFn(item);
                if (success) {
                    syncedCount++;
                } else {
                    remainingQueue.push(item);
                }
            } catch (error) {
                console.error(`Sync failed for item ${item.id}:`, error);
                remainingQueue.push(item);
            }
        }

        try {
            await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(remainingQueue));
        } catch (error) {
            console.error('Failed to update offline queue storage:', error);
        }

        console.log(`✅ Auto-sync completed: ${syncedCount} synced, ${remainingQueue.length} remaining.`);
        return { synced: syncedCount, remaining: remainingQueue.length };
    }

    async getQueueLength(): Promise<number> {
        const queue = await this.getQueue();
        return queue.length;
    }

    async clearQueue(): Promise<void> {
        try {
            await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
        } catch (error) {
            console.error('Failed to clear offline queue:', error);
        }
    }
}

export const offlineQueue = new OfflineQueueManager();
export default offlineQueue;
