// Uses globals: buildDistinctColors (utils.js plain script)

export class DatasetModel {
  #datasets = {};
  #visibility = {};

  add(id, datasetObj) {
    // Imported history files keep the ID from the file they were saved in,
    // while AppState assigns a fresh ID for the current session.  All chart
    // datasets and tooltip lookups must use that fresh model key, otherwise the
    // left detail panel can find the series name but not its underlying data.
    datasetObj.id = id;
    this.#datasets[id] = datasetObj;
    this.#visibility[id] = true;
    this.reassignColors();
  }
  remove(id) {
    delete this.#datasets[id];
    delete this.#visibility[id];
    this.reassignColors();
  }

  /**
   * Spread dataset colours evenly around the hue wheel so they stay maximally
   * distinct — two datasets end up complementary, three 120° apart, and so on.
   * Runs whenever the set of datasets changes.
   */
  reassignColors() {
    const ids = Object.keys(this.#datasets);
    const colors = buildDistinctColors(ids.length);
    ids.forEach((id, i) => { this.#datasets[id].color = colors[i]; });
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
    this.reassignColors();
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
