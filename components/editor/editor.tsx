// [start of components/editor/editor.tsx]
import type { EditorOptions } from '@tiptap/core';
import { EditorContent, EditorEvents, useEditor as useTipTapEditor } from '@tiptap/react'; // Added EditorContent
import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
// import { useDebouncedCallback } from 'use-debounce'; // Debouncing now handled in useEditor hook
import { useEditorState } from 'libs/web/state/editor'; // Corrected: useEditorState is the hook itself
import PortalState from 'libs/web/state/portal';
import UIState from 'libs/web/state/ui';
import extensions from './extensions';
import LinkToolbar from '../portal/link-toolbar';
import { Skeleton } from '@mui/material';

// const DEBOUNCE_INPUT_MS = 200; // Debounce logic moved to useEditor hook

interface Props {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  editable?: boolean;
  isLoading?: boolean;
  onSave?: () => void;
}

export interface EditorHandle {
  focus: () => void;
  showLinkToolbar: () => void;
}

const Editor = forwardRef<EditorHandle, Props>(
  ({ id, value, onChange, editable = true, isLoading = false, onSave }: Props, ref) => {
    const { editorSettings } = UIState.useContainer();
    const { setLinkToolbar } = PortalState.useContainer();
    const editorStateHook = useEditorState(); // Renamed for clarity if useEditor is from tiptap

    const editor = useTipTapEditor({
      editable,
      content: value,
      extensions: extensions(),
      editorProps: {
        attributes: {
          class: 'focus:outline-none prose dark:prose-invert max-w-none w-full',
        },
      },
      onUpdate: (props: EditorEvents['update']) => {
        // Directly call onChange prop when TipTap's content changes.
        // The actual debouncing and saving to IndexedDB is handled by the parent (useEditor hook).
        onChange(props.editor.getHTML());
      },
      // onCreate and onFocus/onBlur can be added if specific logic needed here
    });

    useEffect(() => {
      if (editor && !editor.isDestroyed && value !== editor.getHTML()) {
        // If the external value prop changes, update the editor content.
        // This ensures the editor is a controlled component.
        // Check focus to prevent cursor jumping if user is typing.
        if (!editor.isFocused) {
            editor.commands.setContent(value, false); // false to not emit update event from here
        }
      }
    }, [value, editor]);

    useEffect(() => {
      if (editor && editorStateHook.setEditor) {
        editorStateHook.setEditor(editor as any);
      }
      return () => {
        if (editorStateHook.setEditor) {
          editorStateHook.setEditor(undefined);
        }
      };
    }, [editor, editorStateHook.setEditor]);

    useEffect(() => {
      if (editor?.isDestroyed) return;
      editor?.setEditable(editable);
    }, [editable, editor]);

    useEffect(() => {
      if (editorSettings.autoFocusEditor && editor && !editor.isFocused && editable) {
        editor.commands.focus();
      }
    }, [editorSettings.autoFocusEditor, editor, editable]);

    useImperativeHandle(ref, () => ({
      focus() {
        editor?.commands.focus();
      },
      showLinkToolbar() {
        if (editor) {
          setLinkToolbar({ editor, show: true });
        }
      },
    }));

    if (isLoading) {
        return <Skeleton variant="rectangular" height={300} className="mt-4 mx-4" />;
    }

    return (
      <>
        {editor && <LinkToolbar editor={editor} />}
        <EditorContent editor={editor} className="flex-grow overflow-y-auto p-4" />
      </>
    );
  }
);

Editor.displayName = 'Editor';
export default Editor;
// [end of components/editor/editor.tsx]
