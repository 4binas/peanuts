import { form, getRequestEvent, query } from '$app/server';
import { getAuth } from '$lib/server/auth';
import { groupRepository } from '$lib/server/repository/groupRepository';
import { paymentRepository } from '$lib/server/repository/paymentRepository';
import { receiptRepository } from '$lib/server/repository/receptRepository';
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
		const event = getRequestEvent();
		const session = await getAuth().api.getSession({
			headers: event.request.headers
		});

		if (!session) {
			throw new Error('Unauthorized');
		}

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
		const event = getRequestEvent();
		const session = await getAuth().api.getSession({
			headers: event.request.headers
		});

		if (!session) {
			throw new Error('Unauthorized');
		}
		const isMember = await groupRepository.isMember(data.groupId, session.user.id);

		if (!isMember) {
			throw new Error('Unauthorized');
		}

		try {
			const expenses = await receiptRepository.getReceiptsWithItems(data.groupId);
			return expenses;
		} catch (error) {
			throw new Error('Failed to get expenses: ' + error, { cause: error });
		}
	}
);

type Balance = { userId: string; balanceCents: number };

async function getGroupBalances(groupId: string): Promise<Balance[]> {
	const map = new Map<string, number>();
	const add = (userId: string, delta: number) => map.set(userId, (map.get(userId) ?? 0) + delta);

	// ---- 1. Balances derived from receipt splits ----
	const splitRows = await receiptRepository.getAmountsOwed(groupId);

	for (const row of splitRows) {
		if (row.buyerId === row.debtorId) continue; // buyer keeps own share
		const amt = Number(row.amountOwed ?? 0);
		add(row.debtorId, -amt); // debtor owes -> negative
		add(row.buyerId, amt); // buyer is owed -> positive
	}

	// ---- 2. Apply payments (money already moved) ----
	const paymentRows = await paymentRepository.getPaymentFlows(groupId);

	for (const p of paymentRows) {
		add(p.fromUserId, p.amount); // paid out -> improves their balance
		add(p.toUserId, -p.amount); // received -> reduces what's owed to them
	}

	const balance = [...map.entries()]
		.map(([userId, balanceCents]) => ({ userId, balanceCents }))
		.filter((b) => b.balanceCents !== 0);

	return balance;
}

export const getBalaceSheet = query(
	v.object({
		groupId: v.pipe(v.string(), v.nonEmpty())
	}),
	async (data) => {
		return await getGroupBalances(data.groupId);
	}
);
