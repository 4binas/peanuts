<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { ArrowDown10, ArrowDownUp, ArrowUp01, Download, Plus } from '@lucide/svelte';
	import { getGroup } from '../groupContext';
	import { getExpenses } from './expenses.remote';
	import { flip } from 'svelte/animate';
	import { exportJSON } from '$lib/client/util';

	const getGroupFn = getGroup();
	const group = $derived(getGroupFn());
	let expenses = $derived(await (group?.id ? getExpenses({ groupId: group.id }) : undefined));

	const sortModes = {
		boughtAt: 'Bought At',
		updatedAt: 'Updated At'
		// createdAt: 'Created At'
	} as const;

	const sortDirections = {
		asc: 'asc',
		desc: 'desc'
	} as const;

	let selectedSortMode = $derived(sortModes.updatedAt.toString());
	let sortDirection = $derived(sortDirections.desc.toString());

	const selectMode = (mode: string) => {
		selectedSortMode = mode;
		sortDirection = sortDirection == sortDirections.asc ? sortDirections.desc : sortDirections.asc;
	};

	let sortedExpenses = $derived.by(() => {
		if (!expenses) return undefined;

		const sorted = [...expenses];

		const sortFunction = (a: number, b: number) => {
			switch (sortDirection) {
				case sortDirections.asc:
					return a - b;
				default:
					return b - a;
			}
		};

		switch (selectedSortMode) {
			case sortModes.boughtAt:
				return sorted.sort((a, b) => sortFunction(a.boughtAt.getTime(), b.boughtAt.getTime()));

			// case sortModes.createdAt:
			// 	return sorted.sort((a, b) => sortFunction(a.createdAt.getTime(), b.createdAt.getTime()));

			case sortModes.updatedAt:
				return sorted.sort((a, b) => sortFunction(a.updatedAt.getTime(), b.updatedAt.getTime()));

			default:
				return sorted;
		}
	});
</script>

<div class="grid gap-4">
	<button
		class="btn btn-outline"
		onclick={() => goto(resolve(`/groups/${page.params.id}/expenses/add`))}
	>
		<Plus />
		Add Expense
	</button>
	<div class="flex items-center justify-between">
		<h1 class="text-2xl">Expenses</h1>
		<div>
			<button
				class="btn btn-outline"
				onclick={() =>
					expenses && exportJSON(expenses, `expenses_${new Date().toLocaleDateString()}`)}
			>
				<Download size={16} />
			</button>

			<div class="dropdown dropdown-end">
				<div tabindex="0" role="button" class="btn btn-outline">
					<ArrowDownUp size={16} />
				</div>
				<ul
					tabindex="-1"
					class="menu dropdown-content z-1 my-1 w-52 rounded-box border border-black bg-base-100 p-2 shadow-lg"
				>
					{#each Object.values(sortModes) as sortMode (sortMode)}
						<li animate:flip>
							<button
								class={sortMode === selectedSortMode ? 'menu-active' : ''}
								onclick={() => selectMode(sortMode)}
							>
								{#if sortDirection == sortDirections.desc}
									<ArrowDown10 />
								{:else}
									<ArrowUp01 />
								{/if}
								{sortMode}
							</button>
						</li>
					{/each}
				</ul>
			</div>
		</div>
	</div>
	{#if sortedExpenses && group}
		<ul class="grid gap-4">
			{#each sortedExpenses as expense (expense.id)}
				<li>
					<button
						class="grid w-full grid-cols-[1fr_1fr_1fr] border p-2 shadow-md"
						onclick={() => goto(resolve(`/groups/${page.params.id}/expenses/${expense.id}`))}
					>
						<div class="text-start">
							B: {new Date(expense.boughtAt).toLocaleDateString()}
						</div>
						<div class="text-center">
							{expense.storeName}
						</div>
						<div class="text-end">
							{expense.items.reduce((acc, item) => acc + item.price, 0) / 100}
							{expense.items[0]?.currency}
						</div>
						<div class="text-start">
							U: {new Date(expense.updatedAt).toLocaleDateString()}
						</div>
						<div class="col-span-2 text-end">
							By {group.members.find((m) => m.userId === expense.boughtById)?.user.name}
						</div>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
