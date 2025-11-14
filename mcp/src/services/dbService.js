import fs from 'fs/promises';
import path from 'path';

class JsonDatabase {
  constructor(baseDir, dbPath = 'database.json') {
    this.baseDir = baseDir;
    this.dbPath = path.isAbsolute(dbPath) ? dbPath : path.join(baseDir, dbPath);
    this.data = null;
  }

  async load() {
    try {
      const raw = await fs.readFile(this.dbPath, 'utf-8');
      this.data = JSON.parse(raw);
    } catch (_) {
      this.data = {
        company: {},
        workers: [],
        risk_analysis: false,
        operational_mode: false,
      };
    }
    return this.data;
  }

  async save() {
    await fs.mkdir(path.dirname(this.dbPath), { recursive: true });
    await fs.writeFile(this.dbPath, JSON.stringify(this.data, null, 2), 'utf-8');
    return true;
  }

  async upsertWorker(worker) {
    if (!this.data) await this.load();
    const first = (worker && worker.first_name) || '';
    const last = (worker && worker.last_name) || '';
    if (!first || !last) throw new Error('worker must include first_name and last_name');

    const idx = (this.data.workers || []).findIndex(
      (w) => (w.first_name || '') === first && (w.last_name || '') === last
    );

    if (idx >= 0) {
      this.data.workers[idx] = worker;
      return { action: 'updated', index: idx };
    } else {
      this.data.workers.push(worker);
      return { action: 'added', index: this.data.workers.length - 1 };
    }
  }
}

export default JsonDatabase;
