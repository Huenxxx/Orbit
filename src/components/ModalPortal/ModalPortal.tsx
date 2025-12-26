import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

interface ModalPortalProps {
    children: ReactNode;
}

/**
 * Renders children inside the modal-portal container via React Portal.
 * This ensures modals are positioned correctly using position: fixed
 * relative to the viewport/window.
 */
export function ModalPortal({ children }: ModalPortalProps) {
    // Use the portal container in index.html
    const modalRoot = document.getElementById('modal-portal');

    if (!modalRoot) {
        // Fallback: render in place if modal-portal doesn't exist
        console.warn('modal-portal element not found, rendering in place');
        return <>{children}</>;
    }

    return createPortal(children, modalRoot);
}
