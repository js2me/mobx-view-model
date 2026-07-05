import { describe, expect, it } from 'vitest';
import { PropertyEditor } from './property-editor';
import {
  createDevtoolsStub,
  createPropertyEditorHost,
  createPropertyListItemChain,
} from '../__tests__/helpers/mock-property-editor-host';

describe('PropertyEditor.applyEdit', () => {
  it('parses user input via eval for primitives', () => {
    const host = { flag: true };
    const item = createPropertyListItemChain([
      { property: 'flag', host },
    ]);
    const editor = new PropertyEditor(
      createPropertyEditorHost({
        item,
        devtools: createDevtoolsStub(),
        dataType: 'boolean',
      }),
    );

    editor.editContent = 'false';
    editor.applyEdit();

    expect(host.flag).toBe(false);
  });

  it('parses user input via eval for objects', () => {
    const host = { config: { canEdit: false } };
    const item = createPropertyListItemChain([
      { property: 'config', host },
    ]);
    const editor = new PropertyEditor(
      createPropertyEditorHost({
        item,
        devtools: createDevtoolsStub(),
        type: 'object',
        dataType: 'object',
      }),
    );

    editor.editContent = '{ canEdit: true, canDelete: false }';
    editor.applyEdit();

    expect(host.config).toEqual({ canEdit: true, canDelete: false });
  });
});
