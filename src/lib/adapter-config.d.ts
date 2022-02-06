// This file extends the AdapterConfig type from "@types/iobroker"

// Augment the globally declared type ioBroker.AdapterConfig
declare global {
    namespace ioBroker {
        interface Parameter {
            unit: string;
            parameter: string;
            id: string;
            name: string;
        }

        interface AdapterConfig {
            AuthCode: string;
            CallbackURL: string;
            Configured: boolean;
            EnableManageSupport: boolean;
            Identifier: string;
            Interval: number;
            Language: string;
            ManagedParameters: Parameter[];
            ManageId: string;
            ManageName: string;
            Secret: string;
            SystemId: string;
        }
    }
}

// this is required so the above AdapterConfig is found by TypeScript / type checking
export {};
