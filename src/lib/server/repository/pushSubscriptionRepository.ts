import { db } from '../db';
import { pushSubscription } from '../db/schema';
import { and, eq, inArray } from 'drizzle-orm';

export type PushSubscriptionInput = {
	userId: string;
	endpoint: string;
	p256dh: string;
	auth: string;
};

class PushSubscriptionRepository {
	/** Stores the device's subscription; a device that changes user moves to the new user. */
	async upsert(value: PushSubscriptionInput) {
		await db
			.insert(pushSubscription)
			.values(value)
			.onConflictDoUpdate({
				target: pushSubscription.endpoint,
				set: { userId: value.userId, p256dh: value.p256dh, auth: value.auth }
			});
	}

	async remove(userId: string, endpoint: string) {
		await db
			.delete(pushSubscription)
			.where(and(eq(pushSubscription.userId, userId), eq(pushSubscription.endpoint, endpoint)));
	}

	async removeByEndpoints(endpoints: string[]) {
		if (endpoints.length === 0) return;
		await db.delete(pushSubscription).where(inArray(pushSubscription.endpoint, endpoints));
	}

	async getForUsers(userIds: string[]) {
		if (userIds.length === 0) return [];
		return await db
			.select()
			.from(pushSubscription)
			.where(inArray(pushSubscription.userId, userIds));
	}
}

export const pushSubscriptionRepository = new PushSubscriptionRepository();
