import { ReactNode } from "react";
import { ThemeProvider } from "next-themes";

interface AppThemeProviderProps {
  children: ReactNode;
}

export function AppThemeProvider({ children }: AppThemeProviderProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      storageKey="openremote-theme"
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
