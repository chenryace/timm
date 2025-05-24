import { DetailedHTMLProps, InputHTMLAttributes, useEffect, useRef, CSSProperties } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { useTranslation } from 'next-i18next';
import { Skeleton } from '@material-ui/lab';

interface Props {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  isLoading?: boolean;
  readOnly?: boolean;
  customHtmlProps?: Omit<DetailedHTMLProps<InputHTMLAttributes<HTMLTextAreaElement>, HTMLTextAreaElement>, 'value' | 'onChange' | 'readOnly' | 'style' | 'className' | 'ref'>;
  className?: string; // className prop is defined
}

const EditTitle = ({
  value,
  onChange,
  isLoading = false,
  readOnly = false,
  customHtmlProps,
  className, // Destructured here
}: Props) => {
  const { t } = useTranslation('common');
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!readOnly && ref.current) {
      // ref.current.focus(); // Uncomment if you always want focus on mount when not readOnly
    }
  }, [readOnly, ref]);

  // className is used here to construct combinedClassName
  const combinedClassName = `w-full resize-none bg-transparent text-3xl font-bold outline-none ${className || ''}`.trim();

  if (isLoading) {
    return <Skeleton variant="text" width="70%" height={40} style={{ marginBottom: '8px' }} />;
  }

  return (
    <TextareaAutosize
      className={combinedClassName} // combinedClassName (which uses className) is applied here
      placeholder={t('Untitled')}
      value={value}
      onChange={onChange}
      inputRef={ref} // Using inputRef as per previous fix for TextareaAutosize
      maxRows={5}
      readOnly={readOnly}
      {...customHtmlProps}
    />
  );
};

export default EditTitle;
