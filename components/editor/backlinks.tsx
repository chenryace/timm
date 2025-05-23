import IconButton from 'components/icon-button';
import useI18n from 'libs/web/hooks/use-i18n';
import Link from 'next/link';
// Removed useEffect and useState as they are not used in this temporary version
import React, { FC } from 'react';

const Backlinks: FC = () => {
    const { t } = useI18n();

    // Temporarily an empty array for backlinks, as the logic is disabled.
    // This means the component will render nothing if this remains empty.
    const backlinks: any[] = [];

    // The original effect and state for fetching backlinks are currently commented out
    // or removed to pass the build. We will need to restore this functionality later.

    if (!backlinks?.length) {
        return null; // This will always be true with the current empty backlinks array
    }

    // Retaining the rendering structure for when backlinks are re-enabled.
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
