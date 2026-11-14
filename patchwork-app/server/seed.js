// Seeds the idea catalogue (always refreshed) and a demo account matching the Figma sample data.
// Run `npm run seed` to wipe the database and start fresh.
import bcrypt from 'bcryptjs';
import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Demo account for local testing (also documented in README.md).
export const DEMO_EMAIL = 'fatima@example.com';
export const DEMO_PASSWORD = 'patchwork123';

export async function seed() {
  const { db, tx } = await import('./db.js');
  const { IDEAS, STORIES } = await import('./catalog.js');

  tx(() => {
    const up = db.prepare(`INSERT INTO ideas (id,title,summary,category,minutes,difficulty,materials,steps,substitutes,tags,safety)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET title=excluded.title, summary=excluded.summary, category=excluded.category,
        minutes=excluded.minutes, difficulty=excluded.difficulty, materials=excluded.materials, steps=excluded.steps,
        substitutes=excluded.substitutes, tags=excluded.tags, safety=excluded.safety`);
    for (const i of IDEAS) {
      up.run(i.id, i.title, i.summary, i.category, i.minutes, i.difficulty, JSON.stringify(i.materials),
        JSON.stringify(i.steps), JSON.stringify(i.substitutes), JSON.stringify(i.tags), i.safety);
    }
    const st = db.prepare(`INSERT INTO stories (id,title,author,category,idea_id,summary,body,lesson) VALUES (?,?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET title=excluded.title, author=excluded.author, category=excluded.category,
        idea_id=excluded.idea_id, summary=excluded.summary, body=excluded.body, lesson=excluded.lesson`);
    for (const s of STORIES) st.run(s.id, s.title, s.author, s.category, s.idea_id, s.summary, s.body, s.lesson);
  });

  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(DEMO_EMAIL)) return;

  const hash = bcrypt.hashSync(DEMO_PASSWORD, 10);
  tx(() => {
    const { lastInsertRowid: uid } = db.prepare(`INSERT INTO users (name,email,password_hash,interests,skill_level,onboarded,preferences)
      VALUES (?,?,?,?,?,1,?)`).run('Fatima', DEMO_EMAIL, hash, JSON.stringify(['home', 'garden', 'food']), 'Beginner',
      JSON.stringify({ time: '120', budget: '500', difficulty: 'Easy', type: 'any' }));

    const addRes = db.prepare('INSERT INTO resources (user_id,name,category,quantity,unit,condition,location,notes) VALUES (?,?,?,?,?,?,?,?)');
    const r = {};
    for (const [key, name, cat, qty, unit, cond, loc, notes] of [
      ['cardboard', 'Cardboard sheets', 'Paper', 4, 'sheets', 'Good', 'Store room', 'Flattened delivery boxes.'],
      ['jars', 'Glass jars', 'Glass', 6, 'jars', 'Good', 'Kitchen shelf', 'Clean; lids included. Check rims for chips.'],
      ['cotton', 'Cotton offcuts', 'Fabric', 12, 'pieces', 'Good', 'Sewing box', '100% cotton scraps from old shirts.'],
      ['usb', 'USB cables', 'Electronics', 3, 'cables', 'Good', 'Desk drawer', 'All three tested and working.'],
      ['rice', 'Rice', 'Food', 1, 'kg', 'New', 'Pantry', ''],
      ['tools', 'Basic tools', 'Tools', 1, 'set', 'Good', 'Toolbox', 'Scissors, screwdriver, needle and thread.'],
    ]) r[key] = Number(addRes.run(uid, name, cat, qty, unit, cond, loc, notes).lastInsertRowid);

    const save = db.prepare('INSERT INTO saved_ideas (user_id, idea_id) VALUES (?,?)');
    for (const id of ['jar-herb-garden', 'cardboard-caddy', 'cable-tidy', 'jar-pen-holder']) save.run(uid, id);

    const proj = db.prepare(`INSERT INTO projects (user_id,idea_id,title,status,steps_done,budget,cost_recorded,reused_items,completed_at)
      VALUES (?,?,?,?,?,?,?,?,?)`);
    proj.run(uid, 'jar-herb-garden', 'Jar herb garden', 'active', JSON.stringify([true, true, false, false]), 500, null, '[]', null);
    proj.run(uid, 'desk-organiser', 'Desk organiser', 'active', JSON.stringify([true, false, false, false]), 300, null, '[]', null);
    proj.run(uid, 'cable-tidy', 'Cable tidy', 'completed', JSON.stringify([true, true, true, true]), 0, 0,
      JSON.stringify([{ resourceId: r.cotton, name: 'Cotton offcuts', qty: 3 }, { resourceId: r.cardboard, name: 'Cardboard sheets', qty: 1 }]), "datetime('now','-12 days')");
    proj.run(uid, 'jar-pen-holder', 'Jar pen holder', 'completed', JSON.stringify([true, true, true, true]), 0, 0,
      JSON.stringify([{ resourceId: r.jars, name: 'Glass jars', qty: 1 }, { resourceId: r.cotton, name: 'Cotton offcuts', qty: 2 }]), "datetime('now','-5 days')");
    db.exec(`UPDATE projects SET completed_at = datetime('now', '-' || (8 - id) || ' days') WHERE status = 'completed'`);
  });
}

// CLI: node server/seed.js [--reset]
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--reset')) {
    const { DB_PATH } = await import('./db.js').then((m) => { m.db.close(); return m; });
    for (const f of [DB_PATH, `${DB_PATH}-wal`, `${DB_PATH}-shm`]) rmSync(f, { force: true });
    // Re-open a fresh database in a child import cycle by re-running this script without --reset.
    const { execFileSync } = await import('node:child_process');
    execFileSync(process.execPath, [fileURLToPath(import.meta.url)], { stdio: 'inherit' });
    console.log('Database reset.');
  } else {
    await seed();
    console.log(`Seeded. Demo login: ${DEMO_EMAIL}`);
  }
}
