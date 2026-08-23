<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { resolve } from '$app/paths';
	import { Birdhouse, Settings } from '@lucide/svelte';
	import { page } from '$app/state';

	let { children } = $props();
	const pathname = $derived(page.url.pathname);
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

		<a class={pathname.startsWith('/settings') ? 'dock-active' : ''} href={resolve('/settings')}>
			<Settings />
			<span class="dock-label">Settings</span>
		</a>
	</footer>
</div>
