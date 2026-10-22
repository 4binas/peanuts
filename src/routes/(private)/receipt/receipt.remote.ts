import { command, form, query } from '$app/server';
import {
	requireGroupMember,
	requireReceiptAccess,
	requireUser,
	requireUsersInGroup
} from '$lib/server/guards';
import {
	type CreateReceipt,
	CreateReceiptSchema,
	receiptRepository,
	ReceiptSchema
} from '$lib/server/repository/receptRepository';
import { generateReciptFromImage } from '$lib/server/services/llmService';
import * as v from 'valibot';

export const parseReceiptImage = form(
	v.object({
		// prompt: v.pipe(v.string(), v.nonEmpty()),
		image: v.pipe(v.file(), v.mimeType(['image/jpeg', 'image/png', 'image/webp']), v.minSize(1))
	}),
	async (data) => {
		requireUser();

		const buffer = Buffer.from(await data.image.arrayBuffer());
		const base64 = buffer.toString('base64');
		const dataUrl = `data:${data.image.type};base64,${base64}`;
		const result = await generateReciptFromImage(dataUrl);

		try {
			return { receipt: result };
		} catch (error) {
			throw new Error('Failed to create receipt: ' + error, { cause: error });
		}
	}
);

/** Buyer and everyone an item is split with must belong to the receipt's group. */
function receiptUserIds(data: CreateReceipt) {
	return [data.boughtById, ...data.items.flatMap((i) => i.receiptSplit.map((s) => s.userId))];
}

export const createReceipt = command(CreateReceiptSchema, async (data) => {
	await requireGroupMember(data.groupId);
	await requireUsersInGroup(data.groupId, receiptUserIds(data));

	const receipt = await receiptRepository.createReceipt({ ...data });
	return receipt;
});

export const deleteReceipt = command(
	v.object({
		receiptId: v.pipe(v.string(), v.nonEmpty())
	}),
	async (data) => {
		await requireReceiptAccess(data.receiptId);

		await receiptRepository.deleteReceipt(data.receiptId);
	}
);

export const getReceipt = query(
	v.object({
		receiptId: v.pipe(v.string(), v.nonEmpty())
	}),
	async (data) => {
		return await requireReceiptAccess(data.receiptId);
	}
);

export const patchReceipt = command(ReceiptSchema, async (data) => {
	await requireReceiptAccess(data.id);
	await requireGroupMember(data.groupId);
	await requireUsersInGroup(data.groupId, receiptUserIds(data));

	//TODO: Actually patch the receipt
	await receiptRepository.deleteReceipt(data.id);
	const receipt = await receiptRepository.createReceipt({ ...data });
	return receipt;
});
