import { groupRepository } from '../repository/groupRepository';
import { notificationRepository } from '../repository/notificationRepository';

export const NotificationType = {
	expenseCreated: 'expense_created',
	expenseUpdated: 'expense_updated',
	expenseDeleted: 'expense_deleted',
	paymentCreated: 'payment_created',
	paymentUpdated: 'payment_updated',
	paymentDeleted: 'payment_deleted',
	memberAdded: 'member_added'
} as const;

export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

type Members = { userId: string; user: { name: string } }[];

type NotifyGroupInput = {
	groupId: string;
	actorId: string;
	type: NotificationType;
	entityId?: string | null;
	/** Builds the text shown after the actor's name, per recipient. */
	message: (ctx: { recipientId: string; members: Members; currency: string }) => string;
};

export function formatAmount(cents: number, currency: string) {
	return `${(cents / 100).toFixed(2)} ${currency}`;
}

export function memberName(members: Members, userId: string, recipientId?: string) {
	if (userId === recipientId) return 'you';
	return members.find((m) => m.userId === userId)?.user.name ?? 'someone';
}

/**
 * Notifies every group member except the actor. Failures are logged and
 * swallowed so a notification problem never fails the action that caused it.
 */
export async function notifyGroup({ groupId, actorId, type, entityId, message }: NotifyGroupInput) {
	try {
		const group = await groupRepository.getGroup(groupId);
		if (!group) return;

		const recipients = [...new Set(group.members.map((m) => m.userId))].filter(
			(id) => id !== actorId
		);

		await notificationRepository.createNotifications(
			recipients.map((recipientId) => ({
				userId: recipientId,
				actorId,
				groupId,
				type,
				entityId: entityId ?? null,
				message: message({ recipientId, members: group.members, currency: group.currency })
			}))
		);
	} catch (err) {
		console.error('Failed to create notifications', err);
	}
}

/** Sum of the receipt's item prices, in cents. */
export function receiptTotal(receipt: { items: { price: number }[] }) {
	return receipt.items.reduce((acc, item) => acc + item.price, 0);
}

export function receiptCurrency(
	receipt: { items: { currency: string }[] },
	fallback: string
): string {
	return receipt.items[0]?.currency ?? fallback;
}
