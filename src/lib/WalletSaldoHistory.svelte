<script lang="ts">
	export let listTransactions: any[] = [];
</script>

<div class="p-4 w-full max-w-md">
	<div
		class="text-2xl font-bold mb-4 block px-4 py-2 font-medium text-center text-gray-700 rounded-t-lg dark:bg-gray-800 dark:text-white"
	>
		Actividad
	</div>
	{#if !listTransactions || listTransactions.length === 0}
		<p class="text-center text-gray-500 py-4">No hay transacciones registradas</p>
	{:else}
		<ul class="divide-y divide-gray-200">
			{#each listTransactions as transaccion}
				<li class="py-2 text-sm text-gray-700 dark:text-gray-200">
					{typeof transaccion === 'object' ? (transaccion.data || JSON.stringify(transaccion)) : transaccion}
				</li>
			{/each}
		</ul>
	{/if}
</div>

