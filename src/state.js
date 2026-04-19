export const state = {
  DL: null,
  corsiCache: null,
  filter: 'all',
  sortBy: null,
  selectedEdition: null,
  plFilter: 'all',
  qaExpanded: null,
};

export function setDL(data) {
  state.DL = data;
  state.corsiCache = null;
}

export function clearCorsiCache() {
  state.corsiCache = null;
}
