
// IPC Bridge for Orbit (Transitioning from Electron to WebView2)

interface IpcRequest {
    id: string;
    channel: string;
    payload: any;
}

interface IpcResponse {
    id: string;
    success: boolean;
    data?: any;
    error?: string;
}

const pendingRequests = new Map<string, { resolve: (data: any) => void; reject: (err: any) => void }>();

// Listen for messages from C#
if ((window as any).chrome?.webview) {
    (window as any).chrome.webview.addEventListener('message', (event: any) => {
        const response: IpcResponse = event.data;
        if (response && response.id && pendingRequests.has(response.id)) {
            const { resolve, reject } = pendingRequests.get(response.id)!;
            if (response.success) {
                resolve(response.data);
            } else {
                reject(response.error);
            }
            pendingRequests.delete(response.id);
        }
    });
}

export const ipc = {
    invoke: async (channel: string, payload?: any): Promise<any> => {
        // WebView2 Mode
        if ((window as any).chrome?.webview) {
            const id = crypto.randomUUID();
            const request: IpcRequest = { id, channel, payload };

            return new Promise((resolve, reject) => {
                pendingRequests.set(id, { resolve, reject });
                (window as any).chrome.webview.postMessage(request);
            });
        }

        // Fallback: Electron Mode (Legacy support during migration)
        if ((window as any).require) {
            try {
                const { ipcRenderer } = (window as any).require('electron');
                return await ipcRenderer.invoke(channel, payload);
            } catch (e) {
                console.warn('Electron IPC not available:', e);
            }
        }

        console.warn(`IPC Call [${channel}] skipped: No backend bridge found.`);
        return null; // Mock return for development without backend
    }
};
