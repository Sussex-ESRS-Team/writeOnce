declare global {
  interface Window {
    toggleSignUp: () => void;
    handleAuth: (event: Event) => Promise<boolean>;
    logout: () => void;
  }
}

export {};
