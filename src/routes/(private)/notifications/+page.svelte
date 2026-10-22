<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Banknote, BellOff, CheckCheck, HandCoins, UserPlus } from '@lucide/svelte';
	import { formatDistanceToNow } from 'date-fns';
	import { getNotifications, markNotificationsRead } from './notifications.remote';

	const notifications = $derived(await getNotifications());
	const hasUnread = $derived(notifications.some((n) => !n.readAt));

	type Notification = (typeof notifications)[number];

	function href(n: Notification) {
		if (n.entityId && n.type.startsWith('expense_') && n.type !== 'expense_deleted') {
			return resolve(`/groups/${n.groupId}/expenses/${n.entityId}`);
		}
		if (n.entityId && n.type.startsWith('payment_') && n.type !== 'payment_deleted') {
			return resolve(`/groups/${n.groupId}/payment/${n.entityId}`);
		}
		return resolve(`/groups/${n.groupId}`);
	}

	async function open(n: Notification) {
		if (!n.readAt) await markNotificationsRead({ ids: [n.id] });
		goto(href(n));
	}
</script>

<div class="grid gap-4">
	<div class="flex items-center justify-between">
		<h1 class="text-2xl">Notifications</h1>
		<button
			class="btn btn-outline btn-sm"
			disabled={!hasUnread}
			onclick={() => markNotificationsRead({})}
		>
			<CheckCheck size={16} />
			Mark all read
		</button>
	</div>

	{#if notifications.length === 0}
		<div class="flex flex-col items-center gap-2 py-10 opacity-60">
			<BellOff />
			<p>No notifications yet</p>
		</div>
	{:else}
		<ul class="grid gap-2">
			{#each notifications as n (n.id)}
				<li>
					<button
						class={'grid w-full grid-cols-[auto_1fr] items-center gap-3 border p-2 text-start shadow-md' +
							(n.readAt ? ' opacity-60' : ' bg-base-200')}
						onclick={() => open(n)}
					>
						<div class="indicator">
							{#if !n.readAt}
								<span class="indicator-item status status-primary"></span>
							{/if}
							{#if n.type.startsWith('expense_')}
								<HandCoins size={20} />
							{:else if n.type.startsWith('payment_')}
								<Banknote size={20} />
							{:else}
								<UserPlus size={20} />
							{/if}
						</div>
						<div>
							<p>
								<span class="font-semibold">{n.actor.name}</span>
								{n.message}
							</p>
							<p class="text-xs opacity-70">
								{n.group.name} · {formatDistanceToNow(n.createdAt, { addSuffix: true })}
							</p>
						</div>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
