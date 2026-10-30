import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const scenes=JSON.parse(fs.readFileSync(new URL('../src/data/archive-motion.json',import.meta.url),'utf8'));

test('every imported scene has unambiguous morph keys and resolvable typing targets',()=>{
 for(const scene of scenes)for(const state of scene.states){
  const keys=[...state.html.matchAll(/data-motion-key="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(new Set(keys).size,keys.length,`${state.id}: duplicate morph anchor`);
  for(const actor of state.actors){
   assert.ok(state.html.includes(`data-motion-actor="${actor.id}"`),`${state.id}: missing text target`);
   assert.equal(actor.steps[0].at,0);
   for(let i=1;i<actor.steps.length;i++)assert.ok(actor.steps[i].at>actor.steps[i-1].at,`${actor.id}: non-monotonic typing clock`);
   for(const step of actor.steps)assert.ok(Number.isFinite(step.width)&&step.width>0&&Number.isFinite(step.height)&&step.height>0);
  }
 }
});

test('all source images exist locally and archive templates contain no active controls',()=>{
 const assets=new Set();
 for(const scene of scenes)for(const state of scene.states){
  assert.doesNotMatch(state.html,/<(?:button|a|input|select|textarea|script)\b|https?:\/\/www\.figma\.com|\sonclick=/);
  for(const [,asset]of state.html.matchAll(/src="(\/images\/archive\/motion\/[^"?]+)"/g))assets.add(asset);
 }
 for(const asset of assets)assert.ok(fs.statSync(new URL('../public'+asset,import.meta.url)).size>0,asset);
});

test('literal code survives export without JSX fragments or evaluated template strings',()=>{
 for(const scene of scenes)for(const state of scene.states)assert.doesNotMatch(state.html,/&lt;\/?(?:span|div|p)\b|className=/,state.id);
 const final=scenes.find(s=>s.label==='Code alternatives').states.at(-1);
 const text=final.html.replace(/<[^>]*>/g,'');
 assert.ok(text.includes('Please wait ${5 - diffSec}s.'));
 assert.ok(text.includes('Last seen ${diffSec}s ago.'));
});
