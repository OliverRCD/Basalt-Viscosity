
import React, { useState, useEffect, useRef } from 'react';
import { generatePythonCode, askExpert } from '../services/geminiService';
import { ModelType, TrainingConfig, ChemicalData } from '../types';
import { AVAILABLE_FEATURES, MOCK_DATA } from '../constants';
import { read, utils } from 'xlsx';

interface GeneratedFile {
  name: string;
  content: string;
}

interface ProjectBuilderProps {
  onConnect: (host: string, db: string) => void;
  onDataLoaded: (data: ChemicalData[]) => void;
}

interface ChatMessage {
    role: 'user' | 'model';
    content: string;
}

const ProjectBuilder: React.FC<ProjectBuilderProps> = ({ onConnect, onDataLoaded }) => {
  const [loading, setLoading] = useState(false); // Only for code generation
  const [connecting, setConnecting] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'code' | 'advice'>('config');
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);
  
  // Chat State
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [questionInput, setQuestionInput] = useState('');
  const [isChatThinking, setIsChatThinking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [isLocal, setIsLocal] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check if running on localhost or 127.0.0.1
    const hostname = window.location.hostname;
    setIsLocal(hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '');
  }, []);

  // Scroll to bottom of chat
  useEffect(() => {
      if (activeTab === 'advice') {
          chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
  }, [chatHistory, activeTab]);

  const [config, setConfig] = useState<TrainingConfig>({
    target: 'viscosityValue',
    features: AVAILABLE_FEATURES,
    testSize: 0.2,
    modelType: ModelType.PHYSICS_LIGHTGBM,
    dbConfig: {
      host: 'localhost',
      port: '3306',
      user: 'root',
      password: 'sql2008',
      database: 'basalt_research',
      table: 'melt_data'
    }
  });

  const parseGeneratedOutput = (text: string) => {
    const parts = text.split(/--- FILE: (.*?) ---/g);
    const files: GeneratedFile[] = [];
    for (let i = 1; i < parts.length; i += 2) {
      const name = parts[i].trim();
      const content = parts[i + 1].trim();
      files.push({ name, content });
    }
    if (files.length === 0) {
      files.push({ name: 'generated_script.py', content: text });
    }
    setGeneratedFiles(files);
    setSelectedFileIndex(0);
  };

  const handleGenerate = async () => {
    if (!process.env.API_KEY) {
      alert("请先在页面右上角输入 Gemini API Key");
      return;
    }
    setLoading(true);
    setActiveTab('code');
    setGeneratedFiles([]); 
    try {
      const text = await generatePythonCode(config);
      parseGeneratedOutput(text);
    } catch (e) {
      setGeneratedFiles([{ name: 'error.log', content: "Error generating code. Please check API Key or Network." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (msgOverride?: string) => {
      if (!process.env.API_KEY) {
          alert("请先在页面右上角输入 Gemini API Key");
          return;
      }
      
      const msg = msgOverride || questionInput;
      if (!msg.trim()) return;

      // Add user message
      const userMsg: ChatMessage = { role: 'user', content: msg };
      setChatHistory(prev => [...prev, userMsg]);
      setQuestionInput('');
      setIsChatThinking(true);

      try {
          const response = await askExpert(msg, config);
          const aiMsg: ChatMessage = { role: 'model', content: response };
          setChatHistory(prev => [...prev, aiMsg]);
      } catch (e) {
          setChatHistory(prev => [...prev, { role: 'model', content: "抱歉，连接专家服务时出现错误。" }]);
      } finally {
          setIsChatThinking(false);
      }
  };

  const handleTestConnection = () => {
      if (!isLocal) return;
      
      setConnecting(true);
      // Simulate network request duration
      setTimeout(() => {
          // Explicitly load MOCK_DATA here when the user wants to test with mock data
          onDataLoaded(MOCK_DATA);
          onConnect(config.dbConfig.host, config.dbConfig.database);
          setConnecting(false);
      }, 800);
  };

  const updateDbConfig = (key: keyof typeof config.dbConfig, value: string) => {
    setConfig(prev => ({
      ...prev,
      dbConfig: { ...prev.dbConfig, [key]: value }
    }));
  };
  
  // Helper to find value in an object (row) using fuzzy key matching
  const fuzzyGet = (row: any, keyPart: string): number => {
    if (!row) return 0;
    const keys = Object.keys(row);
    const match = keys.find(k => k.toLowerCase().includes(keyPart.toLowerCase()));
    if (match) {
        const val = parseFloat(row[match]);
        return isNaN(val) ? 0 : val;
    }
    return 0;
  };

  const fuzzyGetStr = (row: any, keyPart: string): string => {
    if (!row) return '';
    const keys = Object.keys(row);
    const match = keys.find(k => k.toLowerCase().includes(keyPart.toLowerCase()));
    return match ? String(row[match]) : '';
  };

  const processImportedData = (rawData: any[]) => {
      try {
        const parsedData: ChemicalData[] = rawData.map((row, idx) => ({
            sampleID: idx + 1,
            SiO2: fuzzyGet(row, 'SiO2'),
            Al2O3: fuzzyGet(row, 'Al2O3'),
            FexOy: fuzzyGet(row, 'Fe') || fuzzyGet(row, 'FexOy'),
            Na2O: fuzzyGet(row, 'Na2O'),
            K2O: fuzzyGet(row, 'K2O'),
            CaO: fuzzyGet(row, 'CaO'),
            MgO: fuzzyGet(row, 'MgO'),
            TiO2: fuzzyGet(row, 'TiO2'),
            temperature: fuzzyGet(row, 'temp') || fuzzyGet(row, 'temperature'),
            viscosityValue: fuzzyGet(row, 'viscosity') || fuzzyGet(row, 'log10') || fuzzyGet(row, 'Value'),
            Remark: fuzzyGetStr(row, 'remark') || fuzzyGetStr(row, 'source') || fuzzyGetStr(row, 'name'),
            actualMeasuredData: 1
        }));

        const validData = parsedData.filter(d => d.temperature > 0 && (d.viscosityValue !== 0 || d.SiO2 !== 0));

        if (validData.length > 0) {
            onDataLoaded(validData);
            onConnect("Imported File", `Found ${validData.length} rows`);
        } else {
            alert("未解析到有效数据。请确保文件包含表头 (如 SiO2, Al2O3, temperature, viscosity...)");
        }
      } catch (err) {
          console.error(err);
          alert("数据处理失败，请检查文件格式。");
      }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (isExcel) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = e.target?.result;
            if (data) {
                try {
                    const workbook = read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = utils.sheet_to_json(worksheet);
                    processImportedData(jsonData);
                } catch (error) {
                    console.error(error);
                    alert("Excel 解析失败。请确保文件未加密且格式正确。");
                }
            }
        };
        reader.readAsArrayBuffer(file);
    } else {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            if (!text) return;
            try {
                const rows = text.split('\n').filter(r => r.trim() !== '');
                if (rows.length < 2) return;
                
                const headers = rows[0].split(',').map(h => h.trim());
                const jsonData = rows.slice(1).map(rowStr => {
                    const values = rowStr.split(',');
                    const obj: any = {};
                    headers.forEach((h, i) => {
                        obj[h] = values[i];
                    });
                    return obj;
                });
                processImportedData(jsonData);
            } catch (err) {
                alert("CSV 解析失败，请检查文件格式。");
            }
        };
        reader.readAsText(file);
    }
  };

  const getModelDescription = (type: ModelType) => {
    switch (type) {
        case ModelType.PHYSICS_LIGHTGBM:
            return "物理规律（Arrhenius方程）嵌入特征工程，适合小样本，抗噪性强，训练极快。";
        case ModelType.DISTILLATION:
            return "利用集成模型指导轻量级模型，适合部署到边缘设备。";
        case ModelType.STACKING:
            return "竞赛级方案，通过多模型堆叠榨干数据潜力，精度最高但训练慢。";
        case ModelType.XGBOOST:
            return "经典的梯度提升树，鲁棒性好，通用性强。";
        case ModelType.MLP:
            return "基础神经网络，适合捕捉复杂的非线性关系。";
        default: return "";
    }
  };

  const QUICK_QUESTIONS = [
      "LightGBM 相比神经网络有什么优势？",
      "什么是 Arrhenius 物理增强特征？",
      "如何调整数据库连接配置？",
      "解释一下 'Knowledge Distillation' (蒸馏) 策略",
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[750px]">
      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50 flex-none">
        <button
          onClick={() => setActiveTab('config')}
          className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${
            activeTab === 'config' ? 'bg-white text-blue-600 border-t-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          1. 项目配置 (Configuration)
        </button>
        <button
          onClick={() => setActiveTab('code')}
          className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${
            activeTab === 'code' ? 'bg-white text-blue-600 border-t-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          2. 项目代码 (Project Files)
        </button>
        <button
          onClick={() => setActiveTab('advice')}
          className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${
            activeTab === 'advice' ? 'bg-white text-blue-600 border-t-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          3. 专家建议 (Chat with Expert)
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative flex flex-col">
        {loading && activeTab === 'code' && (
            <div className="absolute inset-0 bg-white/95 z-20 flex flex-col items-center justify-center space-y-4 backdrop-blur-sm">
                <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-slate-700 font-medium animate-pulse">
                    正在构建 Python 项目结构...<br/>
                    <span className="text-sm text-slate-500 font-normal">Integration of {config.modelType}</span>
                </p>
            </div>
        )}

        {/* Configuration Tab */}
        {activeTab === 'config' && (
          <div className="h-full overflow-y-auto p-6 space-y-8">
            
            {/* DB Config */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800 border-l-4 border-green-600 pl-3 flex justify-between items-center">
                  数据库与数据源
              </h3>
              
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                  <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600 shrink-0 mt-0.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    <div>
                        <h4 className="text-sm font-bold text-amber-800">关于数据库连接的说明</h4>
                        <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                            浏览器出于安全原因，<b>无法直接通过 TCP 连接</b>本地端口 (3306)。<br/>
                            1. <b>预览数据</b>：请点击下方“导入 Excel/CSV”按钮，加载您的真实数据以进行可视化。<br/>
                            2. <b>训练模型</b>：点击“生成代码”，生成的 Python 脚本将在您的本地环境中运行，届时可无障碍连接您的真实数据库。
                        </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-75 hover:opacity-100 transition-opacity">
                    <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">主机 (Host)</label>
                    <input
                        type="text"
                        value={config.dbConfig.host}
                        onChange={(e) => updateDbConfig('host', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    </div>
                    {/* ... other inputs ... */}
                    <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">数据库名 (Database)</label>
                    <input
                        type="text"
                        value={config.dbConfig.database}
                        onChange={(e) => updateDbConfig('database', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    </div>
                     <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">密码 (Password)</label>
                    <input
                        type="password"
                        value={config.dbConfig.password || ''}
                        onChange={(e) => updateDbConfig('password', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    </div>
                    <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">表名 (Table)</label>
                    <input
                        type="text"
                        value={config.dbConfig.table}
                        onChange={(e) => updateDbConfig('table', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="mt-6 flex flex-wrap gap-3 justify-end border-t border-slate-200 pt-4">
                       <input 
                            type="file" 
                            accept=".csv, .xlsx, .xls" 
                            ref={fileInputRef} 
                            onChange={handleFileUpload} 
                            className="hidden" 
                       />
                       
                       <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                      >
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                         导入 CSV / Excel (预览真实数据)
                      </button>

                      <button
                        onClick={handleTestConnection}
                        disabled={!isLocal || connecting}
                        className={`
                            px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all border border-slate-300
                            ${!isLocal 
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                                : 'bg-white text-slate-700 hover:bg-slate-50'
                            }
                        `}
                      >
                        {connecting ? '模拟连接中...' : '使用模拟数据 (Mock)'}
                      </button>
                  </div>
              </div>
            </div>

            {/* Model Selection */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800 border-l-4 border-blue-600 pl-3">选择 AI 训练策略</h3>
              <div className="grid grid-cols-1 gap-3">
                {Object.entries(ModelType).map(([key, label]) => (
                  <label key={key} className={`
                    relative flex items-start p-4 border rounded-xl cursor-pointer transition-all hover:shadow-md
                    ${config.modelType === label ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500' : 'border-slate-200 hover:border-slate-300'}
                  `}>
                    <input
                      type="radio"
                      name="modelType"
                      value={label}
                      checked={config.modelType === label}
                      onChange={() => setConfig({ ...config, modelType: label as ModelType })}
                      className="mt-1 mr-3"
                    />
                    <div>
                        <span className="block font-semibold text-slate-900">{label}</span>
                        <span className="text-xs text-slate-600 mt-1 block leading-relaxed">
                            {getModelDescription(label as ModelType)}
                        </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

             {/* Action Button */}
             <div className="pt-4 pb-8">
                <button
                    onClick={handleGenerate}
                    className="w-full md:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition-all flex items-center justify-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 11 4-7"/><path d="m19 11-4-7"/><path d="M2 11h20"/><path d="m3.5 11 1.6 7.4a2 2 0 0 0 2 1.6h9.8c.9 0 1.8-.7 2-1.6l1.7-7.4"/><path d="m9 11 1 9"/></svg>
                    生成标准化 Python 工程
                </button>
             </div>
          </div>
        )}

        {/* Code View - File Explorer Style */}
        {activeTab === 'code' && (
          <div className="flex h-full">
            {generatedFiles.length > 0 ? (
                <>
                    {/* Sidebar */}
                    <div className="w-1/4 min-w-[200px] bg-slate-100 border-r border-slate-200 overflow-y-auto">
                        <div className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Project Files</div>
                        <ul>
                            {generatedFiles.map((file, idx) => (
                                <li key={idx}>
                                    <button
                                        onClick={() => setSelectedFileIndex(idx)}
                                        className={`w-full text-left px-4 py-3 text-sm font-mono flex items-center gap-2 truncate ${
                                            selectedFileIndex === idx ? 'bg-white border-l-4 border-blue-600 text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                                        {file.name}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                    {/* Code Editor */}
                    <div className="flex-1 flex flex-col min-w-0">
                        <div className="flex justify-between items-center px-4 py-2 bg-slate-800 border-b border-slate-700">
                             <span className="text-slate-300 text-sm font-mono">{generatedFiles[selectedFileIndex].name}</span>
                             <button
                                onClick={() => navigator.clipboard.writeText(generatedFiles[selectedFileIndex].content)}
                                className="text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
                            >
                                Copy Content
                            </button>
                        </div>
                        <textarea
                            readOnly
                            value={generatedFiles[selectedFileIndex].content}
                            className="flex-1 w-full p-4 font-mono text-sm bg-slate-900 text-green-400 resize-none focus:outline-none leading-relaxed whitespace-pre"
                        />
                    </div>
                </>
            ) : (
                <div className="flex-1 flex items-center justify-center text-slate-500">
                    请先在配置页点击“生成标准化 Python 工程”
                </div>
            )}
          </div>
        )}

        {/* Expert Advice Chat Tab */}
        {activeTab === 'advice' && (
             <div className="flex flex-col h-full bg-slate-50">
                 {/* Chat History */}
                 <div className="flex-1 overflow-y-auto p-4 space-y-4">
                     {chatHistory.length === 0 && (
                         <div className="text-center py-10">
                             <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                             </div>
                             <h3 className="text-lg font-bold text-slate-700">地球化学 AI 助手</h3>
                             <p className="text-slate-500 mt-2 max-w-sm mx-auto">
                                 我是您的专属 AI 专家。我可以解释模型策略、物理特征工程或帮助您优化训练配置。
                             </p>
                             
                             <div className="mt-8 flex flex-wrap justify-center gap-2">
                                 {QUICK_QUESTIONS.map((q, idx) => (
                                     <button
                                        key={idx}
                                        onClick={() => handleSendMessage(q)}
                                        className="px-4 py-2 bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-600 rounded-full text-sm text-slate-600 transition-all shadow-sm"
                                     >
                                         {q}
                                     </button>
                                 ))}
                             </div>
                         </div>
                     )}

                     {chatHistory.map((msg, idx) => (
                         <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                             <div 
                                className={`max-w-[80%] rounded-2xl px-5 py-3 shadow-sm ${
                                    msg.role === 'user' 
                                    ? 'bg-blue-600 text-white rounded-br-none' 
                                    : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                                }`}
                             >
                                 {msg.role === 'model' ? (
                                     <div className="markdown-body text-sm" dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br/>') }} />
                                 ) : (
                                     <div className="text-sm">{msg.content}</div>
                                 )}
                             </div>
                         </div>
                     ))}
                     
                     {isChatThinking && (
                         <div className="flex justify-start">
                             <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2">
                                 <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                                 <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                 <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                             </div>
                         </div>
                     )}
                     <div ref={chatEndRef} />
                 </div>

                 {/* Input Area */}
                 <div className="p-4 bg-white border-t border-slate-200">
                     <div className="flex gap-2">
                         <input
                            type="text"
                            value={questionInput}
                            onChange={(e) => setQuestionInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder="输入问题 (例如: 为什么要用 Arrhenius 特征?)..."
                            disabled={isChatThinking}
                            className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50"
                         />
                         <button
                            onClick={() => handleSendMessage()}
                            disabled={isChatThinking || !questionInput.trim()}
                            className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                         >
                             发送
                         </button>
                     </div>
                 </div>
             </div>
        )}
      </div>
    </div>
  );
};

export default ProjectBuilder;
