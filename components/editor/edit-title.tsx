import UIState from 'libs/web/state/ui';
import { DetailedHTMLProps, InputHTMLAttributes, useEffect, useRef } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { useTranslation } from 'next-i18next';
import { Skeleton } from '@material-ui/lab'; 

interface Props {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  isLoading?: boolean;
  readOnly?: boolean;
}

const EditTitle = ({
  value,
  onChange,
  isLoading = false,
  readOnly = false,
  ...props
}: Props & DetailedHTMLProps<InputHTMLAttributes<HTMLTextAreaElement>, HTMLTextAreaElement>) => {
  const { t } = useTranslation('common');
  // Correctly access the nested settings object
  const { settings: settingsFromHook } = UIState.useContainer(); 
  const { settings } = settingsFromHook; // This 'settings' holds the actual Settings type
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Use the correctly accessed autoFocusTitle
    if (settings?.autoFocusTitle && ref.current && !readOnly) {
      ref.current.focus();
    }
    // Add settings or settings.autoFocusTitle to dependency array
  }, [settings?.autoFocusTitle, readOnly, ref]);

  if (isLoading) {
    // Ensure Skeleton is correctly imported and used if this isLoading state is still relevant
    return <Skeleton variant="text" width="70%" height={40} style={{ marginBottom: '8px' }} />;
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
      readOnly={readOnly}
    />
  );
};

export default EditTitle;
