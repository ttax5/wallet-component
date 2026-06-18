<script lang="ts">
	import  listTransactions  from '../lib/Wallet.svelte';
	listTransactions.forEach(transaccion => {
    alert(`Tiene una nueva trasferencia de: ${transaccion}`);
  });
</script>


	<div class="p-4 ">
		<div class=" text-2xl font-bold mb-4 block px-4 py-2 font-medium text-center text-gray-700 rounded-t-lg dark:bg-gray-800 dark:text-white">
			Actividad
		</div>
		<ul>
			{#each listTransactions as transaccion}
				<li>{transaccion}</li>
			{/each}
		</ul>
	
	</div>

