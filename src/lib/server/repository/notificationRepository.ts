import { db } from '../db';
import { notification } from '../db/schema';
import { and, count, desc, eq, inArray, isNull } from 'drizzle-orm';

export type NotificationInput = {
	userId: string;
	actorId: string;
	groupId: string;
	type: string;
	entityId: string | null;
	message: string;
};

class NotificationRepository {
	async createNotifications(values: NotificationInput[]) {
		if (values.length === 0) return;
		await db.insert(notification).values(values);
	}

	async getNotifications(userId: string, limit = 50) {
		return await db.query.notification.findMany({
			where: eq(notification.userId, userId),
			orderBy: desc(notification.createdAt),
			limit,
			with: {
				actor: { columns: { id: true, name: true, image: true } },
				group: { columns: { id: true, name: true } }
			}
		});
	}

	async countUnread(userId: string) {
		const [row] = await db
			.select({ count: count() })
			.from(notification)
			.where(and(eq(notification.userId, userId), isNull(notification.readAt)));
		return row?.count ?? 0;
	}

	/** Marks the given notifications (or all when omitted) of the user as read. */
	async markRead(userId: string, ids?: string[]) {
		const conditions = [eq(notification.userId, userId), isNull(notification.readAt)];
		if (ids) {
			if (ids.length === 0) return;
			conditions.push(inArray(notification.id, ids));
		}
		await db
			.update(notification)
			.set({ readAt: new Date() })
			.where(and(...conditions));
	}
}

export const notificationRepository = new NotificationRepository();
