import "./index.css";
import "@rainbow-me/rainbowkit/styles.css";

import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { chains, wagmiConfig } from "./wagmi/wagmi.config.ts";

import App from "./App.tsx";
import AuthGuard from "./AuthGuard.tsx";
import { IdentityProvider } from "ic-eth-identity";
import React from "react";
import ReactDOM from "react-dom/client";
import { WagmiConfig } from "wagmi";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WagmiConfig config={wagmiConfig}>
      <RainbowKitProvider
        chains={chains}
        modalSize="compact"
        theme={darkTheme({
          accentColor: "#7b3fe4",
          accentColorForeground: "white",
          borderRadius: "large",
          overlayBlur: "none",
        })}
      >
        <IdentityProvider>
          <AuthGuard>
            <App />
          </AuthGuard>
        </IdentityProvider>
      </RainbowKitProvider>
    </WagmiConfig>
  </React.StrictMode>
);
