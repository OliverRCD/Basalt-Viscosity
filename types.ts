
export interface ChemicalData {
  sampleID: number;
  SiO2: number;
  Al2O3: number;
  FexOy: number;
  Na2O: number;
  K2O: number;
  CaO: number;
  MgO: number;
  TiO2: number;
  source?: string;
  temperature: number;
  viscosityValue: number;
  Remark?: string;
  actualMeasuredData?: number;
}

export enum ModelType {
  DISTILLATION = '大模型蒸馏策略 (Teacher-Student)',
  PHYSICS_LIGHTGBM = '物理信息 LightGBM (Arrhenius增强)',
  STACKING = 'Stacking 集成学习 (SOTA精度)',
  XGBOOST = 'XGBoost (工业界标准)',
  MLP = '多层感知机 (MLP)',
}

export interface TrainingConfig {
  target: string;
  features: string[];
  testSize: number;
  modelType: ModelType;
  dbConfig: {
    host: string;
    port: string;
    user: string;
    password?: string;
    database: string;
    table: string;
  };
}
