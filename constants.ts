
import { ChemicalData } from './types';

// Data simulating the user's MySQL structure with multiple basalt samples
// Group 1: Hawaii Basalt (Sample ID 1-5, same composition)
// Group 2: Iceland Tholeiite (Sample ID 6-10, different composition)
export const MOCK_DATA: ChemicalData[] = [
  // Group 1: High SiO2, labeled as "夏威夷基性岩"
  { sampleID: 1, SiO2: 53.5, Al2O3: 15.33, FexOy: 10.6, Na2O: 2.32, K2O: 1.87, CaO: 7.58, MgO: 7.48, TiO2: 0.94, temperature: 1488, viscosityValue: 2.268, Remark: "夏威夷基性岩 (Hawaii)", actualMeasuredData: 1 },
  { sampleID: 2, SiO2: 53.5, Al2O3: 15.33, FexOy: 10.6, Na2O: 2.32, K2O: 1.87, CaO: 7.58, MgO: 7.48, TiO2: 0.94, temperature: 1470, viscosityValue: 2.232, Remark: "夏威夷基性岩 (Hawaii)", actualMeasuredData: 1 },
  { sampleID: 3, SiO2: 53.5, Al2O3: 15.33, FexOy: 10.6, Na2O: 2.32, K2O: 1.87, CaO: 7.58, MgO: 7.48, TiO2: 0.94, temperature: 1460, viscosityValue: 2.241, Remark: "夏威夷基性岩 (Hawaii)", actualMeasuredData: 1 },
  { sampleID: 4, SiO2: 53.5, Al2O3: 15.33, FexOy: 10.6, Na2O: 2.32, K2O: 1.87, CaO: 7.58, MgO: 7.48, TiO2: 0.94, temperature: 1450, viscosityValue: 2.280, Remark: "夏威夷基性岩 (Hawaii)", actualMeasuredData: 1 },
  { sampleID: 5, SiO2: 53.5, Al2O3: 15.33, FexOy: 10.6, Na2O: 2.32, K2O: 1.87, CaO: 7.58, MgO: 7.48, TiO2: 0.94, temperature: 1440, viscosityValue: 2.322, Remark: "夏威夷基性岩 (Hawaii)", actualMeasuredData: 1 },
  
  // Group 2: Lower SiO2, Higher MgO, labeled as "冰岛拉斑玄武岩"
  { sampleID: 6, SiO2: 48.2, Al2O3: 13.10, FexOy: 11.2, Na2O: 1.95, K2O: 0.45, CaO: 10.8, MgO: 9.50, TiO2: 1.80, temperature: 1480, viscosityValue: 1.850, Remark: "冰岛拉斑玄武岩 (Iceland)", actualMeasuredData: 1 },
  { sampleID: 7, SiO2: 48.2, Al2O3: 13.10, FexOy: 11.2, Na2O: 1.95, K2O: 0.45, CaO: 10.8, MgO: 9.50, TiO2: 1.80, temperature: 1450, viscosityValue: 1.920, Remark: "冰岛拉斑玄武岩 (Iceland)", actualMeasuredData: 1 },
  { sampleID: 8, SiO2: 48.2, Al2O3: 13.10, FexOy: 11.2, Na2O: 1.95, K2O: 0.45, CaO: 10.8, MgO: 9.50, TiO2: 1.80, temperature: 1420, viscosityValue: 2.015, Remark: "冰岛拉斑玄武岩 (Iceland)", actualMeasuredData: 1 },
  { sampleID: 9, SiO2: 48.2, Al2O3: 13.10, FexOy: 11.2, Na2O: 1.95, K2O: 0.45, CaO: 10.8, MgO: 9.50, TiO2: 1.80, temperature: 1390, viscosityValue: 2.150, Remark: "冰岛拉斑玄武岩 (Iceland)", actualMeasuredData: 1 },
  { sampleID: 10,SiO2: 48.2, Al2O3: 13.10, FexOy: 11.2, Na2O: 1.95, K2O: 0.45, CaO: 10.8, MgO: 9.50, TiO2: 1.80, temperature: 1360, viscosityValue: 2.350, Remark: "冰岛拉斑玄武岩 (Iceland)", actualMeasuredData: 1 },
];

export const AVAILABLE_FEATURES = ['SiO2', 'Al2O3', 'FexOy', 'Na2O', 'K2O', 'CaO', 'MgO', 'TiO2', 'temperature'];
