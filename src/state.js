export const state = {
  DL: null,
  corsiCache: null,
  filter: 'all',
  sortBy: null,
  selectedEdition: null,
  plFilter: 'all',
  plHideMargine: false,
  plViewMode: 'grouped',
  plSortBy: 'margine',
  plSortDir: 'desc',
  qaExpanded: null,
  search: '',
  prodViewMode: 'year',
  b2gFilter: 'all',
  b2b2cFilter: 'all',
  year: '26/27',
};

export function setDL(data) {
  state.DL = data;
  state.corsiCache = null;
}

export function clearCorsiCache() {
  state.corsiCache = null;
}
