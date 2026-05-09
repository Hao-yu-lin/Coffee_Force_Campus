export class AppState {
  #activeId = null;
  #counter = 0;
  #scores = {};

  getActiveId() { return this.#activeId; }
  setActiveId(id) { this.#activeId = id; }
  isActive(id) { return this.#activeId === id; }

  nextDatasetId() { return `dataset_${this.#counter++}`; }
  setCounter(n) { this.#counter = n; }

  getAffectiveScores() { return { ...this.#scores }; }
  setAffectiveScore(section, score) { this.#scores[section] = score; }
  clearAffectiveScores() { this.#scores = {}; }
  replaceAffectiveScores(scores) { this.#scores = { ...scores }; }
}
