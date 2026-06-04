import { defineConfig } from 'vite';
export default defineConfig({
    resolve: {
        conditions: ['development', 'browser', 'module', 'import', 'default'],
    },
    build: {
        lib: {
            entry: 'src/index.ts',
            name: 'KettleJS',
            fileName: 'kettlejs',
        },
        rollupOptions: {
            external: ['lit', 'lit-html', '@fluixi/reactive'],
            output: {
                globals: {
                    lit: 'Lit',
                    '@fluixi/reactive': 'Reactive',
                },
            },
        },
    },
});
