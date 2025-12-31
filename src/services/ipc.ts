/**
 * IPC Bridge for Orbit - C# WPF + WebView2
 * Provides communication between React frontend and C# backend
 */

interface IpcRequest {
    id: string;
    channel: string;
    payload?: unknown;
}

interface IpcResponse {
    id: string;
    success: boolean;
    data?: unknown;
    error?: string;
}

declare global {
    interface Window {
        chrome?: {
            webview?: {
                postMessage: (message: string) => void;
                addEventListener: (type: string, handler: (event: { data: string }) => void) => void;
                removeEventListener: (type: string, handler: (event: { data: string }) => void) => void;
            };
        };
        csharp?: {
            invoke: (channel: string, payload?: unknown) => Promise<unknown>;
            minimize: () => Promise<void>;
            maximize: () => Promise<void>;
            close: () => Promise<void>;
            drag: () => Promise<void>;
        };
    }
}

const pendingRequests = new Map<string, { resolve: (data: unknown) => void; reject: (err: Error) => void }>();

// Listen for messages from C# (raw WebView2 messages)
if (window.chrome?.webview) {
    window.chrome.webview.addEventListener('message', (event) => {
        try {
            const response: IpcResponse = typeof event.data === 'string'
                ? JSON.parse(event.data)
                : event.data;

            if (response && response.id && pendingRequests.has(response.id)) {
                const { resolve, reject } = pendingRequests.get(response.id)!;
                pendingRequests.delete(response.id);

                if (response.success) {
                    resolve(response.data);
                } else {
                    reject(new Error(response.error || 'Unknown IPC error'));
                }
            }
        } catch (e) {
            console.error('[IPC] Error parsing response:', e);
        }
    });
}

/**
 * Main IPC interface for communicating with C# backend
 */
export const ipc = {
    /**
     * Invoke a C# backend method
     * @param channel - The IPC channel name (e.g., 'window-minimize', 'astra-start-service')
     * @param payload - Optional data to send
     * @returns Promise with the response data
     */
    invoke: async <T = unknown>(channel: string, payload?: unknown): Promise<T | null> => {
        // Method 1: Use injected csharp bridge (preferred)
        if (window.csharp?.invoke) {
            try {
                return await window.csharp.invoke(channel, payload) as T;
            } catch (e) {
                console.error(`[IPC] Error on channel "${channel}":`, e);
                throw e;
            }
        }

        // Method 2: Direct WebView2 postMessage
        if (window.chrome?.webview) {
            const id = crypto.randomUUID();
            const request: IpcRequest = { id, channel, payload };

            return new Promise<T>((resolve, reject) => {
                pendingRequests.set(id, {
                    resolve: resolve as (data: unknown) => void,
                    reject
                });

                // Send as JSON string
                window.chrome!.webview!.postMessage(JSON.stringify(request));

                // Timeout after 30 seconds
                setTimeout(() => {
                    if (pendingRequests.has(id)) {
                        pendingRequests.delete(id);
                        reject(new Error(`[IPC] Timeout on channel "${channel}"`));
                    }
                }, 30000);
            });
        }

        // Development mode: No backend available
        console.warn(`[IPC] No backend available. Channel "${channel}" was not executed.`);
        return null;
    },

    // Convenience methods for window controls
    minimize: () => ipc.invoke('window-minimize'),
    maximize: () => ipc.invoke('window-maximize'),
    close: () => ipc.invoke('window-close'),
    drag: () => ipc.invoke('window-drag'),

    // Astra overlay controls
    astra: {
        startService: () => ipc.invoke<{ success: boolean; message: string }>('astra-start-service'),
        stopService: () => ipc.invoke<{ success: boolean; message: string }>('astra-stop-service'),
        getStatus: () => ipc.invoke<{
            serviceRunning: boolean;
            clientConnected: boolean;
            inGame: boolean;
            port: number;
        }>('astra-get-status'),
        getSummoner: () => ipc.invoke<{
            displayName: string;
            summonerId: number;
            accountId: number;
            profileIconId: number;
            summonerLevel: number;
            profileIconUrl: string;
        } | null>('astra-get-summoner'),
        getRanked: () => ipc.invoke<{
            soloTier: string;
            soloDivision: string;
            soloLP: number;
            soloWins: number;
            soloLosses: number;
            soloWinRate: number;
            flexTier: string;
            flexDivision: string;
        } | null>('astra-get-ranked'),
        getChampSelect: () => ipc.invoke<{
            isInChampSelect: boolean;
            gameId?: number;
            assignedPosition?: string;
            championId?: number;
            phase?: string;
            timeRemaining?: number;
            myTeamBans?: number[];
            enemyTeamBans?: number[];
        }>('astra-get-champ-select'),
        getOwnedChampions: () => ipc.invoke<Array<{
            id: number;
            name: string;
            alias: string;
        }>>('astra-get-owned-champions'),
        getChampionRoles: (championId: number) => ipc.invoke<string[]>('astra-get-champion-roles', championId),
        importRunes: (name: string, primaryStyleId: number, subStyleId: number, selectedPerkIds: number[]) =>
            ipc.invoke<{ success: boolean }>('astra-import-runes', { name, primaryStyleId, subStyleId, selectedPerkIds }),
        importSpells: (spell1Id: number, spell2Id: number) =>
            ipc.invoke<{ success: boolean }>('astra-import-spells', { spell1Id, spell2Id }),
        importItems: (championId: number, itemSet: any) =>
            ipc.invoke<{ success: boolean }>('astra-import-items', { championId, itemSet }),

        // Build system functions
        getBuildsForRole: (role: string) => ipc.invoke<Array<{
            championId: number;
            name: string;
            role: string;
            tier: string;
            winRate: number;
            pickRate: number;
            banRate: number;
            primaryTree: number;
            secondaryTree: number;
            keystone: number;
            primaryRunes: number[];
            secondaryRunes: number[];
            statShards: number[];
            spell1: number;
            spell2: number;
            starterItems: string[];
            coreItems: string[];
            situationalItems: string[];
            boots: string;
            skillOrder: string;
            playstyle: string;
        }>>('astra-get-builds-for-role', role),

        getChampionBuild: (championId: number, role: string) => ipc.invoke<{
            championId: number;
            name: string;
            role: string;
            tier: string;
            winRate: number;
            pickRate: number;
            banRate: number;
            primaryTree: number;
            secondaryTree: number;
            keystone: number;
            primaryRunes: number[];
            secondaryRunes: number[];
            statShards: number[];
            spell1: number;
            spell2: number;
            starterItems: string[];
            coreItems: string[];
            situationalItems: string[];
            boots: string;
            skillOrder: string;
            playstyle: string;
        } | null>('astra-get-champion-build', { championId, role }),

        checkAutoImport: () => ipc.invoke<{
            success: boolean;
            message: string;
            championId: number;
            championName: string;
            role: string;
            runesImported: boolean;
            spellsImported: boolean;
            itemsImported: boolean;
            build: { name: string; tier: string; winRate: number } | null;
        } | null>('astra-check-auto-import'),

        importBuild: (championId: number, role?: string) => ipc.invoke<{
            success: boolean;
            message: string;
            runesImported: boolean;
            spellsImported: boolean;
            itemsImported: boolean;
        }>('astra-import-build', { championId, role }),

        setAutoImport: (enabled: boolean) => ipc.invoke<{
            success: boolean;
            autoImportEnabled: boolean;
        }>('astra-set-auto-import', enabled),

        getAutoImportStatus: () => ipc.invoke<{
            autoImportEnabled: boolean;
        }>('astra-get-auto-import-status')
    }
};

export default ipc;

