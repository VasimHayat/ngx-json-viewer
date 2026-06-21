import { JsonPath, JsonValue, JsonValueType } from '@vasimhayat007/ngx-json-editor/core';
import { EditorMode } from './editor-content';

/**
 * Describes how to render a particular value inline (color swatch, link, image,
 * or fully custom). Registered via {@link NgxJsonEditorConfig.valueRenderers}.
 */
export interface ValueRenderer {
  /** Unique id, also used as a CSS hook. */
  readonly id: string;
  /** Return true if this renderer applies to the given value/path. */
  readonly test: (value: JsonValue, path: JsonPath) => boolean;
  /** What kind of inline affordance to draw. */
  readonly kind: 'color' | 'link' | 'image' | 'custom';
  /** For `custom`, optional component selector or template id resolved by host. */
  readonly component?: string;
}

/** Which toolbar buttons / features are available. All default to `true`. */
export interface FeatureToggles {
  readonly modes?: readonly EditorMode[];
  readonly format?: boolean;
  readonly compact?: boolean;
  readonly repair?: boolean;
  readonly sort?: boolean;
  readonly filter?: boolean;
  readonly transform?: boolean;
  readonly search?: boolean;
  readonly searchReplace?: boolean;
  readonly undoRedo?: boolean;
  readonly expandCollapseAll?: boolean;
  readonly contextMenu?: boolean;
  readonly dragDrop?: boolean;
  readonly multiSelect?: boolean;
  readonly importFile?: boolean;
  readonly importUrl?: boolean;
  readonly download?: boolean;
  readonly compare?: boolean;
  readonly statusBar?: boolean;
  readonly colorPicker?: boolean;
}

/** A single entry in the per-node context menu (used to customize/extend it). */
export interface ContextMenuAction {
  readonly id: string;
  readonly label?: string;
  readonly icon?: string;
  readonly separatorBefore?: boolean;
  /** Hide for nodes where this returns false. */
  readonly visible?: (value: JsonValue, path: JsonPath) => boolean;
}

/** Size/depth guards so a pathological document can't lock the UI. */
export interface EditorLimits {
  /** Above this many bytes, heavy ops are offloaded to a Web Worker. */
  readonly workerThresholdBytes?: number;
  /** Hard cap on document size accepted via import (bytes). 0 = unlimited. */
  readonly maxDocumentBytes?: number;
  /** Maximum nesting depth the tree will auto-expand. */
  readonly maxAutoExpandDepth?: number;
  /** Bounded undo/redo history length. */
  readonly historyLimit?: number;
}

/**
 * Feature configuration for {@link NgxJsonEditorComponent}. Every field is
 * optional; {@link DEFAULT_CONFIG} supplies defaults and the component merges
 * the consumer's partial over it.
 */
export interface NgxJsonEditorConfig {
  readonly features?: FeatureToggles;
  readonly contextMenu?: readonly ContextMenuAction[];
  readonly limits?: EditorLimits;
  readonly valueRenderers?: readonly ValueRenderer[];
  /** Default value type used when appending a new node. */
  readonly defaultNewValueType?: JsonValueType;
  /** When true, schema errors block edits; when false they are warn-only. */
  readonly schemaBlocking?: boolean;
  /** Show line numbers in text mode. */
  readonly lineNumbers?: boolean;
  /** Number of array/object children to render before "show more" paging. */
  readonly pageSize?: number;
}

/** Default configuration; the component deep-merges a consumer partial over this. */
export const DEFAULT_CONFIG: Required<
  Pick<
    NgxJsonEditorConfig,
    'features' | 'limits' | 'defaultNewValueType' | 'lineNumbers' | 'pageSize' | 'schemaBlocking'
  >
> = {
  features: {
    modes: ['tree', 'text', 'table'],
    format: true,
    compact: true,
    repair: true,
    sort: true,
    filter: true,
    transform: true,
    search: true,
    searchReplace: true,
    undoRedo: true,
    expandCollapseAll: true,
    contextMenu: true,
    dragDrop: true,
    multiSelect: true,
    importFile: true,
    importUrl: true,
    download: true,
    compare: true,
    statusBar: true,
    colorPicker: true,
  },
  limits: {
    workerThresholdBytes: 512 * 1024,
    maxDocumentBytes: 0,
    maxAutoExpandDepth: 2,
    historyLimit: 200,
  },
  defaultNewValueType: 'string',
  schemaBlocking: false,
  lineNumbers: true,
  pageSize: 200,
};
