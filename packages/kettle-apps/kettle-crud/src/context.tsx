import { createContext, createStore, useContext } from '@awc/kettlejs';

interface ThemeValue {
  background: string;
  text: string;
}
export interface Theme {
  theme: ThemeValue;
  primaryColor?: string;
  secondaryColor?: string;
  toggleTheme: () => unknown;
}

export const themes = {
  light: { background: 'white', text: 'black' },
  dark: { background: 'black', text: 'white' },
};

// Make sure the default value matches the shape of the value provided later
export const ThemeContext = createContext<Theme>({
  theme: themes.light,
  // theme: () => 'light' as string,
  toggleTheme: () => {},
});

// // Custom hook to easily consume the context
// export const useTheme = () => useContext(ThemeContext);

// Provider component
export const ThemeProvider = ({ children }: { children: JSX.Element }) => {
  // const [theme, setTheme] = createSignal('light');
  const [theme, setTheme] = createStore(themes.light);
  const toggleTheme = () => {
    setTheme((prevTheme) => {
      return prevTheme.text === themes.light.text ? themes.dark : themes.light;
    });
    // console.log('new theme is', theme)
  };

  // The value prop passes both the current theme and the toggle function
  return (
    <ThemeContext.Provider value={{ theme: theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function themContext() {
  return useContext(ThemeContext);
}

// interface Theme {
//   primaryColor: string;
//   secondaryColor: string;
// }

// export const ThemeContext = createContext<Theme>({
//   primaryColor: '#007bff',
//   secondaryColor: '#6c757d',
// });
