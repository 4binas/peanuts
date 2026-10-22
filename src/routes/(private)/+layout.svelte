<script lang="ts">
	import favicon from '$lib/assets/favicon.png';
	import { resolve } from '$app/paths';
	import { Bell, Birdhouse, Settings } from '@lucide/svelte';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { getUnreadCount } from './notifications/notifications.remote';

	let { children } = $props();
	const pathname = $derived(page.url.pathname);
	const unreadCount = $derived(await getUnreadCount());

	// Pick up notifications created by other group members
	onMount(() => {
		const interval = setInterval(() => getUnreadCount().refresh(), 60_000);
		return () => clearInterval(interval);
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="grid h-svh grid-rows-[1fr_auto]">
	<main class="overflow-y-auto px-5 pt-5">
		{@render children()}
	</main>

	<footer class="dock relative">
		<!-- <a class={pathname.startsWith('/receipt') ? 'dock-active' : ''} href={resolve('/receipt')}>
			<House />
			<span class="dock-label">Home</span>
		</a> -->

		<a class={pathname.startsWith('/groups') ? 'dock-active' : ''} href={resolve('/groups')}>
			<Birdhouse />
			<span class="dock-label">Groups</span>
		</a>

		<a
			class={pathname.startsWith('/notifications') ? 'dock-active' : ''}
			href={resolve('/notifications')}
		>
			<div class="indicator">
				{#if unreadCount > 0}
					<span class="indicator-item badge badge-xs badge-primary">
						{unreadCount > 99 ? '99+' : unreadCount}
					</span>
				{/if}
				<Bell />
			</div>
			<span class="dock-label">Notifications</span>
		</a>

		<a class={pathname.startsWith('/settings') ? 'dock-active' : ''} href={resolve('/settings')}>
			<Settings />
			<span class="dock-label">Settings</span>
		</a>
	</footer>
</div>
