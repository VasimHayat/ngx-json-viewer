import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { json } from '@codemirror/lang-json';
import {
  bracketMatching,
  defaultHighlightStyle,
  foldGutter,
  foldKeymap,
  indentUnit,
  syntaxHighlighting,
} from '@codemirror/language';
import { Diagnostic, lintGutter, setDiagnostics } from '@codemirror/lint';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { Compartment, EditorState, Extension } from '@codemirror/state';
import {
  EditorView,
  drawSelection,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
} from '@codemirror/view';
import { CodeEditorAdapter, CodeEditorHandle, CodeEditorOptions, EditorDiagnostic } from './tokens';

/**
 * Default code editor adapter backed by CodeMirror 6. Syntax highlighting, line
 * numbers, bracket matching, code folding, search, and lint-gutter diagnostics.
 * Colors are driven by the editor's `--nje-*` CSS custom properties so the code
 * editor follows the same theme tokens as the rest of the component.
 */
export class CodeMirrorAdapter implements CodeEditorAdapter {
  mount(options: CodeEditorOptions): CodeEditorHandle {
    const editable = new Compartment();
    const themeC = new Compartment();
    const indentC = new Compartment();

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        options.onChange?.(update.state.doc.toString());
      }
    });

    const state = EditorState.create({
      doc: options.initialValue,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        foldGutter(),
        drawSelection(),
        indentC.of(indentUnit.of(indentString(options.indentation))),
        EditorState.allowMultipleSelections.of(true),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...completionKeymap,
          indentWithTab,
        ]),
        json(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        lintGutter(),
        EditorView.lineWrapping,
        updateListener,
        editable.of(EditorView.editable.of(!options.readOnly)),
        themeC.of(buildTheme(!!options.dark)),
      ],
    });

    const view = new EditorView({ state, parent: options.parent });
    options.onReady?.();

    return {
      getValue: () => view.state.doc.toString(),
      setValue: (value: string) => {
        if (value === view.state.doc.toString()) {
          return;
        }
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: value },
        });
      },
      setReadOnly: (readOnly: boolean) => {
        view.dispatch({
          effects: editable.reconfigure(EditorView.editable.of(!readOnly)),
        });
      },
      setDark: (dark: boolean) => {
        view.dispatch({ effects: themeC.reconfigure(buildTheme(dark)) });
      },
      setDiagnostics: (diagnostics: readonly EditorDiagnostic[]) => {
        const docLen = view.state.doc.length;
        const cm: Diagnostic[] = diagnostics.map((d) => ({
          from: clamp(d.from, docLen),
          to: clamp(Math.max(d.to, d.from), docLen),
          severity: d.severity,
          message: d.message,
        }));
        view.dispatch(setDiagnostics(view.state, cm));
      },
      focus: () => view.focus(),
      destroy: () => view.destroy(),
    };
  }
}

function clamp(n: number, max: number): number {
  return Math.max(0, Math.min(n, max));
}

function indentString(indentation: number | 'tab' | undefined): string {
  if (indentation === 'tab') {
    return '\t';
  }
  return ' '.repeat(typeof indentation === 'number' ? indentation : 2);
}

/** A CodeMirror theme whose colors resolve from the host's `--nje-*` tokens. */
function buildTheme(dark: boolean): Extension {
  return EditorView.theme(
    {
      '&': {
        color: 'var(--nje-fg)',
        backgroundColor: 'var(--nje-bg)',
        height: '100%',
        fontSize: 'var(--nje-font-size)',
      },
      '.cm-content': {
        fontFamily: 'var(--nje-font-mono)',
        caretColor: 'var(--nje-accent)',
      },
      '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--nje-accent)' },
      '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
        backgroundColor: 'var(--nje-bg-selected)',
      },
      '.cm-gutters': {
        backgroundColor: 'var(--nje-bg-subtle)',
        color: 'var(--nje-fg-faint)',
        border: 'none',
        borderRight: '1px solid var(--nje-border)',
      },
      '.cm-activeLine': { backgroundColor: 'var(--nje-bg-hover)' },
      '.cm-activeLineGutter': { backgroundColor: 'var(--nje-bg-hover)' },
      '.cm-lint-marker-error': { content: '""' },
    },
    { dark },
  );
}
