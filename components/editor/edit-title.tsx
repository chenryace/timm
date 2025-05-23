// [start of components/editor/edit-title.tsx]
import UIState from 'libs/web/state/ui';
import { DetailedHTMLProps, InputHTMLAttributes, useEffect, useRef } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { useTranslation } from 'next-i18next';
import { Skeleton } from '@mui/material'; // For loading state

interface Props {
  // value and onChange are now explicitly managed for controlled component behavior
  value: string;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  isLoading?: boolean; // Optional loading prop
}

const EditTitle = ({
  value,
  onChange,
  isLoading = false,
  ...props
}: Props & DetailedHTMLProps<InputHTMLAttributes<HTMLTextAreaElement>, HTMLTextAreaElement>) => {
  const { t } = useTranslation('common');
  const { editorSettings } = UIState.useContainer();
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editorSettings.autoFocusTitle && ref.current) {
      ref.current.focus();
    }
  }, [editorSettings.autoFocusTitle]);

  if (isLoading) {
    return <Skeleton variant="text" width="70%" height={40} sx={{ mb: 1 }} />;
  }

  return (
    <TextareaAutosize
      className="w-full resize-none bg-transparent text-3xl font-bold outline-none"
      placeholder={t('Untitled')}
      {...props}
      value={value} // Ensure value is passed
      onChange={onChange} // Ensure onChange is passed
      ref={ref}
      maxRows={5}
    />
  );
};

export default EditTitle;
// [end of components/editor/edit-title.tsx]
