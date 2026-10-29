<script lang="ts">
	import { onMount } from 'svelte';

	// @ts-expect-error
	import { default as QrCode } from 'qrious';

	const QRcode = new QrCode();

	export let value: string;
	export let errorCorrection: 'L' | 'H' | 'M' = 'L';
	export let background = '#fff';
	export let color = '#000';
	export let size = '200';
	export let padding = 0;
	export let className = 'qrcode';

	let image = '';

	function generateQrCode() {
		QRcode.set({
			background,
			foreground: color,
			level: errorCorrection,
			padding,
			size,
			value,
		});

		image = QRcode.toDataURL('image/jpeg');
	}

	export function getImage() {
		return image;
	}

	$: {
		if (value) {
			generateQrCode();
		}
	}

	onMount(() => {
		generateQrCode();
	});
</script>

<img 
	src={image} 
	title={value} 
	alt="Código QR de cobro: {value}" 
	class="w-full max-w-[190px] sm:max-w-[240px] h-auto object-contain block mx-auto {className}" 
/>
