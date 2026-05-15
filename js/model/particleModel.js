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
}
