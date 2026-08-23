<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { Download, MoveRight, Plus } from '@lucide/svelte';
	import { listPayments } from './add/payment.remote';
	import { getGroup } from '../groupContext';
	import { exportJSON } from '$lib/client/util';

	let groupFn = getGroup();
	let group = $derived(groupFn());

	let payments = $derived(page.params.id ? await listPayments({ groupId: page.params.id }) : []);
</script>

<div class="grid gap-4">
	<button
		class="btn btn-outline"
		onclick={() => goto(resolve(`/groups/${page.params.id}/payment/add`))}
	>
		<Plus />
		Add Payment
	</button>

	<div class="flex items-center justify-between">
		<h1 class="text-2xl">Payments</h1>
		<button
			class="btn btn-outline"
			onclick={() =>
				payments && exportJSON(payments, `payments_${new Date().toLocaleDateString()}`)}
		>
			<Download size={16} />
		</button>
	</div>
	{#if payments && group}
		<ul class="grid gap-4">
			{#each payments as payment (payment.id)}
				<li>
					<button
						class="grid w-full grid-cols-[1fr_1fr_1fr] border p-2 shadow-md"
						onclick={() => goto(resolve(`/groups/${group.id}/payment/${payment.id}`))}
					>
						<div class="col-span-3 flex items-center justify-center gap-2">
							{group.members.find((m) => m.userId === payment.fromUserId)?.user.name}
							<MoveRight size={16} />
							{group.members.find((m) => m.userId === payment.toUserId)?.user.name}
						</div>
						<div class="text-start">
							{new Date(payment.createdAt).toLocaleDateString()}
						</div>
						<div class="text-center"></div>
						<div class="text-end">
							{payment.amount / 100}
							{payment.currency}
						</div>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
