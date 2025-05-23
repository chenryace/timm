import { DetailedHTMLProps, InputHTMLAttributes, useEffect, useRef } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { useTranslation } from 'next-i18next';
import { Skeleton } from '@material-ui/lab'; 

interface Props {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  isLoading?: boolean;
  readOnly?: boolean;
  // Allow standard HTML attributes for TextareaAutosize, but we'll be careful with spreading
  customHtmlProps?: Omit<DetailedHTMLProps<InputHTMLAttributes<HTMLTextAreaElement>, HTMLTextAreaElement>, 'value' | 'onChange' | 'readOnly' | 'style' | 'className'>;
  className?: string;
  // style prop is removed from here to avoid passing it to TextareaAutosize directly
}

const EditTitle = ({
  value,
  onChange,
  isLoading = false,
  readOnly = false,
  customHtmlProps,
  className, // Use className passed from parent if any
}: Props) => {
  const { t } = useTranslation('common');
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!readOnly && ref.current) {
      // ref.current.focus(); // Uncomment if you always want focus on mount when not readOnly
    }
  }, [readOnly, ref]);

  // Combine the default className with any incoming className
  const combinedClassName = `w-full resize-none bg-transparent text-3xl font-bold outline-none ${className || ''}`.trim();

  if (isLoading) {
    return <Skeleton variant="text" width="70%" height={40} style={{ marginBottom: '8px' }} />;
  }

  return (
    <TextareaAutosize
      className={combinedClassName} // Apply classNames for styling
      // style prop is intentionally not passed to avoid type conflicts
      placeholder={t('Untitled')}
      value={value}
      onChange={onChange}
      ref={ref}
      maxRows={5}
      readOnly={readOnly}
      {...customHtmlProps} // Spread any other explicitly passed safe HTML attributes
    />
  );
};

export default EditTitle;
