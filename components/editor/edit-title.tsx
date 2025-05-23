// [start of components/editor/edit-title.tsx]
// import UIState from 'libs/web/state/ui'; // Removed as it's no longer used in this file
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
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Original logic for autoFocusTitle removed as the setting doesn't exist in Settings type.
    // If you want the title to focus by default in non-readonly mode, 
    // and not based on a specific setting, you could simplify this to:
    if (!readOnly && ref.current) {
      // ref.current.focus(); // You can uncomment this if you always want focus on mount when not readOnly
    }
  }, [readOnly, ref]);

  if (isLoading) {
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
