<script lang="ts">
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import { addNotification } from '../stores/notifications';

	const dispatcher = createEventDispatcher();

	let scannerState: 'idle' | 'camera' | 'file' | 'simulation' = 'idle';
	let fileInput: HTMLInputElement;
	let dragActive = false;
	let scanningResult = '';
	
	// Para la cámara
	let videoEl: HTMLVideoElement;
	let canvasEl: HTMLCanvasElement;
	let stream: MediaStream | null = null;
	let animationFrameId: number;
	let jsQrLoaded = false;
	let cameraLoading = false;
	let cameraError = '';

	// Simulación
	let simQrValue = '';

	// Carga dinámica de la biblioteca jsQR para evitar problemas de empaquetado
	onMount(() => {
		if (typeof window !== 'undefined' && !window.hasOwnProperty('jsQR')) {
			const script = document.createElement('script');
			script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
			script.async = true;
			script.onload = () => {
				jsQrLoaded = true;
			};
			document.head.appendChild(script);
		} else {
			jsQrLoaded = true;
		}
	});

	onDestroy(() => {
		stopCamera();
	});

	// Activar cámara y stream
	async function startCamera() {
		scannerState = 'camera';
		cameraLoading = true;
		cameraError = '';
		
		try {
			// Detener cualquier stream anterior
			stopCamera();
			
			stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: 'environment' }
			});
			
			if (videoEl) {
				videoEl.srcObject = stream;
				videoEl.setAttribute('playsinline', 'true');
				videoEl.play();
				// Empezar bucle de procesamiento
				animationFrameId = requestAnimationFrame(scanFrame);
			}
			cameraLoading = false;
		} catch (e: any) {
			console.error(e);
			cameraLoading = false;
			cameraError = 'No se pudo acceder a la cámara. Concede permisos o usa la carga de imágenes.';
			addNotification('error', 'Error de Cámara', cameraError);
			scannerState = 'idle';
		}
	}

	function stopCamera() {
		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
		}
		if (stream) {
			stream.getTracks().forEach(track => track.stop());
			stream = null;
		}
	}

	// Procesar cada cuadro del feed de la cámara
	function scanFrame() {
		if (!videoEl || !canvasEl || scannerState !== 'camera') return;

		// @ts-ignore
		if (videoEl.readyState === videoEl.HAVE_ENOUGH_DATA && window.jsQR) {
			const ctx = canvasEl.getContext('2d');
			if (ctx) {
				canvasEl.height = videoEl.videoHeight;
				canvasEl.width = videoEl.videoWidth;
				ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
				
				const imageData = ctx.getImageData(0, 0, canvasEl.width, canvasEl.height);
				// @ts-ignore
				const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
					inversionAttempts: 'dontInvert'
				});

				if (code) {
					handleDecodedQr(code.data);
					return; // Detener escaneo
				}
			}
		}
		
		animationFrameId = requestAnimationFrame(scanFrame);
	}

	// Decodificar imagen cargada
	function handleFileUpload(e: Event) {
		const target = e.target as HTMLInputElement;
		const files = target.files;
		if (files && files.length > 0) {
			decodeImageFile(files[0]);
		}
	}

	function decodeImageFile(file: File) {
		const reader = new FileReader();
		reader.onload = (event) => {
			const img = new Image();
			img.onload = () => {
				const tempCanvas = document.createElement('canvas');
				const ctx = tempCanvas.getContext('2d');
				if (ctx) {
					tempCanvas.width = img.width;
					tempCanvas.height = img.height;
					ctx.drawImage(img, 0, 0);
					const imageData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
					
					// @ts-ignore
					if (window.jsQR) {
						// @ts-ignore
						const code = window.jsQR(imageData.data, imageData.width, imageData.height);
						if (code) {
							handleDecodedQr(code.data);
						} else {
							addNotification('error', 'Código No Detectado', 'No se pudo encontrar ningún código QR en la imagen cargada.');
						}
					} else {
						addNotification('error', 'Cargando Biblioteca', 'Espera a que se complete la carga del descodificador QR.');
					}
				}
			};
			img.src = event.target?.result as string;
		};
		reader.readAsDataURL(file);
	}

	// Arrastre de archivos
	function handleDrag(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		if (e.type === 'dragenter' || e.type === 'dragover') {
			dragActive = true;
		} else if (e.type === 'dragleave') {
			dragActive = false;
		}
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		dragActive = false;
		if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
			decodeImageFile(e.dataTransfer.files[0]);
		}
	}

	// Simulación manual
	function submitSimulation() {
		if (simQrValue && simQrValue.trim() !== '') {
			handleDecodedQr(simQrValue);
		} else {
			addNotification('error', 'Entrada vacía', 'Ingresa una URI de pago válida.');
		}
	}

	// Procesar QR decodificado final
	function handleDecodedQr(data: string) {
		stopCamera();
		scanningResult = data;
		addNotification('security', 'QR Detectado', 'Código QR descodificado con éxito.');
		
		// Parsear el string
		// Formato esperado: paxapos:pay?address=GD...&amount=10.5&asset=USDC&issuer=GB...&memo=Mesa4
		if (data.startsWith('paxapos:pay?')) {
			try {
				const paramsStr = data.substring(12);
				const params = new URLSearchParams(paramsStr);
				
				const decodedPayload = {
					recipient: params.get('address') || '',
					amount: parseFloat(params.get('amount') || '0'),
					assetCode: params.get('asset') || 'XLM',
					assetIssuer: params.get('issuer') || '',
					memo: decodeURIComponent(params.get('memo') || '')
				};

				dispatcher('scanSuccess', decodedPayload);
			} catch (err) {
				console.error(err);
				addNotification('error', 'Error de Formato', 'El QR no contiene datos válidos del protocolo de Paxapos.');
			}
		} else if (data.length === 56 && (data.startsWith('G') || data.startsWith('C'))) {
			// Es una clave pública cruda de Stellar
			dispatcher('scanSuccess', {
				recipient: data,
				amount: 0,
				assetCode: 'XLM',
				assetIssuer: '',
				memo: ''
			});
		} else {
			// Formato general
			addNotification('error', 'Formato Desconocido', 'El código QR contiene texto plano no reconocido.');
		}
	}
</script>

<div class="max-w-md m-auto bg-slate-900/40 border border-slate-800 backdrop-blur-md p-6 rounded-3xl shadow-2xl relative overflow-hidden animate-fadeIn">
	<h3 class="text-lg font-black text-slate-100 mb-2">Escáner de Pagos QR</h3>
	<p class="text-xs text-slate-400 mb-6">Escanea un código de cobro mediante cámara, subiendo una imagen o simulando datos.</p>

	{#if scannerState === 'idle'}
		<div class="space-y-3.5">
			<button 
				on:click={startCamera} 
				class="w-full flex items-center justify-center gap-3 p-4 bg-slate-950 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900 rounded-2xl transition-all group"
			>
				<div class="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:scale-105 transition-transform">
					<!-- Camera Icon -->
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
					</svg>
				</div>
				<div class="text-left">
					<h4 class="text-xs font-bold text-slate-200">Usar Cámara del Dispositivo</h4>
					<p class="text-[10px] text-slate-500 mt-0.5">Captura un código directamente desde la cámara.</p>
				</div>
			</button>

			<button 
				on:click={() => scannerState = 'file'}
				class="w-full flex items-center justify-center gap-3 p-4 bg-slate-950 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900 rounded-2xl transition-all group"
			>
				<div class="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:scale-105 transition-transform">
					<!-- File Icon -->
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
					</svg>
				</div>
				<div class="text-left">
					<h4 class="text-xs font-bold text-slate-200">Subir una Imagen de QR</h4>
					<p class="text-[10px] text-slate-500 mt-0.5">Arrastra una imagen o súbela desde tu explorador.</p>
				</div>
			</button>

			<button 
				on:click={() => scannerState = 'simulation'}
				class="w-full flex items-center justify-center gap-3 p-4 bg-slate-950 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900 rounded-2xl transition-all group"
			>
				<div class="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:scale-105 transition-transform">
					<!-- Terminal/Simulation Icon -->
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
					</svg>
				</div>
				<div class="text-left">
					<h4 class="text-xs font-bold text-slate-200">Simulación y Pruebas</h4>
					<p class="text-[10px] text-slate-500 mt-0.5">Pega texto de URIs de pago para pruebas veloces en escritorio.</p>
				</div>
			</button>
		</div>
	{:else if scannerState === 'camera'}
		<!-- Modo Cámara -->
		<div class="flex flex-col items-center">
			<div class="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-inner">
				{#if cameraLoading}
					<div class="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 gap-2">
						<div class="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
						<span class="text-[10px] text-slate-400 font-semibold">Iniciando cámara...</span>
					</div>
				{/if}

				<video bind:this={videoEl} class="w-full h-full object-cover">
					<!-- svelte-ignore a11y-media-has-caption -->
					<track kind="captions" />
				</video>
				
				<canvas bind:this={canvasEl} class="hidden"></canvas>
				
				<!-- Animación del cuadro de escaneo (Scanline) -->
				<div class="absolute inset-0 pointer-events-none flex items-center justify-center">
					<div class="w-48 h-48 border-2 border-indigo-500/40 rounded-3xl relative overflow-hidden flex items-center justify-center">
						<!-- Esquinas brillantes -->
						<div class="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-indigo-400"></div>
						<div class="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-indigo-400"></div>
						<div class="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-indigo-400"></div>
						<div class="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-indigo-400"></div>
						<!-- Scanline line -->
						<div class="w-full h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent absolute top-0 animate-scanline"></div>
					</div>
				</div>
			</div>

			<button 
				on:click={() => { stopCamera(); scannerState = 'idle'; }} 
				class="w-full py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold rounded-xl mt-4 border border-slate-700 transition-colors"
			>
				Volver Atrás
			</button>
		</div>
	{:else if scannerState === 'file'}
		<!-- Drag and Drop Image File -->
		<div class="space-y-4">
			<!-- svelte-ignore a11y-interactive-supports-focus -->
			<div
				class="w-full aspect-video border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-colors duration-200
				{dragActive ? 'border-indigo-500 bg-indigo-500/5' : 'border-slate-800 bg-slate-950/20 hover:border-slate-700'}"
				on:dragenter={handleDrag}
				on:dragover={handleDrag}
				on:dragleave={handleDrag}
				on:drop={handleDrop}
				on:click={() => fileInput.click()}
				role="button"
			>
				<input
					type="file"
					bind:this={fileInput}
					class="hidden"
					accept="image/*"
					on:change={handleFileUpload}
				/>
				<!-- Cloud upload icon -->
				<svg class="w-8 h-8 text-slate-500 mb-2 group-hover:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
				</svg>
				<span class="text-xs font-bold text-slate-300">Arrastra tu imagen QR aquí</span>
				<span class="text-[10px] text-slate-500 mt-1">O haz clic para explorar tus archivos</span>
			</div>

			<button 
				on:click={() => scannerState = 'idle'} 
				class="w-full py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors"
			>
				Volver Atrás
			</button>
		</div>
	{:else if scannerState === 'simulation'}
		<!-- Simulación -->
		<div class="space-y-4">
			<div>
				<label for="sim-qr-data" class="text-slate-400 text-xs font-semibold">Pegar URI de Pago QR</label>
				<input
					type="text"
					id="sim-qr-data"
					class="w-full bg-slate-950 border-slate-800 text-slate-200 text-xs px-3 py-2.5 rounded-xl mt-1.5 font-mono focus:border-indigo-500"
					bind:value={simQrValue}
					placeholder="paxapos:pay?address=GD..."
				/>
			</div>

			<div class="flex gap-3">
				<button 
					on:click={() => scannerState = 'idle'} 
					class="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors"
				>
					Volver
				</button>
				<button 
					on:click={submitSimulation} 
					class="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-505 text-white text-xs font-bold rounded-xl transition-all shadow-md"
				>
					Decodificar QR
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	@keyframes scanlineMove {
		0% {
			top: 0;
		}
		50% {
			top: 100%;
		}
		100% {
			top: 0;
		}
	}

	.animate-scanline {
		animation: scanlineMove 3s linear infinite;
	}
</style>
