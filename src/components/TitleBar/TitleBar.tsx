import { useState, useEffect } from 'react';
import { Minus, Square, X, Maximize2 } from 'lucide-react';
import { ipc } from '../../services/ipc';
import './TitleBar.css';

export function TitleBar() {
    const [isMaximized, setIsMaximized] = useState(false);

    const handleMinimize = () => ipc.invoke('window-minimize');
    const handleMaximize = () => {
        ipc.invoke('window-maximize');
        setIsMaximized(!isMaximized);
    };
    const handleClose = () => ipc.invoke('window-close');

    // Manual drag handler for WebView2
    const handleMouseDown = (e: React.MouseEvent) => {
        // Only drag on left click and if not clicking a button
        if (e.button === 0 && !(e.target as HTMLElement).closest('button')) {
            ipc.invoke('window-drag');
        }
    };

    return (
        <div className="titlebar" onMouseDown={handleMouseDown}>
            <div className="titlebar-drag">
                <div className="titlebar-logo">
                    <div className="orbit-icon">
                        <div className="orbit-ring"></div>
                        <div className="orbit-core"></div>
                    </div>
                    <span className="titlebar-title">ORBIT</span>
                </div>
            </div>

            <div className="titlebar-controls">
                <button
                    className="titlebar-btn"
                    onClick={handleMinimize}
                    aria-label="Minimize"
                >
                    <Minus size={14} />
                </button>
                <button
                    className="titlebar-btn"
                    onClick={handleMaximize}
                    aria-label={isMaximized ? 'Restore' : 'Maximize'}
                >
                    {isMaximized ? <Square size={12} /> : <Maximize2 size={14} />}
                </button>
                <button
                    className="titlebar-btn titlebar-btn-close"
                    onClick={handleClose}
                    aria-label="Close"
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    );
}
