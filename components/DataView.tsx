
import React, { useState, useMemo, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Label,
  Legend
} from 'recharts';
import { ChemicalData } from '../types';

interface DataViewProps {
    data: ChemicalData[];
    isConnected: boolean;
    dbInfo: { host: string; db: string } | null;
}

// Helper to generate a signature key for chemical composition
// Using toFixed(2) is CRITICAL to avoid floating point errors when comparing imported data
const getCompositionSignature = (row: ChemicalData) => {
    return `${(row.SiO2||0).toFixed(2)}-${(row.Al2O3||0).toFixed(2)}-${(row.FexOy||0).toFixed(2)}-${(row.Na2O||0).toFixed(2)}-${(row.K2O||0).toFixed(2)}-${(row.CaO||0).toFixed(2)}-${(row.MgO||0).toFixed(2)}-${(row.TiO2||0).toFixed(2)}`;
};

const DataView: React.FC<DataViewProps> = ({ data, isConnected, dbInfo }) => {
  // Group data by chemical composition
  const groupedData = useMemo(() => {
    if (!data || data.length === 0) return {};
    const groups: Record<string, ChemicalData[]> = {};
    data.forEach(row => {
        const sig = getCompositionSignature(row);
        if (!groups[sig]) {
            groups[sig] = [];
        }
        groups[sig].push(row);
    });
    return groups;
  }, [data]);

  // Get keys (signatures)
  const groupKeys = Object.keys(groupedData);
  
  // State for currently selected group
  const [selectedGroupSignature, setSelectedGroupSignature] = useState<string>('');

  // Update selection when keys change
  useEffect(() => {
      if (groupKeys.length > 0) {
          // If previous selection is invalid or empty, select the first one
          if (!selectedGroupSignature || !groupKeys.includes(selectedGroupSignature)) {
              setSelectedGroupSignature(groupKeys[0]);
          }
      } else {
          setSelectedGroupSignature('');
      }
  }, [groupKeys, selectedGroupSignature]);

  // Reset selection when data reference changes completely (e.g. from Mock to File)
  useEffect(() => {
    if (groupKeys.length > 0) {
        setSelectedGroupSignature(groupKeys[0]);
    }
  }, [data]);

  // Derive display options for the dropdown
  const sampleOptions = groupKeys.map(sig => {
      const rows = groupedData[sig];
      const firstRow = rows[0];
      // Logic: "sampleID + Remark" or just "sampleID" if remark is null
      const label = firstRow.Remark 
        ? `${firstRow.sampleID} - ${firstRow.Remark}` 
        : `Sample ${firstRow.sampleID}`;
      return { value: sig, label };
  });

  // Filter data for the chart and table based on selection
  const currentData = useMemo(() => {
      if (!selectedGroupSignature || !groupedData[selectedGroupSignature]) return [];
      // Sort by temperature ascending (Low -> High)
      return [...groupedData[selectedGroupSignature]].sort((a, b) => a.temperature - b.temperature);
  }, [groupedData, selectedGroupSignature]);

  const currentSample = currentData[0];

  // EMPTY STATE RENDER
  if (!isConnected || data.length === 0) {
      return (
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100 h-[700px] flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 border-2 border-dashed border-slate-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">等待数据库连接</h2>
            <p className="text-slate-500 max-w-md mx-auto mb-6">
                请在下方的“项目配置”区域中输入您的 MySQL 数据库信息，并点击 
                <span className="font-semibold text-green-600 mx-1">测试连接</span> 
                按钮以加载数据。
            </p>
            <div className="text-xs text-slate-400 bg-slate-50 px-4 py-2 rounded-lg font-mono border border-slate-100">
                Database Status: Disconnected
            </div>
        </div>
      );
  }

  return (
    <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100 relative">
      {/* Connection Status Bar */}
      <div className="absolute top-0 right-0 left-0 bg-green-50 rounded-t-2xl px-8 py-2 border-b border-green-100 flex items-center justify-between">
          <span className="text-xs font-medium text-green-700 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              Connected: {dbInfo?.host} / {dbInfo?.db}
          </span>
          <span className="text-xs text-green-600/70 font-mono">Status: Active</span>
      </div>

      {/* Title Section */}
      <div className="mb-2 mt-8">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <span className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
            </span>
            玄武岩熔体数据分析
        </h2>
        <p className="text-slate-500 mt-2 ml-14">
            当前展示: <span className="font-semibold text-blue-600">{currentData.length}</span> 个温粘度测量点
        </p>
      </div>
        
      {/* Controls Section - Moved to separate row for spacing */}
      <div className="flex justify-end mb-6">
        <div className="flex flex-col gap-1 w-full md:w-auto bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm">
             <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 mb-1">切换玄武岩样品 (Select Sample)</label>
             <div className="relative">
                <select 
                    value={selectedGroupSignature}
                    onChange={(e) => setSelectedGroupSignature(e.target.value)}
                    className="appearance-none bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 pr-8 font-medium shadow-sm min-w-[300px]"
                >
                    {sampleOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-700">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
            </div>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        {/* Chart View (Fixed Axes) */}
        <div className="w-full flex flex-col h-[450px] bg-slate-50 rounded-xl border border-slate-200 p-6 relative">
            <h3 className="text-lg font-bold text-slate-700 mb-2 text-center">
                粘度-温度特征曲线 (Arrhenius Plot)
            </h3>
            <p className="text-center text-xs text-slate-500 mb-6 font-mono">
                X: Temperature (°C) | Y: Viscosity (log10 Pa·s)
            </p>
            
            <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={currentData} margin={{ top: 20, right: 30, bottom: 40, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis 
                        type="number" 
                        dataKey="temperature" 
                        domain={['dataMin - 20', 'dataMax + 20']}
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        tickLine={false}
                        axisLine={{ stroke: '#cbd5e1' }}
                    >
                        <Label 
                            value="温度 Temperature (°C)" 
                            offset={-15} 
                            position="insideBottom" 
                            style={{ fill: '#475569', fontSize: 12, fontWeight: 600 }}
                        />
                    </XAxis>
                    <YAxis 
                        type="number" 
                        dataKey="viscosityValue" 
                        domain={['auto', 'auto']}
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => val.toFixed(2)}
                    >
                        <Label 
                            value="粘度 Viscosity (log10)" 
                            angle={-90} 
                            position="insideLeft" 
                            offset={0}
                            style={{ fill: '#475569', fontSize: 12, fontWeight: 600 }}
                        />
                    </YAxis>
                    <Tooltip 
                        contentStyle={{ 
                            backgroundColor: 'rgba(255, 255, 255, 0.98)', 
                            borderRadius: '8px', 
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            border: '1px solid #e2e8f0',
                            padding: '12px'
                        }}
                        formatter={(value: number) => [value.toFixed(3), '粘度']}
                        labelFormatter={(label) => `温度: ${label}°C`}
                        cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }}
                    />
                    <Legend verticalAlign="top" height={36}/>
                    <Line 
                        name="实测粘度"
                        type="monotone" 
                        dataKey="viscosityValue" 
                        stroke="#2563eb" 
                        strokeWidth={3}
                        dot={{ r: 5, fill: "#2563eb", strokeWidth: 2, stroke: "#fff" }}
                        activeDot={{ r: 8, strokeWidth: 0 }}
                        animationDuration={1000}
                    />
                  </LineChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Table View (Filtered) - Moved Down & Scrollable */}
        <div className="w-full overflow-hidden rounded-xl border border-slate-200 shadow-sm bg-white flex flex-col">
          <div className="p-4 bg-slate-100 border-b border-slate-200">
             <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>
                当前样品化学组分 (wt%)
             </h4>
             <div className="mt-3 grid grid-cols-4 md:grid-cols-8 gap-3 text-xs text-slate-600">
                <div className="bg-white p-2 rounded border border-slate-200 text-center shadow-sm">
                    <span className="block text-slate-400 font-bold mb-1">SiO₂</span>
                    <span className="text-slate-800 font-mono text-sm">{currentSample?.SiO2}</span>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200 text-center shadow-sm">
                    <span className="block text-slate-400 font-bold mb-1">Al₂O₃</span>
                    <span className="text-slate-800 font-mono text-sm">{currentSample?.Al2O3}</span>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200 text-center shadow-sm">
                    <span className="block text-slate-400 font-bold mb-1">FeₓOᵧ</span>
                    <span className="text-slate-800 font-mono text-sm">{currentSample?.FexOy}</span>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200 text-center shadow-sm">
                    <span className="block text-slate-400 font-bold mb-1">Na₂O</span>
                    <span className="text-slate-800 font-mono text-sm">{currentSample?.Na2O}</span>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200 text-center shadow-sm">
                    <span className="block text-slate-400 font-bold mb-1">K₂O</span>
                    <span className="text-slate-800 font-mono text-sm">{currentSample?.K2O}</span>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200 text-center shadow-sm">
                    <span className="block text-slate-400 font-bold mb-1">CaO</span>
                    <span className="text-slate-800 font-mono text-sm">{currentSample?.CaO}</span>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200 text-center shadow-sm">
                    <span className="block text-slate-400 font-bold mb-1">MgO</span>
                    <span className="text-slate-800 font-mono text-sm">{currentSample?.MgO}</span>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200 text-center shadow-sm">
                    <span className="block text-slate-400 font-bold mb-1">TiO₂</span>
                    <span className="text-slate-800 font-mono text-sm">{currentSample?.TiO2}</span>
                </div>
             </div>
          </div>
          
          {/* Scrollable Table Area */}
          <div className="h-[300px] overflow-y-auto custom-scrollbar bg-slate-50/50">
            <table className="min-w-full text-left border-collapse relative">
              <thead className="bg-slate-800 text-white sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-6 py-3 text-xs font-semibold tracking-wide uppercase w-24">ID</th>
                  <th className="px-6 py-3 text-xs font-semibold tracking-wide uppercase">Temp (°C)</th>
                  <th className="px-6 py-3 text-xs font-semibold tracking-wide uppercase text-right bg-blue-900/90 backdrop-blur-sm">Viscosity (log10)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {currentData.map((row) => (
                  <tr key={row.sampleID} className="hover:bg-blue-50/50 transition-colors group">
                    <td className="px-6 py-3 text-slate-400 font-mono text-xs group-hover:text-slate-600">{row.sampleID}</td>
                    <td className="px-6 py-3 text-slate-800 font-bold font-mono text-sm">
                        {row.temperature}
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-blue-700 font-bold text-sm">
                        {row.viscosityValue.toFixed(3)}
                    </td>
                  </tr>
                ))}
                {/* Empty state padding if few items */}
                {currentData.length < 5 && (
                    <tr className="h-full">
                        <td colSpan={3} className="py-8 text-center text-slate-400 text-sm">无更多数据</td>
                    </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataView;
