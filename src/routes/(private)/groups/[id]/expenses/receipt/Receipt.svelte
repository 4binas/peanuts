<script lang="ts">
	import { ImageUp, Plus, Split, X } from '@lucide/svelte';
	import './receipt.css';
	import { uuidv4, ZodUUID } from 'zod';
	import { tick } from 'svelte';
	import {
		createReceipt,
		getReceipt,
		parseReceiptImage,
		patchReceipt,
		deleteReceipt
	} from '../../../../receipt/receipt.remote';
	import type { ReceiptItem } from '$lib/server/repository/receptRepository';
	import { getGroup } from '../../groupContext';
	import { slide } from 'svelte/transition';
	import { authClient } from '$lib/client/auth-client';
	import { goto } from '$app/navigation';
	import { differenceInDays } from 'date-fns';

	import { resolve } from '$app/paths';
	import Barcode from './Barcode.svelte';

	type ReceiptItemWithID = ReceiptItem & { id: ZodUUID };

	let { receiptId = undefined }: { receiptId: string | undefined } = $props();

	let storeName = $state('');
	let boughtAt: Date = $state(new Date());
	let boughtAtInput = $derived(boughtAt.toISOString().slice(0, 10));
	let items: ReceiptItemWithID[] = $state([]);
	const getGroupFn = getGroup();
	const group = $derived(getGroupFn());
	const defaultReceiptSplit = $derived(
		group?.members.map((member) => ({
			userId: member.userId,
			splitPercentage: parseInt((100 / group.members.length).toFixed(0))
		})) || []
	);
	let boughtById = $derived('');

	const setReceipt = async (id: string) => {
		const receipt = await getReceipt({ receiptId: id });
		if (receipt) {
			items = receipt.items.map((item) => ({
				id: uuidv4(item.id),
				name: item.name || '',
				price: item.price,
				currency: item.currency,
				receiptSplit: item.receipt_splits.map((split) => ({
					userId: split.userId,
					splitPercentage: split.splitPercentage
				}))
			}));
			storeName = receipt.storeName;
			boughtAt = receipt.boughtAt;
			boughtById = receipt.boughtById;
		}
	};

	$effect(() => {
		if (receiptId) {
			setReceipt(receiptId);
		}
	});

	let lastInput: HTMLInputElement | undefined = $state(undefined);

	let imageLoading = $state(false);

	const addItem = async () => {
		if (!group) return;
		items = [
			...items,
			{
				name: '',
				price: 0,
				id: uuidv4(),
				currency: 'CHF',
				receiptSplit: defaultReceiptSplit
			}
		];
		await tick();
		setTimeout(() => {
			lastInput?.focus();
		}, 305);
	};

	const total = $derived((items.reduce((acc, item) => acc + item.price, 0) / 100).toFixed(2));

	const currency = 'CHF';

	let fileInput: HTMLInputElement;

	let form: HTMLFormElement;

	let splitModal: HTMLDialogElement;

	let currentItem: ZodUUID | undefined = $state();

	let splitInputs: HTMLInputElement[] = $state([]);

	let splitErrorMsg = $state('');

	const handleSplitInputChange = () => {
		splitErrorMsg =
			splitInputs.reduce((acc, input) => acc + parseFloat(input.value), 0) !== 100
				? 'Split inputs must add up to 100%'
				: '';
	};

	const handleSplitSave = () => {
		if (splitErrorMsg !== '') return;
		splitModal.close();
		handleSave();
	};

	const handleSplitCancel = () => {
		splitModal.close();
	};

	const handleSave = () => {
		if (currentItem) {
			const item = items.find((item) => item.id === currentItem);
			if (item && group) {
				item.receiptSplit = splitInputs.map((input, index) => ({
					userId: group.members[index].userId,
					splitPercentage: parseInt(input.value)
				}));
			}
		}
	};

	const removeSplitPercentage = (splitIdx: number) => {
		console.log('Test');
		if (currentItem) {
			const item = items.find((item) => item.id === currentItem);
			if (item) {
				console.log(splitInputs[splitIdx]);
				const oldValue = parseInt(splitInputs[splitIdx].value);
				splitInputs.forEach((i, idx) => {
					if (idx == splitIdx) {
						i.value = '0';
					} else {
						i.value = (parseInt(i.value) + oldValue / (splitInputs.length - 1)).toString();
					}
				});
			}
		}
	};

	const handleSplitItemClick = (item: ZodUUID) => {
		console.log(item);
		currentItem = item;
		splitInputs = Array.from(splitModal.querySelectorAll('.split-input'));
		splitInputs.forEach(
			(input, index) =>
				(input.value = (
					items.find((item) => item.id === currentItem)?.receiptSplit[index]?.splitPercentage || 0
				).toString())
		);
		splitModal.showModal();
	};

	const handleImageSelect = () => {
		imageLoading = true;
		if (fileInput?.files?.length) {
			form?.requestSubmit();
		}
	};

	const deleteItem = (id: ZodUUID) => {
		items = items.filter((item) => item.id !== id);
	};

	$effect(() => {
		if (parseReceiptImage.result?.receipt) {
			items = parseReceiptImage.result.receipt.items.map((item) => ({
				name: item.name,
				price: item.price,
				id: uuidv4(),
				currency: item.currency,
				receiptSplit: defaultReceiptSplit
			}));

			storeName = parseReceiptImage.result.receipt.storeName;
			const parsedDate = new Date(parseReceiptImage.result.receipt.boughtAt);
			if (Math.abs(differenceInDays(parsedDate, new Date())) <= 30) {
				boughtAt = parsedDate;
			} else {
				boughtAt = new Date();
			}
			imageLoading = false;
		}
	});

	const addOrUpdateReceipt = async () => {
		const user = (await authClient.getSession())?.data?.user;
		if (!user) return;
		if (!group) return;

		if (receiptId && boughtById) {
			await patchReceipt({
				id: receiptId,
				storeName,
				boughtAt: boughtAt.toISOString(),
				groupId: group.id,
				boughtById: boughtById,
				items: items.map((item) => ({
					name: item.name,
					price: item.price,
					currency: item.currency,
					receiptSplit: item.receiptSplit
				}))
			});
		} else {
			await createReceipt({
				storeName,
				boughtAt: boughtAt.toISOString(),
				groupId: group.id,
				boughtById: user.id,
				items: items.map((item) => ({
					name: item.name,
					price: item.price,
					currency: item.currency,
					receiptSplit: item.receiptSplit
				}))
			});
		}
		items = [];
		storeName = '';
		boughtAt = new Date();
		goto(resolve(`/groups/${group.id}/expenses`));
	};

	const removeReceipt = async () => {
		if (!receiptId || !group) return;
		await deleteReceipt({ receiptId });
		goto(resolve(`/groups/${group.id}/expenses`));
	};
</script>

<dialog id="my_modal_2" class="modal" bind:this={splitModal}>
	<div class="modal-box rounded-sm">
		<h3 class="text-lg font-bold">Split: {items.findLast((i) => i.id == currentItem)?.name}</h3>
		{#each group?.members as member, idx (member.userId)}
			<div class="grid grid-cols-[1fr_auto_auto] items-center">
				<p>{member.user.name}</p>
				<div>
					<input
						class="split-input"
						type="number"
						min="0"
						max="100"
						step="1"
						value={items
							.findLast((i) => i.id == currentItem)
							?.receiptSplit.find((s) => s.userId == member.userId)?.splitPercentage || 0}
						onchange={handleSplitInputChange}
					/>%
				</div>
				<button onclick={() => removeSplitPercentage(idx)}><X size={16} /></button>
			</div>
		{/each}
		<div class="flex justify-end gap-4 pt-4">
			<button class="btn btn-outline" type="button" onclick={handleSplitCancel}> Close </button>
			<button
				class="btn btn-outline"
				type="button"
				onclick={handleSplitSave}
				disabled={splitErrorMsg !== ''}
			>
				Save
			</button>
		</div>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button>close</button>
	</form>
</dialog>

<div class="receipt">
	<div>
		<form
			bind:this={form}
			{...parseReceiptImage}
			enctype="multipart/form-data"
			class="grid justify-end"
		>
			<!-- form content goes here -->

			<!-- <input {...createReceipt.fields.prompt.as('text')} /> -->
			<input
				bind:this={fileInput}
				onchange={handleImageSelect}
				{...parseReceiptImage.fields.image.as('file')}
				hidden
			/>

			<button
				class="btn btn-outline"
				type="button"
				onclick={() => fileInput?.click()}
				aria-label="Upload image"
				disabled={imageLoading}
			>
				{#if imageLoading}
					<span class="loading loading-md loading-spinner"></span>
				{:else}
					<ImageUp size={18} />
				{/if}
			</button>
		</form>

		<input type="text" class="title" placeholder="Store" bind:value={storeName} />
	</div>
	<input
		type="date"
		class="date"
		value={boughtAtInput}
		onchange={(e) => {
			boughtAt = new Date(`${e.currentTarget.value}`);
		}}
	/>
	<div class="overflow-x-auto">
		<div class="items">
			<!-- head -->
			<div class="items_head">
				<div class="name item-title">Item</div>
				<div class="split item-title"><Split size={16} /></div>
				<div class="price-title item-title">
					{currency}
				</div>
			</div>

			<!-- body -->
			<div class="item-container">
				{#each items as item (item.id)}
					<div class="item-row" transition:slide>
						<div class="item-details">
							<input
								type="text"
								class="item name"
								autocomplete="off"
								required
								bind:value={item.name}
								bind:this={lastInput}
								onblur={(e) => {
									item.name = (e.target as HTMLInputElement).value;
									if (item.name.trim() === '') {
										deleteItem(item.id);
									}
								}}
							/>
							<div class="split">
								<span
									>{item.receiptSplit.filter((split) => split.splitPercentage !== 0).length}</span
								>
							</div>
							<input
								type="number"
								class="item price"
								value={(item.price / 100).toFixed(2)}
								onfocus={(e) => {
									(e.target as HTMLInputElement).select();
								}}
								onblur={(e) =>
									(item.price = Math.round(
										parseFloat((e.target as HTMLInputElement).value || '0') * 100
									))}
								inputmode="decimal"
							/>
						</div>
						<div class="item-actions">
							<button onclick={() => handleSplitItemClick(item.id)}>SPLIT</button>
							<button onclick={() => deleteItem(item.id)}>DELETE</button>
						</div>
					</div>
				{/each}
			</div>
			<div class="add-item">
				<button class="btn btn-outline" onclick={addItem}> <Plus size={16} /> Add Item </button>
			</div>
		</div>

		<div class="total">
			<div class="item name">Total {currency}</div>
			<div class="price-title item">{total}</div>
		</div>
		<div class="barcode">
			<div class="dark:invert"><Barcode /></div>

			<button class="btn btn-outline" disabled={!group} onclick={addOrUpdateReceipt}>
				{receiptId ? 'Update' : 'Add'} Receipt
			</button>
			{#if receiptId}
				<button class="btn btn-outline text-red-400" disabled={!group} onclick={removeReceipt}>
					Delete Receipt
				</button>
			{/if}
		</div>
	</div>
</div>
