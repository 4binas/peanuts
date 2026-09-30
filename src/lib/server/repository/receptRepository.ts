import { db } from '../db';
import { receipt, receipt_item, receipt_split } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';

export const ReceiptItemSplitSchema = z.object({
	userId: z.string(),
	splitPercentage: z.number()
});

export const ReceiptItemSchema = z.object({
	name: z.string(),
	description: z.string().optional().nullable(),
	price: z.number(),
	currency: z.string(),
	receiptSplit: z.array(ReceiptItemSplitSchema)
});

export type ReceiptItem = z.infer<typeof ReceiptItemSchema>;

export const ReceiptSchema = z.object({
	id: z.string(),
	boughtById: z.string(),
	groupId: z.string(),
	storeName: z.string(),
	boughtAt: z.iso.datetime(),
	items: z.array(ReceiptItemSchema)
});

export const CreateReceiptSchema = ReceiptSchema.omit({ id: true });

export type Receipt = z.infer<typeof ReceiptSchema>;

export type CreateReceipt = z.infer<typeof CreateReceiptSchema>;

class ReceiptRepository {
	async getReceipts(groupId: string) {
		const receipts = await db.select().from(receipt).where(eq(receipt.groupId, groupId));
		return receipts;
	}

	async getReceiptsWithItems(groupId: string) {
		return await db.query.receipt.findMany({
			where: eq(receipt.groupId, groupId),
			with: {
				items: {
					with: {
						receipt_splits: true
					}
				}
			}
		});
	}

	async createEmptyReceipt(values: { groupId: string; boughtById: string; storeName: string }) {
		return await db
			.insert(receipt)
			.values(values)
			.returning()
			.then(([r]) => r);
	}

	/** Amount each debtor owes the buyer, per receipt, in cents. */
	async getAmountsOwed(groupId: string) {
		return await db
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
	}

	async getReceipt(receiptId: string) {
		const res = await db.query.receipt.findFirst({
			where: eq(receipt?.id, receiptId),
			with: {
				items: {
					with: {
						receipt_splits: true
					}
				}
			}
		});
		return res;
	}

	async deleteReceipt(receiptId: string) {
		await db.delete(receipt).where(eq(receipt.id, receiptId));
	}

	async createReceipt(uploadReceipt: CreateReceipt) {
		return await db.transaction(async (tx) => {
			const newReceipt = await tx
				.insert(receipt)
				.values({
					boughtById: uploadReceipt.boughtById,
					groupId: uploadReceipt.groupId,
					storeName: uploadReceipt.storeName,
					boughtAt: new Date(uploadReceipt.boughtAt)
				})
				.returning()
				.then((res) => res[0]);
			const items = [];
			const itemSplits: { userId: string; splitPercentage: number; receipt_item_id: string }[] = [];
			if (uploadReceipt.items) {
				for (const i of uploadReceipt.items) {
					if (!i.receiptSplit) {
						throw new Error('receiptSplit must be split with users can be split with one');
					}
					const totalSplit = i.receiptSplit.reduce((acc, split) => acc + split.splitPercentage, 0);
					if (totalSplit !== 100) {
						throw new Error('receiptSplit must sum to 100');
					}

					items.push({
						name: i.name,
						description: i.description,
						currency: i.currency,
						receiptId: newReceipt.id,
						price: Number.parseInt(i.price.toFixed(0), 10)
					});
				}
				if (items.length > 0) {
					const insertedItems = await tx.insert(receipt_item).values(items).returning();
					for (const [index, value] of insertedItems.entries()) {
						itemSplits.push(
							...uploadReceipt.items[index].receiptSplit.map((split) => ({
								userId: split.userId,
								splitPercentage: split.splitPercentage,
								receipt_item_id: value.id
							}))
						);
					}
					await tx.insert(receipt_split).values(itemSplits);
				}
			}
			return newReceipt;
		});
	}
}

export const receiptRepository = new ReceiptRepository();
