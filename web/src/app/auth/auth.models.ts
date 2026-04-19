export type Role = 'CLIENT' | 'AGENT';

export interface LoginRequestBody {
  login: string;
  password: string;
}

export interface LoginResponseBody {
  token: string;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: Role;
}
