import { useState, useEffect } from 'react';
import { Minus, Square, X, Maximize2 } from 'lucide-react';
import './TitleBar.css';

// Check if we're in Electron
const isElectron = typeof window !== 'undefined' && window.require;

export function TitleBar() {
    const [isMaximized, setIsMaximized] = useState(false);

    useEffect(() => {
        if (isElectron) {
            const { ipcRenderer } = window.require('electron');

            // Listen for maximize/unmaximize events
            const handleMaximize = () => setIsMaximized(true);
            const handleUnmaximize = () => setIsMaximized(false);

            window.addEventListener('maximize', handleMaximize);
            window.addEventListener('unmaximize', handleUnmaximize);

            return () => {
                window.removeEventListener('maximize', handleMaximize);
                window.removeEventListener('unmaximize', handleUnmaximize);
            };
        }
    }, []);

    const handleMinimize = () => {
        if (isElectron) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.send('minimize-window');
        }
    };

    const handleMaximize = () => {
        if (isElectron) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.send('maximize-window');
            setIsMaximized(!isMaximized);
        }
    };

    const handleClose = () => {
        if (isElectron) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.send('close-window');
        }
    };

    return (
        <div className="titlebar">
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
