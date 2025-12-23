export interface Org {
  alias?: string;
  username: string;
  orgId: string;
  instanceUrl: string;
  isDefaultUsername: boolean;
  isDefaultDevHub?: boolean;
}

export interface DeployResult {
  success: boolean;
  status: string;
  id?: string;
  message?: string;
  componentFailures?: ComponentFailure[];
}

export interface ComponentFailure {
  componentType: string;
  fullName: string;
  problemType: string;
  problem: string;
  lineNumber?: number;
  columnNumber?: number;
}

export interface RetrieveResult {
  success: boolean;
  status: string;
  message?: string;
}

export interface ExecuteResult {
  success: boolean;
  compiled: boolean;
  compileProblem?: string;
  exceptionMessage?: string;
  exceptionStackTrace?: string;
  line?: number;
  column?: number;
}

export interface TestResult {
  success: boolean;
  summary: {
    outcome: string;
    testsRan: number;
    passing: number;
    failing: number;
    skipped: number;
  };
  tests?: TestMethodResult[];
}

export interface TestMethodResult {
  fullName: string;
  outcome: string;
  message?: string;
  stackTrace?: string;
  runTime?: number;
}
