import { LoanPayload } from "./types";

export const EMPTY_LOAN_PAYLOAD: LoanPayload = {
  active: [],
  requested: [],
  overdue: [],
  recent: [],
  deniedOrCancelled: [],
};
