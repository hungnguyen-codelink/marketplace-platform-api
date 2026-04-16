export interface RegisterPayload {
    email: string;
    password: string;
    full_name: string;
    role: 'buyer' | 'seller';
}
export interface LoginPayload {
    email: string;
    password: string;
}
export interface UserResponse {
    id: string;
    email: string;
    full_name: string;
    role: string;
}
export interface AuthResponse {
    user: UserResponse;
    token: string;
}
export declare class AuthService {
    register(payload: RegisterPayload): Promise<AuthResponse>;
    login(payload: LoginPayload): Promise<AuthResponse>;
    logout(tokenHash: string): Promise<void>;
}
export declare const authService: AuthService;
