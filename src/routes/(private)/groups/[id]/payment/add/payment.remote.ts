import { command, form, getRequestEvent, query } from '$app/server';
import { getAuth } from '$lib/server/auth';
import { groupRepository } from '$lib/server/repository/groupRepository';
import { paymentRepository } from '$lib/server/repository/paymentRepository';
import { error } from '@sveltejs/kit';
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
		const event = getRequestEvent();
		// Check the user is logged in
		const session = await getAuth().api.getSession({
			headers: event.request.headers
		});
		if (!session?.user.id) error(401, 'Unauthorized');

		const { user } = session;
		const gp = await groupRepository.getGroupWithMembers(groupId);
		if (!gp) error(404, 'Group not found');
		if (gp.members.find((m) => m.userId === user.id) === undefined)
			error(403, 'Forbidden User not in group');

		const values = {
			groupId: groupId,
			amount: parseInt((amount * 100).toFixed(0)),
			currency: currency,
			description: description,
			fromUserId: fromUserId,
			toUserId: toUserId
		};

		if (paymentId) {
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
		const payments = await paymentRepository.getPayments(groupId);
		return payments;
	}
);

export const deletePayment = command(
	v.object({
		paymentId: v.pipe(v.string(), v.nonEmpty())
	}),
	async (data) => {
		const event = getRequestEvent();
		// Check the user is logged in
		const session = await getAuth().api.getSession({
			headers: event.request.headers
		});
		if (!session?.user.id) error(401, 'Unauthorized');

		await paymentRepository.deletePayment(data.paymentId);
	}
);

export const getPayment = query(
	v.object({
		paymentId: v.pipe(v.string(), v.nonEmpty())
	}),
	async (data) => {
		const event = getRequestEvent();
		// Check the user is logged in
		const session = await getAuth().api.getSession({
			headers: event.request.headers
		});
		if (!session?.user.id) error(401, 'Unauthorized');

		return await paymentRepository.getPayment(data.paymentId);
	}
);
