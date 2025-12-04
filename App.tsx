
import React, { useState } from 'react';
import DataView from './components/DataView';
import ProjectBuilder from './components/ProjectBuilder';
import { ChemicalData } from './types';
import { validateApiKey } from './services/geminiService';

const App: React.FC = () => {
  // Use a local state for the input value
  const [keyInput, setKeyInput] = useState('');
  const [keyStatus, setKeyStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  
  // Lifted state for data visualization
  const [viscosityData, setViscosityData] = useState<ChemicalData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedDbInfo, setConnectedDbInfo] = useState<{host: string, db: string} | null>(null);

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setKeyInput(e.target.value);
    setKeyStatus('idle'); // Reset status on edit
  };

  const handleVerifyKey = async () => {
      if (!keyInput.trim()) return;
      
      setKeyStatus('checking');
      const isValid = await validateApiKey(keyInput);
      
      if (isValid) {
          setKeyStatus('valid');
          process.env.API_KEY = keyInput;
      } else {
          setKeyStatus('invalid');
          process.env.API_KEY = ''; // Clear potentially invalid key
      }
  };

  const handleDbConnect = (host: string, db: string) => {
    // Only update the connection status label. Do NOT overwrite data here.
    setConnectedDbInfo({ host, db });
    setIsConnected(true);
  };
  
  const handleDataLoaded = (data: ChemicalData[]) => {
      // This is the only place data should be set
      setViscosityData(data);
      setIsConnected(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg>
             </div>
             <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-blue-500 hidden sm:block">
                玄武岩粘度 AI 训练平台
             </span>
             <span className="text-lg font-bold sm:hidden">Basalt AI</span>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative group flex items-center">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11.536 11l-2.829 2.829-2.12 2.122-1.415-1.414 6.364-6.364 2.829-2.829A6 6 0 0115 7z" />
                </svg>
              </div>
              <input 
                type="password" 
                placeholder="输入 Gemini API Key..." 
                value={keyInput}
                onChange={handleKeyChange}
                className={`pl-10 pr-8 py-1.5 border rounded-l-lg text-sm w-48 sm:w-64 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all ${
                    keyStatus === 'invalid' ? 'border-red-300 bg-red-50' : 
                    keyStatus === 'valid' ? 'border-green-300 bg-green-50' : 'border-slate-300'
                }`}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  {keyStatus === 'checking' && <span className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse ring-2 ring-yellow-100"/>}
                  {keyStatus === 'valid' && <span className="h-2 w-2 rounded-full bg-green-500 ring-2 ring-green-100"/>}
                  {keyStatus === 'invalid' && <span className="h-2 w-2 rounded-full bg-red-500 ring-2 ring-red-100"/>}
                  {keyStatus === 'idle' && <span className="h-2 w-2 rounded-full bg-slate-300"/>}
              </div>
            </div>
            <button 
                onClick={handleVerifyKey}
                disabled={keyStatus === 'checking' || !keyInput}
                className={`px-3 py-1.5 text-sm font-medium rounded-r-lg border border-l-0 transition-colors ${
                    keyStatus === 'valid' 
                    ? 'bg-green-600 text-white border-green-600 hover:bg-green-700' 
                    : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:border-slate-300'
                }`}
            >
                {keyStatus === 'checking' ? '...' : keyStatus === 'valid' ? '已连接' : '验证'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <section>
          <DataView 
            data={viscosityData} 
            isConnected={isConnected} 
            dbInfo={connectedDbInfo}
          />
        </section>

        <section>
          <ProjectBuilder 
            onConnect={handleDbConnect} 
            onDataLoaded={handleDataLoaded}
          />
        </section>
      </main>

      <footer className="bg-white border-t border-slate-200 mt-12 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-400 text-sm">
          <p>Designed by Xu &bull; 专为地球化学分析设计</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
