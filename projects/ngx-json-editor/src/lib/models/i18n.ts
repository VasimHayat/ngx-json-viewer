/**
 * All user-facing strings, injectable so host apps can localize. Ship `en`
 * defaults via {@link DEFAULT_I18N}; consumers pass a `Partial<EditorI18n>`
 * through the `i18n` input and it is merged over the defaults.
 */
export interface EditorI18n {
  // Modes
  modeTree: string;
  modeText: string;
  modeTable: string;
  modeLabel: string;

  // Toolbar
  format: string;
  compact: string;
  repair: string;
  sort: string;
  filter: string;
  transform: string;
  undo: string;
  redo: string;
  search: string;
  searchReplace: string;
  expandAll: string;
  collapseAll: string;
  copy: string;
  copyCompact: string;
  copyFormatted: string;
  copyPath: string;
  download: string;
  importFile: string;
  importUrl: string;
  compare: string;

  // Context menu
  insertBefore: string;
  insertAfter: string;
  append: string;
  duplicate: string;
  remove: string;
  extract: string;
  cut: string;
  paste: string;
  convertType: string;

  // Search
  searchPlaceholder: string;
  replacePlaceholder: string;
  matchesOf: string; // "{current} of {total}"
  noMatches: string;
  next: string;
  previous: string;
  replaceOne: string;
  replaceAll: string;

  // Dialogs (sort/filter/transform/schema/compare)
  ok: string;
  cancel: string;
  apply: string;
  close: string;
  sortBy: string;
  sortKeys: string;
  sortValues: string;
  ascending: string;
  descending: string;
  recursive: string;
  filterPath: string;
  filterOperator: string;
  filterValue: string;
  transformQuery: string;
  transformPreview: string;
  transformQueryLabel: string;
  schemaTitle: string;

  // Value types
  typeObject: string;
  typeArray: string;
  typeString: string;
  typeNumber: string;
  typeBoolean: string;
  typeNull: string;

  // Status bar
  statusSize: string;
  statusErrors: string;
  statusSelection: string;
  statusValid: string;

  // Misc
  emptyDocument: string;
  parseError: string;
  itemsCount: string; // "{count} items"
  propertiesCount: string; // "{count} properties"
}

/** English defaults shipped with the library. */
export const DEFAULT_I18N: EditorI18n = {
  modeTree: 'Tree',
  modeText: 'Text',
  modeTable: 'Table',
  modeLabel: 'Mode',

  format: 'Format',
  compact: 'Compact',
  repair: 'Repair',
  sort: 'Sort',
  filter: 'Filter',
  transform: 'Transform',
  undo: 'Undo',
  redo: 'Redo',
  search: 'Search',
  searchReplace: 'Search & replace',
  expandAll: 'Expand all',
  collapseAll: 'Collapse all',
  copy: 'Copy',
  copyCompact: 'Copy (compact)',
  copyFormatted: 'Copy (formatted)',
  copyPath: 'Copy path',
  download: 'Download',
  importFile: 'Open file',
  importUrl: 'Load from URL',
  compare: 'Compare',

  insertBefore: 'Insert before',
  insertAfter: 'Insert after',
  append: 'Append',
  duplicate: 'Duplicate',
  remove: 'Remove',
  extract: 'Extract',
  cut: 'Cut',
  paste: 'Paste',
  convertType: 'Convert to',

  searchPlaceholder: 'Find…',
  replacePlaceholder: 'Replace with…',
  matchesOf: '{current} of {total}',
  noMatches: 'No results',
  next: 'Next',
  previous: 'Previous',
  replaceOne: 'Replace',
  replaceAll: 'Replace all',

  ok: 'OK',
  cancel: 'Cancel',
  apply: 'Apply',
  close: 'Close',
  sortBy: 'Sort by',
  sortKeys: 'Keys',
  sortValues: 'Values',
  ascending: 'Ascending',
  descending: 'Descending',
  recursive: 'Recursive',
  filterPath: 'Path',
  filterOperator: 'Operator',
  filterValue: 'Value',
  transformQuery: 'Query',
  transformPreview: 'Preview',
  transformQueryLabel: 'JMESPath query',
  schemaTitle: 'Schema validation',

  typeObject: 'Object',
  typeArray: 'Array',
  typeString: 'String',
  typeNumber: 'Number',
  typeBoolean: 'Boolean',
  typeNull: 'Null',

  statusSize: 'Size',
  statusErrors: 'Errors',
  statusSelection: 'Selection',
  statusValid: 'Valid',

  emptyDocument: 'Empty document',
  parseError: 'Invalid JSON',
  itemsCount: '{count} items',
  propertiesCount: '{count} properties',
};
