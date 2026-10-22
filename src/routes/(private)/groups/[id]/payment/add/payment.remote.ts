import { command, form, query } from '$app/server';
import {
	requireGroupMember,
	requirePaymentAccess,
	requireUser,
	requireUsersInGroup
} from '$lib/server/guards';
import { paymentRepository } from '$lib/server/repository/paymentRepository';
import {
	formatAmount,
	memberName,
	NotificationType,
	notifyGroup
} from '$lib/server/services/notificationService';
import * as v from 'valibot';

function describePayment(
	payment: { amount: number; currency: string; fromUserId: string; toUserId: string },
	members: Parameters<typeof memberName>[0],
	recipientId: string
) {
	const from = memberName(members, payment.fromUserId, recipientId);
	const to = memberName(members, payment.toUserId, recipientId);
	return `${formatAmount(payment.amount, payment.currency)} from ${from} to ${to}`;
}

export const createPayment = form(
	v.object({
		paymentId: v.pipe(v.string()),
		fromUserId: v.pipe(v.string(), v.nonEmpty()),
		toUserId: v.pipe(v.string(), v.nonEmpty()),
		groupId: v.pipe(v.string(), v.nonEmpty()),
		currency: v.pipe(v.string(), v.length(3), v.nonEmpty()),
		amount: v.pipe(v.number()),
		description: v.pipe(v.string())
	}),
	async ({ fromUserId, toUserId, currency, amount, description, groupId, paymentId }) => {
		const user = await requireGroupMember(groupId);
		await requireUsersInGroup(groupId, [fromUserId, toUserId]);

		const values = {
			groupId: groupId,
			amount: parseInt((amount * 100).toFixed(0)),
			currency: currency,
			description: description,
			fromUserId: fromUserId,
			toUserId: toUserId
		};

		if (paymentId) {
			await requirePaymentAccess(paymentId);
			await paymentRepository.updatePayment(paymentId, values);
			await notifyGroup({
				groupId,
				actorId: user.id,
				type: NotificationType.paymentUpdated,
				entityId: paymentId,
				message: ({ members, recipientId }) =>
					`updated the payment of ${describePayment(values, members, recipientId)}`
			});
			return;
		}

		const created = await paymentRepository.createPayment(values);
		await notifyGroup({
			groupId,
			actorId: user.id,
			type: NotificationType.paymentCreated,
			entityId: created.id,
			message: ({ members, recipientId }) =>
				`recorded a payment of ${describePayment(values, members, recipientId)}`
		});
	}
);

export const listPayments = query(
	v.object({
		groupId: v.pipe(v.string(), v.nonEmpty())
	}),
	async ({ groupId }) => {
		await requireGroupMember(groupId);

		const payments = await paymentRepository.getPayments(groupId);
		return payments;
	}
);

export const deletePayment = command(
	v.object({
		paymentId: v.pipe(v.string(), v.nonEmpty())
	}),
	async (data) => {
		const payment = await requirePaymentAccess(data.paymentId);
		const user = requireUser();

		await paymentRepository.deletePayment(data.paymentId);

		await notifyGroup({
			groupId: payment.groupId,
			actorId: user.id,
			type: NotificationType.paymentDeleted,
			message: ({ members, recipientId }) =>
				`deleted the payment of ${describePayment(payment, members, recipientId)}`
		});
	}
);

export const getPayment = query(
	v.object({
		paymentId: v.pipe(v.string(), v.nonEmpty())
	}),
	async (data) => {
		return await requirePaymentAccess(data.paymentId);
	}
);
