export interface Borrower {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CreateBorrowerInput {
  name: string;
  email: string;
  phone?: string;
}

export interface UpdateBorrowerInput {
  name?: string;
  email?: string;
  phone?: string;
}
