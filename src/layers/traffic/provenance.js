/** Motion dots are algorithmic road simulations, NOT real vehicle telemetry.
 * Hide them in Jarvis live intelligence embeds even when road flow is live:
 * TomTom measures road speed, not the positions of individual automobiles.
 */
export function hideSimulatedVehiclePositions(search=globalThis.location?.search||''){
 const params=new URLSearchParams(search);
 return params.get('embed')==='1'&&params.get('jarvis')==='1';
}
