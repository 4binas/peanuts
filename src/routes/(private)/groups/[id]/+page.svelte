<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { Plus } from '@lucide/svelte';
	import { getGroup } from './groupContext';
	import { getBalaceSheet } from './expenses/expenses.remote';

	const getGroupFn = getGroup();
	const group = $derived(getGroupFn());

	const balanceSheet = $derived(await (group?.id ? getBalaceSheet({ groupId: group.id }) : null));

	$effect(() => {
		console.log(balanceSheet);
	});
</script>

<!-- name of each tab group should be unique -->

<div class="grid gap-4">
	<button
		class="btn btn-outline"
		onclick={() => goto(resolve(`/groups/${page.params.id}/members`))}
	>
		<Plus /> Add Member
	</button>
	{#if group}
		<h1 class="text-2xl">Members</h1>
		<ul>
			{#each group.members as member (member.id)}
				<li>{member.user.name}</li>
			{/each}
		</ul>
	{/if}
	{#if group}
		<h1 class="text-2xl">Balance Sheet</h1>
		<ul>
			{#each group.members as member (member.id)}
				<li>
					<div class="flex justify-between">
						<div>
							{member.user.name}
						</div>
						<div>
							{(
								(balanceSheet?.find((s) => s.userId === member.userId)?.balanceCents ?? 0) / 100
							).toFixed(2)}
							{group.currency}
						</div>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>
