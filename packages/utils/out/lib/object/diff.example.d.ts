/**
 * @fileoverview Examples demonstrating diffObject utilities with array index notation
 */
declare const basicDiff: Partial<{
    name: string;
    age: number;
    email: string;
}>;
declare const nestedDiff: Partial<{
    app: {
        name: string;
        version: string;
        settings: {
            theme: string;
            language: string;
        };
    };
    database: {
        host: string;
        port: number;
    };
}>;
declare const arrayDiff: Partial<{
    users: {
        id: number;
        name: string;
        role: string;
        active: boolean;
    }[];
    timestamp: string;
}>;
declare const detailed: import("./diff.js").DiffResult<{
    users: {
        id: number;
        name: string;
        role: string;
        active: boolean;
    }[];
    timestamp: string;
}>;
declare const paths: string[];
declare const complexPaths: string[];
declare const applied: {
    settings: {
        theme: string;
        fontSize: number;
        autoSave: boolean;
    };
    user: {
        name: string;
        preferences: string[];
    };
};
declare const diffWithDeletions: Partial<{
    title: string;
    author: string;
    tags: string[];
    metadata: {
        created: string;
    };
}>;
declare const detailedWithDeletions: import("./diff.js").DiffResult<{
    title: string;
    author: string;
    tags: string[];
    metadata: {
        created: string;
    };
}>;
interface User {
    id: number;
    name: string;
    email: string;
    preferences: {
        theme: string;
        notifications: boolean;
    };
}
interface AppState {
    currentUser: User;
    recentItems: Array<{
        id: string;
        title: string;
        timestamp: string;
    }>;
    settings: {
        language: string;
        timezone: string;
    };
}
declare const stateChanges: Partial<AppState>;
declare const changedPaths: string[];
declare const stateDetails: import("./diff.js").DiffResult<AppState>;
export { basicDiff, nestedDiff, arrayDiff, detailed, paths, complexPaths, applied, diffWithDeletions, detailedWithDeletions, stateChanges, changedPaths, stateDetails, };
//# sourceMappingURL=diff.example.d.ts.map