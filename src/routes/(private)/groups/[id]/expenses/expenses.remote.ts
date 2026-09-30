import { form, query } from '$app/server';
import { requireGroupMember, requireUsersInGroup } from '$lib/server/guards';
import { paymentRepository } from '$lib/server/repository/paymentRepository';
import { receiptRepository } from '$lib/server/repository/receptRepository';
import { computeBalances } from '$lib/server/services/balanceService';
import * as v from 'valibot';

export const createExpense = form(
	v.object({
		groupId: v.pipe(v.string(), v.nonEmpty()),
		boughtById: v.pipe(v.string(), v.nonEmpty()),
		boughtAt: v.pipe(v.string(), v.nonEmpty()),
		totalPrice: v.pipe(v.number(), v.minValue(0)),
		storeName: v.pipe(v.string(), v.nonEmpty())
	}),
	async (data) => {
		await requireGroupMember(data.groupId);
		await requireUsersInGroup(data.groupId, [data.boughtById]);

		try {
			const newReceipt = await receiptRepository.createEmptyReceipt({
				groupId: data.groupId,
				boughtById: data.boughtById,
				storeName: data.storeName
			});
			return { receipt: newReceipt };
		} catch (error) {
			throw new Error('Failed to create receipt: ' + error, { cause: error });
		}
	}
);

export const getExpenses = query(
	v.object({
		groupId: v.pipe(v.string(), v.nonEmpty())
	}),
	async (data) => {
		await requireGroupMember(data.groupId);

		try {
			const expenses = await receiptRepository.getReceiptsWithItems(data.groupId);
			return expenses;
		} catch (error) {
			throw new Error('Failed to get expenses: ' + error, { cause: error });
		}
	}
);

async function getGroupBalances(groupId: string) {
	const [splits, payments] = await Promise.all([
		receiptRepository.getSplits(groupId),
		paymentRepository.getPaymentFlows(groupId)
	]);
	return computeBalances(splits, payments);
}

export const getBalaceSheet = query(
	v.object({
		groupId: v.pipe(v.string(), v.nonEmpty())
	}),
	async (data) => {
		await requireGroupMember(data.groupId);

		return await getGroupBalances(data.groupId);
	}
);
