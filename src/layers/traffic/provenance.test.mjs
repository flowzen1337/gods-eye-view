import test from 'node:test';
import assert from 'node:assert/strict';
import {hideSimulatedVehiclePositions} from './provenance.js';
import {readFileSync} from 'node:fs';
test('Jarvis embedded viewer never presents simulated vehicle positions as real data',()=>{
 assert.equal(hideSimulatedVehiclePositions('?embed=1&jarvis=1'),true);
 assert.equal(hideSimulatedVehiclePositions('?embed=1&jarvis=1&jarvis_full=1'),true);
 assert.equal(hideSimulatedVehiclePositions('?embed=1'),false);
 assert.equal(hideSimulatedVehiclePositions(''),false);
});
test('both street dots and detection VEH markers honor real-data-only policy',()=>{
 const dir=new URL('.',import.meta.url);
 const controls=readFileSync(new URL('controls.js',dir),'utf8');
 const lifecycle=readFileSync(new URL('lifecycle.js',dir),'utf8');
 assert.match(controls,/if \(hideSimulatedVehiclePositions\(\)\) return \[\]/);
 assert.match(lifecycle,/pointCollection\.show = !hideSimulatedVehiclePositions\(\)/);
});
