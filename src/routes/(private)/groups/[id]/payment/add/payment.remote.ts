import { command, form, query } from '$app/server';
import { requireGroupMember, requirePaymentAccess } from '$lib/server/guards';
import { paymentRepository } from '$lib/server/repository/paymentRepository';
import * as v from 'valibot';

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
		await requireGroupMember(groupId);

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
			return;
		}

		await paymentRepository.createPayment(values);
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
		await requirePaymentAccess(data.paymentId);

		await paymentRepository.deletePayment(data.paymentId);
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
