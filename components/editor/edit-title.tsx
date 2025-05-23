import UIState from 'libs/web/state/ui';
import { DetailedHTMLProps, InputHTMLAttributes, useEffect, useRef } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { useTranslation } from 'next-i18next';
import { Skeleton } from '@material-ui/lab'; // Changed from @mui/material

interface Props {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  isLoading?: boolean;
  readOnly?: boolean; // Added to support readOnly mode
}

const EditTitle = ({
  value,
  onChange,
  isLoading = false,
  readOnly = false, // Initialize readOnly
  ...props
}: Props & DetailedHTMLProps<InputHTMLAttributes<HTMLTextAreaElement>, HTMLTextAreaElement>) => {
  const { t } = useTranslation('common');
  const { editorSettings } = UIState.useContainer();
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editorSettings.autoFocusTitle && ref.current && !readOnly) {
      ref.current.focus();
    }
  }, [editorSettings.autoFocusTitle, readOnly]);

  if (isLoading) {
    return <Skeleton variant="text" width="70%" height={40} sx={{ mb: 1 }} />;
  }

  return (
    <TextareaAutosize
      className="w-full resize-none bg-transparent text-3xl font-bold outline-none"
      placeholder={t('Untitled')}
      {...props}
      value={value}
      onChange={onChange}
      ref={ref}
      maxRows={5}
      readOnly={readOnly} // Apply readOnly to the textarea
    />
  );
};

export default EditTitle;
