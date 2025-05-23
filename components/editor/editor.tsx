import type { Editor } from '@tiptap/core'; // Removed EditorOptions as it was unused
import { EditorContent, EditorEvents, useEditor as useTipTapEditor } from '@tiptap/react';
import React, { forwardRef, useEffect, useImperativeHandle } from 'react'; // Removed useState as it was unused
import { useEditorState } from 'libs/web/state/editor';
import PortalState from 'libs/web/state/portal';
import UIState from 'libs/web/state/ui';
import extensions from './extensions';
import LinkToolbar from '../portal/link-toolbar';
import { Skeleton } from '@mui/material';

interface Props {
  _id?: string; // Renamed from id to indicate it might be unused if linter complains
  value: string;
  onChange: (value: string) => void;
  editable?: boolean;
  isLoading?: boolean;
  _onSave?: () => void; // Renamed from onSave
}

export interface EditorHandle {
  focus: () => void;
  showLinkToolbar: () => void;
}

const EditorComponent = forwardRef<EditorHandle, Props>(
  ({ _id, value, onChange, editable = true, isLoading = false, _onSave }: Props, ref) => {
    const { editorSettings } = UIState.useContainer();
    const { setLinkToolbar } = PortalState.useContainer();
    const editorStateHook = useEditorState();

    const tiptapEditor = useTipTapEditor({
      editable,
      content: value,
      extensions: extensions(),
      editorProps: {
        attributes: {
          class: 'focus:outline-none prose dark:prose-invert max-w-none w-full',
        },
      },
      onUpdate: (props: EditorEvents['update']) => {
        onChange(props.editor.getHTML());
      },
    });

    useEffect(() => {
      if (tiptapEditor && !tiptapEditor.isDestroyed && value !== tiptapEditor.getHTML()) {
        if (!tiptapEditor.isFocused) {
            tiptapEditor.commands.setContent(value, false);
        }
      }
    }, [value, tiptapEditor]);

    useEffect(() => {
      if (tiptapEditor && editorStateHook.setEditor) {
        editorStateHook.setEditor(tiptapEditor as any); // Cast to any if types are complex or for simplicity
      }
      // No cleanup for setEditor(undefined) here, as useEditor hook might manage its own lifecycle
      // or it's managed by tiptapEditor's own unmount.
    }, [tiptapEditor, editorStateHook.setEditor]); // editorStateHook.setEditor might be stable, but good to list

    useEffect(() => {
      if (tiptapEditor?.isDestroyed) return;
      tiptapEditor?.setEditable(editable);
    }, [editable, tiptapEditor]);

    useEffect(() => {
      if (editorSettings.autoFocusEditor && tiptapEditor && !tiptapEditor.isFocused && editable) {
        tiptapEditor.commands.focus();
      }
    }, [editorSettings.autoFocusEditor, tiptapEditor, editable]);

    useImperativeHandle(ref, () => ({
      focus() {
        tiptapEditor?.commands.focus();
      },
      showLinkToolbar() {
        if (tiptapEditor) {
          setLinkToolbar({ editor: tiptapEditor as Editor, show: true }); // Ensure type compatibility for editor here
        }
      },
    }));

    if (isLoading) {
        return <Skeleton variant="rectangular" height={300} className="mt-4 mx-4" />;
    }

    return (
      <>
        {tiptapEditor && <LinkToolbar editor={tiptapEditor} />}
        <EditorContent editor={tiptapEditor} className="flex-grow overflow-y-auto p-4" />
      </>
    );
  }
);

EditorComponent.displayName = 'Editor';
export default EditorComponent;
