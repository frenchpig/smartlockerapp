import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export type User = {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  rol: string;
};

type LoginDto = { email: string; password: string; remember?: boolean };

@Injectable({ providedIn: 'root' })
export class AuthService {
  private tokenKey = 'auth_token';
  private userSig = signal<User | null>(null);

  user = computed(() => this.userSig());
  isAuthenticated = computed(() => !!this.userSig());

  constructor(private http: HttpClient) {
    const token = localStorage.getItem(this.tokenKey);
    if (token) this.fetchMe().catch(() => this.clearSession());
  }

  async login(dto: LoginDto) {
    const res = await this.http.post<{ token: string; user: User }>(
      `${environment.apiUrl}/auth/login`,
      dto
    ).toPromise();

    if (res) {
      localStorage.setItem(this.tokenKey, res.token);
      this.userSig.set(res.user);
    }
  }

  async fetchMe() {
    const me = await this.http.get<User>(`${environment.apiUrl}/auth/me`).toPromise();
    if (me) this.userSig.set(me);
  }

  async logout() {
    try {
      await this.http.post(`${environment.apiUrl}/auth/logout`, {}).toPromise();
    } finally {
      this.clearSession();
    }
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  private clearSession() {
    localStorage.removeItem(this.tokenKey);
    this.userSig.set(null);
  }
}
