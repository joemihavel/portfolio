import test from 'node:test';
import assert from 'node:assert/strict';
import { PianoEngine, pointsForEarly, GENEROUS_WINDOW_MS, LEAD_IN_MS } from '../src/game/piano/engine.ts';
import { pianoKeys, keyByCode, keyByMidi } from '../src/game/piano/keys.ts';
import { songs } from '../src/game/piano/songs.ts';
import { validName, rankedScores, demoScores } from '../src/game/piano/records.ts';
import { validateReplay } from '../src/game/piano/validation.ts';
import { PianoStorage } from '../src/game/piano/storage.ts';

const complete = (song, early = 0, wait = 0) => {
  const engine = new PianoEngine(song);
  while (!engine.ended) {
    const note = engine.current();
    engine.press(note.lane, engine.elapsed + Math.max(0, note.at - engine.position - early) + wait);
  }
  return engine;
};

test('all 15 labelled pitches match the physical white and black keyboard keys', () => {
  assert.deepEqual(pianoKeys.filter(k=>!k.black).map(k=>k.label), ['A','S','D','F','G','H','J','K','L']);
  assert.deepEqual(pianoKeys.filter(k=>k.black).map(k=>k.label), ['W','E','T','Y','U','O']);
  assert.equal(new Set(pianoKeys.map(k=>k.code)).size,15);
  assert.deepEqual([...pianoKeys].sort((a,b)=>a.midi-b.midi).map(k=>k.midi),Array.from({length:15},(_,i)=>i+60));
});
test('five distinct recognizable charts only use playable pitches', () => {
  assert.equal(songs.length,5);
  assert.equal(new Set(songs.map(s=>s.notes.map(n=>n.midi).join(','))).size,5);
  for(const song of songs) {
    assert.ok(song.notes.length>=12); let previous=-1;
    for(const note of song.notes) {
      assert.ok(note.beat>previous); assert.ok(note.duration>0);
      assert.equal(keyByMidi.get(note.midi).code,note.lane); assert.equal(keyByCode.get(note.lane).midi,note.midi);
      previous=note.beat;
    }
  }
  assert.deepEqual(songs[0].notes.slice(0,9).map(n=>n.midi),[69,68,69,68,69,64,67,65,62]);
  assert.deepEqual(songs[1].notes.slice(0,7).map(n=>n.midi),[60,60,67,67,69,69,67]);
  assert.deepEqual(songs[2].notes.slice(0,8).map(n=>n.midi),[64,64,65,67,67,65,64,62]);
  assert.deepEqual(songs[3].notes.slice(0,7).map(n=>n.midi),[64,62,60,62,64,64,64]);
  assert.deepEqual(songs[4].notes.slice(0,6).map(n=>n.midi),[64,62,60,64,62,60]);
  for(const song of songs.slice(3)) {
    assert.ok(new Set(song.notes.map(n=>n.midi)).size<=4);
    assert.ok(song.notes.every(n=>!keyByMidi.get(n.midi).black));
    assert.ok(song.bpm<=72);
  }
});
test('early timing only reduces points, with a broad full-points window and a positive floor', () => {
  assert.equal(GENEROUS_WINDOW_MS,450);
  for(const early of [-10000,0,45,100,450]) assert.equal(pointsForEarly(early),100);
  assert.ok(pointsForEarly(900)<100); assert.ok(pointsForEarly(1500)<pointsForEarly(900));
  assert.equal(pointsForEarly(1e6),40);
  const e=new PianoEngine(songs[0]), n=e.current();
  assert.equal(n.at,LEAD_IN_MS); assert.equal(e.press(n.lane,0).kind,'good');
  assert.ok(e.score>0&&e.score<100); assert.equal(e.next,1);
});
test('unplayed notes wait indefinitely instead of missing, skipping or ending the song', () => {
  const e=new PianoEngine(songs[2]),n=e.current();
  e.advance(120000); assert.equal(e.position,n.at); assert.equal(e.next,0);
  assert.equal(e.misses,0); assert.equal(e.ended,false);
  assert.equal(e.press(n.lane,180000).points,100); assert.equal(e.next,1);
});
test('wrong keys do not advance a note, lose points, or end a performance', () => {
  const e=new PianoEngine(songs[2]); e.press(e.current().lane,e.current().at);
  const expected=e.current(),score=e.score,wrong=pianoKeys.find(k=>k.code!==expected.lane).code;
  for(let i=0;i<30;i++) e.press(wrong,e.elapsed+10);
  assert.equal(e.next,1); assert.equal(e.score,score); assert.equal(e.ended,false);
  assert.equal(e.current().index,expected.index); e.press(expected.lane,e.elapsed+120000);
  assert.equal(e.score,score+100); assert.equal(e.next,2);
});
test('a note is resolved only once, repeated melody notes still require fresh inputs', () => {
  const e=new PianoEngine(songs[2]);
  e.press(e.current().lane,e.current().at); e.press(e.current().lane,e.current().at);
  assert.equal(e.next,2); assert.equal(e.score,200);
  e.press('KeyD',e.elapsed); assert.equal(e.next,2); assert.equal(e.score,200);
});
test('all five complete melodies are playable early, at tempo, or with long waits', () => {
  for(const song of songs) for(const [early,wait] of [[5000,0],[0,0],[0,2000]]) {
    const e=complete(song,early,wait), result=e.result();
    assert.equal(e.ended,true); assert.equal(result.matched,song.notes.length);
    assert.equal(result.total,song.notes.length); assert.equal(e.note(song.notes.length),null);
    assert.equal(e.visible().length,0); assert.ok(e.score>=song.notes.length*40&&e.score<=song.notes.length*100);
    assert.equal(result.maxSpeed,1); if(!early) assert.equal(e.score,song.notes.length*100);
    const attempts=e.attempts.length; assert.equal(e.press(song.notes[0].lane,e.elapsed+1),null);
    assert.equal(e.attempts.length,attempts);
  }
});
test('scoring and guided waits match API replay regardless of render frame rate', () => {
  const reference=new PianoEngine(songs[0]);
  while(!reference.ended) {
    const note=reference.current(), early=reference.next%4===0?800:0;
    const at=reference.elapsed+Math.max(0,note.at-reference.position-early)+(reference.next%7===0?2000:0);
    reference.press(note.lane,at);
  }
  for(const fps of [12,30,60,144]) {
    const e=new PianoEngine(songs[0]);
    for(const input of reference.attempts) {
      const step=1000/fps; for(let at=e.elapsed+step;at<input.at;at+=step)e.advance(at);
      e.press(input.code,input.at);
    }
    assert.deepEqual(e.result(),reference.result());
    assert.deepEqual(validateReplay(songs[0],e.attempts,e.elapsed),e.result());
  }
});
test('API verifies a full melody and rejects unfinished, malformed and post-completion input', () => {
  const song=songs[1],e=complete(song,900);
  assert.deepEqual(validateReplay(song,e.attempts,e.elapsed),e.result());
  assert.equal(validateReplay(song,e.attempts.slice(0,-1),e.elapsed),null);
  assert.equal(validateReplay(song,[...e.attempts,{code:'KeyA',at:e.elapsed}],e.elapsed),null);
  assert.equal(validateReplay(song,[{code:'KeyQ',at:0}],0),null);
  assert.equal(validateReplay(song,[{code:'KeyA',at:NaN}],0),null);
  assert.equal(validateReplay(song,[{code:'KeyA',at:500},{code:'KeyA',at:1}],500),null);
  assert.equal(validateReplay(song,e.attempts,e.elapsed+10),null);
  assert.equal(validateReplay(song,e.attempts,Infinity),null);
});
test('names are bounded, normalized and displayed as text; abuse checks avoid innocent substrings', () => {
  assert.equal(validName('  Joël  '),'Joël'); assert.equal(validName('Nishita'),'Nishita');
  for(const value of ['a','x'.repeat(21),'<img src=x>','fuck','f.u.c.k','Joe fuck','Nigger']) assert.equal(validName(value),null);
  assert.equal(validName('Ａａｒａｖ'),'Aarav');
});
test('rankings show only the top three, deduplicate and keep fictional examples explicit', () => {
  assert.ok(demoScores.every(s=>s.demo));
  for(const song of songs) {
    const rows=rankedScores([...demoScores,...demoScores],song.id);
    assert.equal(rows.length,3); assert.equal(new Set(rows.map(s=>s.id)).size,3);
    assert.ok(rows.every(s=>s.songId===song.id&&s.score<=song.notes.length*100));
    assert.ok(rows[0].score>=rows[1].score&&rows[1].score>=rows[2].score);
  }
  const rows=rankedScores(Array.from({length:15},(_,i)=>({...demoScores[0],id:'p-'+i,score:i*100})));
  assert.deepEqual(rows.map(s=>s.score),[1400,1300,1200]);
});
test('browser fallback uses a separate guided score store, persists and rejects duplicate saves', async t => {
  const oldFetch=globalThis.fetch,descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage'), memory=new Map();
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value)}});
  globalThis.fetch=async()=>new Response(JSON.stringify({error:'unavailable'}),{status:503});
  t.after(()=>{globalThis.fetch=oldFetch;if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);else delete globalThis.localStorage});
  memory.set('folio-piano-bests-v1',JSON.stringify({twinkle:99999})); memory.set('folio-piano-bests-v2','"corrupt"');
  const adapter=new PianoStorage(new AbortController().signal);
  assert.equal(adapter.best('twinkle'),0); assert.equal(adapter.remember('twinkle',100),true); assert.equal(adapter.best('twinkle'),100);
  const run=await adapter.start('twinkle'); assert.equal(run.mode,'local');
  const e=complete(songs[1]);
  const saved=await adapter.save(run,'Test Player',e.result(),e.attempts);
  assert.equal(saved.mode,'local'); assert.equal(saved.score.local,true);
  await assert.rejects(()=>adapter.save(run,'Test Player',e.result(),e.attempts),/already saved/);
  const reopened=new PianoStorage(new AbortController().signal);
  assert.equal(reopened.localScores().length,1); assert.equal((await reopened.leaderboard('twinkle')).mode,'local');
  assert.ok(memory.has('folio-piano-scores-v2')); assert.equal(JSON.parse(memory.get('folio-piano-bests-v1')).twinkle,99999);
});
