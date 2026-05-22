// ES Module — Particle Size Distribution dataset model

export class ParticleModel {
  #datasets = {};
  #visibility = {};
  #counter = 0;

  nextId() {
    return `particle_${++this.#counter}`;
  }

  add(id, ds) {
    this.#datasets[id] = ds;
    this.#visibility[id] = true;
  }

  remove(id) {
    delete this.#datasets[id];
    delete this.#visibility[id];
  }

  get(id) {
    return this.#datasets[id];
  }

  getAll() {
    return { ...this.#datasets };
  }

  getAllVisibility() {
    return { ...this.#visibility };
  }

  getVisible() {
    return Object.keys(this.#datasets)
      .filter(id => this.#visibility[id])
      .map(id => ({ id, ...this.#datasets[id] }));
  }

  isVisible(id) {
    return !!this.#visibility[id];
  }

  setVisibility(id, v) {
    this.#visibility[id] = v;
  }

  setAllVisibility(v) {
    Object.keys(this.#datasets).forEach(id => {
      this.#visibility[id] = v;
    });
  }

  getIds() {
    return Object.keys(this.#datasets);
  }

  count() {
    return Object.keys(this.#datasets).length;
  }

  /**
   * Replace all datasets at once (used by load-history).
   * Also resets the internal counter so new datasets won't collide with restored IDs.
   */
  replaceAll(datasets, visibility) {
    this.#datasets   = { ...datasets };
    this.#visibility = {};
    Object.keys(this.#datasets).forEach(id => {
      this.#visibility[id] = visibility?.[id] ?? true;
    });
    // Set counter past the highest restored ID number
    this.#counter = Object.keys(datasets)
      .map(id => parseInt(id.replace('particle_', '')) || 0)
      .reduce((m, n) => Math.max(m, n), 0);
  }
}
