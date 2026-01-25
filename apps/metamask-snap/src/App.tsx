import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MetaMaskProvider } from './components/MetaMaskProvider';
import { Header } from './components/Header';
import { WalletConnect } from './components/WalletConnect';
import { Settings } from './components/Settings';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <MetaMaskProvider>
        <div className="app">
          <Header />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<WalletConnect />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
        </div>
      </MetaMaskProvider>
    </BrowserRouter>
  );
}

export default App;
