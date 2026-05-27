import { createContext, createStore, createProvider, useContext, useProvide, createConsumer, } from '@awc/kettlejs';
export const themes = {
    light: { background: 'white', text: 'black' },
    dark: { background: 'black', text: 'white' },
};
// Make sure the default value matches the shape of the value provided later
export const ThemeContext = createContext({
    theme: themes.light,
    primaryColor: '#007bff',
    secondaryColor: '#6c757d',
    // theme: () => 'light' as string,
    toggleTheme: () => { },
});
// Provider component
export const ThemeProvider = (props) => {
    const { children } = props;
    const value = useProvide(ThemeContext, () => {
        const [theme, setTheme] = createStore(themes.light);
        const toggleTheme = () => {
            setTheme((prevTheme) => {
                return prevTheme.text === themes.light.text
                    ? themes.dark
                    : themes.light;
            });
        };
        return {
            theme,
            toggleTheme,
        };
    });
    // The value prop passes both the current theme and the toggle function
    return createProvider({
        context: ThemeContext,
        value,
        children,
    });
};
export const ThemeConsumer = createConsumer(ThemeContext);
export function themContext() {
    return useContext(ThemeContext);
}
