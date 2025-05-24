import { DetailedHTMLProps, InputHTMLAttributes, useEffect, useRef } from 'react';
import TextareaAutosize from 'react-textarea-autosize'; // Make sure this is the correct import if it's namespaced
import { useTranslation } from 'next-i18next';
import { Skeleton } from '@material-ui/lab'; 

interface Props {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  isLoading?: boolean;
  readOnly?: boolean;
  customHtmlProps?: Omit<DetailedHTMLProps<InputHTMLAttributes<HTMLTextAreaElement>, HTMLTextAreaElement>, 'value' | 'onChange' | 'readOnly' | 'style' | 'className' | 'ref'>;
  className?: string;
}

const EditTitle = ({
  value,
  onChange,
  isLoading = false,
  readOnly = false,
  customHtmlProps,
  className,
}: Props) => {
  const { t } = useTranslation('common');
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!readOnly && ref.current) {
      // ref.current.focus(); // Uncomment if you always want focus on mount when not readOnly
    }
  }, [readOnly, ref]);

  const combinedClassName = `w-full resize-none bg-transparent text-3xl font-bold outline-none \${className || ''}`.trim();

  if (isLoading) {
    return <Skeleton variant="text" width="70%" height={40} style={{ marginBottom: '8px' }} />;
  }

  return (
    <TextareaAutosize
      className={combinedClassName}
      placeholder={t('Untitled')}
      value={value}
      onChange={onChange}
      inputRef={ref} // Changed from ref={ref} to inputRef={ref}
      maxRows={5}
      readOnly={readOnly}
      {...customHtmlProps}
    />
  );
};

export default EditTitle;
