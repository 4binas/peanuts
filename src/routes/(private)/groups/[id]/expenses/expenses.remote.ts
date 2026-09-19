import { form, getRequestEvent, query } from '$app/server';
import { getAuth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { groupMembers, payment, receipt, receipt_item, receipt_split } from '$lib/server/db/schema';
import * as v from 'valibot';
import { eq, and, sql } from 'drizzle-orm';

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
			const newReceipt = await db
				.insert(receipt)
				.values({
					groupId: data.groupId,
					boughtById: data.boughtById,
					storeName: data.storeName
				})
				.returning()
				.then(([r]) => r);
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
		const t = await db
			.select()
			.from(groupMembers)
			.where(and(eq(groupMembers.groupId, data.groupId), eq(groupMembers.userId, session.user.id)))
			.then((r) => r);

		if (!t) {
			throw new Error('Unauthorized');
		}

		try {
			const expenses = await db.query.receipt.findMany({
				where: eq(receipt.groupId, data.groupId),
				with: {
					items: {
						with: {
							receipt_splits: true
						}
					}
				}
			});
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
	const splitRows = await db
		.select({
			buyerId: receipt.boughtById,
			debtorId: receipt_split.userId,
			amountOwed: sql<number>`
        sum(${receipt_item.price} * ${receipt_split.splitPercentage} / 100.0)
      `
		})
		.from(receipt)
		.innerJoin(receipt_item, eq(receipt_item.receiptId, receipt.id))
		.innerJoin(receipt_split, eq(receipt_split.receipt_item_id, receipt_item.id))
		.where(eq(receipt.groupId, groupId))
		.groupBy(receipt.id, receipt.boughtById, receipt_split.userId);

	for (const row of splitRows) {
		if (row.buyerId === row.debtorId) continue; // buyer keeps own share
		const amt = Number(row.amountOwed ?? 0);
		add(row.debtorId, -amt); // debtor owes -> negative
		add(row.buyerId, amt); // buyer is owed -> positive
	}

	// ---- 2. Apply payments (money already moved) ----
	const paymentRows = await db
		.select({
			fromUserId: payment.fromUserId,
			toUserId: payment.toUserId,
			amount: payment.amount
		})
		.from(payment)
		.where(eq(payment.groupId, groupId));

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
		// const payments = await db.query.payment.findMany({
		// 	where: eq(payment.groupId, data.groupId),
		// 	groupBy: (payment.fromUserId, pay)
		// });

		// const owed = (await getAmountsOwed(data.groupId)).filter((row) => row.debtorId !== row.buyerId);
		// return netBalances(owed);
		return await getGroupBalances(data.groupId);
	}
);
