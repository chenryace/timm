import { useEffect, useRef, ChangeEvent } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { useTranslation } from 'next-i18next';
import { Skeleton } from '@material-ui/lab';

interface Props {
  value: string;
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void; // Corrected event type
  isLoading?: boolean;
  readOnly?: boolean;
  // customHtmlProps is not used in the TextareaAutosize below for now to avoid type issues
  // If it were to be used, its type and the imports above would need to be correct.
  // customHtmlProps?: Omit<React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLTextAreaElement>, HTMLTextAreaElement>, 'value' | 'onChange' | 'readOnly' | 'style' | 'className' | 'ref'>;
  className?: string;
}

const EditTitle = ({
  value,
  onChange,
  isLoading = false,
  readOnly = false,
  // customHtmlProps, // Not spreading for now
  className, // className is destructured
}: Props) => {
  const { t } = useTranslation('common');
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!readOnly && ref.current) {
      // ref.current.focus();
    }
  }, [readOnly, ref]);

  // className is used here
  const combinedClassName = `w-full resize-none bg-transparent text-3xl font-bold outline-none ${className || ''}`.trim();

  if (isLoading) {
    return <Skeleton variant="text" width="70%" height={40} style={{ marginBottom: '8px' }} />;
  }

  return (
    <TextareaAutosize
      className={combinedClassName} // className is used here
      placeholder={t('Untitled')}
      value={value}
      onChange={onChange}
      ref={ref}
      maxRows={5}
      readOnly={readOnly}
      // {...customHtmlProps} // Not spreading for now
    />
  );
};

export default EditTitle;
