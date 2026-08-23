<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { getGroup } from '../../groupContext';
	import { createPayment, deletePayment, getPayment } from '../add/payment.remote';
	const getGroupFn = getGroup();
	const group = $derived(getGroupFn());

	let {
		paymentId = undefined,
		userId = undefined
	}: { paymentId: string | undefined; userId: string | undefined } = $props();
	const payment = $derived(paymentId ? getPayment({ paymentId }) : undefined);

	$effect(() => {
		if (!paymentId) {
			createPayment.fields.fromUserId.set(userId);
		}
	});
</script>

{#if group}
	<form
		{...createPayment}
		class="grid gap-4"
		onsubmit={() => goto(resolve(`/groups/${group.id}/payment`))}
	>
		<input {...createPayment.fields.paymentId.as('text')} value={paymentId} hidden />
		<input {...createPayment.fields.groupId.as('text')} value={group.id} hidden />
		<fieldset class="fieldset">
			<label class="label" for="name">From:</label>
			<select
				class="select w-full border border-black"
				{...createPayment.fields.fromUserId.as('select')}
			>
				{#each group.members as member (member.id)}
					<option
						value={member.userId}
						selected={payment ? member.userId == payment.current?.fromUserId : undefined}
						>{member.user.name}
					</option>
				{/each}
			</select>
		</fieldset>
		<fieldset class="fieldset">
			<label class="label" for="name">To:</label>
			<select
				class="select-outline select w-full border border-black"
				{...createPayment.fields.toUserId.as('select')}
			>
				{#each group.members.filter((m) => m.userId !== createPayment.fields.fromUserId.value()) as member (member.id)}
					<option
						value={member.userId}
						selected={payment ? member.userId == payment.current?.toUserId : undefined}
					>
						{member.user.name}
					</option>
				{/each}
			</select>
		</fieldset>
		<fieldset class="fieldset">
			<label class="label" for="amount">Amount:</label>
			<div class="join grid w-full grid-cols-[1fr_auto]">
				<input
					class="input join-item w-full border border-black"
					placeholder="Amount"
					step="0.01"
					{...createPayment.fields.amount.as('number')}
					value={payment?.current?.amount ? payment.current.amount / 100 : undefined}
				/>
				<select
					class="select join-item w-full border border-black"
					{...createPayment.fields.currency.as('text')}
					value={payment?.current?.currency || 'CHF'}
				>
					<option value="CHF" selected>CHF</option>
				</select>
			</div>
		</fieldset>
		<fieldset class="fieldset w-full">
			<label class="label w-full" for="description">Description:</label>
			<textarea
				class="textarea w-full border border-black"
				{...createPayment.fields.description.as('text')}
				placeholder="Description"
				value={payment?.current?.description}></textarea>
		</fieldset>
		<button class="btn btn-outline" type="submit">{paymentId ? 'Update' : 'Add'} Payment</button>
		{#if paymentId}
			<button
				class="btn btn-outline text-red-400"
				type="submit"
				onclick={() => deletePayment({ paymentId })}>Delete Payment</button
			>
		{/if}
	</form>
{/if}
