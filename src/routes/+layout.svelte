<script>
	import './layout.css';
	import favicon from '$lib/assets/favicon.png';
	// @ts-expect-error -- virtual module provided by vite-plugin-pwa
	import { pwaInfo } from 'virtual:pwa-info';
	import { onMount } from 'svelte';
	import { dev } from '$app/environment';

	let { children } = $props();
	const webManifest = $derived(pwaInfo ? pwaInfo.webManifest.linkTag : '');

	// Production only: the dev server has no generated service worker to register
	onMount(() => {
		if (dev || !('serviceWorker' in navigator)) return;
		navigator.serviceWorker
			.register('/sw.js', { scope: '/' })
			.catch((err) => console.error('Service worker registration failed', err));
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html webManifest}
</svelte:head>

{@render children()}
