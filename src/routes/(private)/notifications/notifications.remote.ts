import { command, query } from '$app/server';
import { requireUser } from '$lib/server/guards';
import { notificationRepository } from '$lib/server/repository/notificationRepository';
import * as v from 'valibot';

export const getNotifications = query(async () => {
	const user = requireUser();

	return await notificationRepository.getNotifications(user.id);
});

export const getUnreadCount = query(async () => {
	const user = requireUser();

	return await notificationRepository.countUnread(user.id);
});

/** Marks the given notifications, or all of them when no ids are passed, as read. */
export const markNotificationsRead = command(
	v.object({
		ids: v.optional(v.array(v.pipe(v.string(), v.uuid())))
	}),
	async ({ ids }) => {
		const user = requireUser();

		await notificationRepository.markRead(user.id, ids);
		await Promise.all([getNotifications().refresh(), getUnreadCount().refresh()]);
	}
);
