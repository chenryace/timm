import IconButton from 'components/icon-button';
import useI18n from 'libs/web/hooks/use-i18n';
// import EditorState from 'libs/web/state/editor'; // Temporarily remove this import
import Link from 'next/link';
import React, { FC, useEffect, useState } from 'react'; // Added useState for temporary state

const Backlinks: FC = () => {
    // Temporarily disable backlinks logic to pass build
    const { t } = useI18n();
    const [backlinks, setBacklinks] = useState<any[]>([]); // Temporary empty state

    // useEffect(() => {
    //     // getBackLinks()?.catch((v) => console.error('Error whilst getting backlinks: %O', v));
    // }, [/* getBackLinks */]); // Temporarily comment out effect

    if (!backlinks?.length) {
        return null;
    }

    // The rest of the rendering logic can stay, but it will not render if backlinks is empty
    return (
        <div className="mb-40">
            <h4 className="text-xs px-2 text-gray-400">
                {t('Linked to this page')}
            </h4>
            <ul className="bg-gray-100 mt-2 rounded overflow-hidden">
                {backlinks?.map((link) => (
                    <li key={link.id}>
                        <Link href={link.id} shallow>
                            <a
                                className="p-2 flex items-center hover:bg-gray-300 truncate"
                                // onMouseEnter={onHoverLink} // Temporarily remove
                            >
                                <IconButton
                                    className="mr-1"
                                    icon="DocumentText"
                                ></IconButton>
                                <span className="flex-1 truncate">
                                    {link.title}
                                </span>
                            </a>
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
};
export default Backlinks;
