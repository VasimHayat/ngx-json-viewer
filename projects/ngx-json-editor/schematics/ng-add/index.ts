import { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';

/** Peer dependencies a consuming app needs for the default editor setup. */
const PEER_DEPENDENCIES: Readonly<Record<string, string>> = {
  '@angular/cdk': '^20.0.0',
  primeng: '^20.0.0',
  '@primeng/themes': '^20.0.0',
  ajv: '^8.0.0',
  jmespath: '^0.16.0',
  codemirror: '^6.0.0',
  '@codemirror/state': '^6.0.0',
  '@codemirror/view': '^6.0.0',
  '@codemirror/lang-json': '^6.0.0',
};

const SETUP_NOTE = `
ngx-json-editor installed.

1) Provide PrimeNG + animations in your application config:

   import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
   import { providePrimeNG } from 'primeng/config';
   import Aura from '@primeng/themes/aura';

   providers: [provideAnimationsAsync(), providePrimeNG({ theme: { preset: Aura } })]

2) Use the component:

   import { NgxJsonEditorComponent } from '@vasimhayat007/ngx-json-editor';
   // template: <ngx-json-editor [(content)]="data" />
`;

/**
 * `ng add @vasimhayat007/ngx-json-editor` — add the peer dependencies a typical setup needs and
 * print guidance for wiring PrimeNG/animations. Idempotent: existing deps are
 * left untouched.
 */
export function ngAdd(): Rule {
  return (tree: Tree, context: SchematicContext): Tree => {
    const pkgPath = 'package.json';
    const raw = tree.read(pkgPath);
    if (!raw) {
      throw new Error('Could not find package.json in the workspace root.');
    }
    const pkg = JSON.parse(raw.toString('utf-8')) as {
      dependencies?: Record<string, string>;
    };
    pkg.dependencies = pkg.dependencies ?? {};
    let changed = false;
    for (const [name, version] of Object.entries(PEER_DEPENDENCIES)) {
      if (!pkg.dependencies[name]) {
        pkg.dependencies[name] = version;
        changed = true;
      }
    }
    if (changed) {
      tree.overwrite(pkgPath, JSON.stringify(pkg, null, 2));
      context.addTask(new NodePackageInstallTask());
    }
    context.logger.info(SETUP_NOTE);
    return tree;
  };
}
