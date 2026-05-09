export class DatasetModel {
  #datasets = {};
  #visibility = {};

  add(id, datasetObj) {
    this.#datasets[id] = datasetObj;
    this.#visibility[id] = true;
  }
  remove(id) {
    delete this.#datasets[id];
    delete this.#visibility[id];
  }
  get(id) { return this.#datasets[id]; }
  getAll() { return { ...this.#datasets }; }
  getAllVisibility() { return { ...this.#visibility }; }
  getVisible() {
    return Object.keys(this.#datasets)
      .filter(id => this.#visibility[id])
      .map(id => this.#datasets[id]);
  }
  isVisible(id) { return !!this.#visibility[id]; }
  setVisibility(id, visible) { this.#visibility[id] = visible; }
  setAllVisibility(visible) {
    Object.keys(this.#datasets).forEach(id => this.#visibility[id] = visible);
  }
  getIds() { return Object.keys(this.#datasets); }
  count() { return Object.keys(this.#datasets).length; }
  replaceAll(datasets, visibility) {
    this.#datasets = { ...datasets };
    this.#visibility = { ...visibility };
    // Ensure every dataset has a visibility entry
    Object.keys(this.#datasets).forEach(id => {
      if (this.#visibility[id] === undefined) this.#visibility[id] = true;
    });
  }
  setParam(id, key, value) {
    if (this.#datasets[id]) this.#datasets[id][key] = value;
  }
  setParams(id, paramObj) {
    if (this.#datasets[id]) Object.assign(this.#datasets[id], paramObj);
  }
  saveCVAState(id, descriptive, affective) {
    if (this.#datasets[id]) {
      this.#datasets[id].cva_descriptive = descriptive;
      this.#datasets[id].cva_affective = affective;
    }
  }
}
