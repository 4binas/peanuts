<script>
	import './layout.css';
	import favicon from '$lib/assets/favicon.png';
	// @ts-expect-error -- virtual module provided by vite-plugin-pwa
	import { pwaInfo } from 'virtual:pwa-info';

	let { children } = $props();
	const webManifest = $derived(pwaInfo ? pwaInfo.webManifest.linkTag : '');
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html webManifest}
</svelte:head>

{@render children()}
