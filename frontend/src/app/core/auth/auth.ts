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
  private readonly tokenKey = 'auth_token';
  private readonly userKey = 'auth_user';
  private readonly userSig = signal<User | null>(null);
  private restorePromise: Promise<boolean> | null = null;

  user = computed(() => this.userSig());
  isAuthenticated = computed(() => !!this.userSig());

  constructor(private http: HttpClient) {
    this.hydrateUserFromStorage();
    const token = this.getToken();
    if (token) {
      this.restoreSession().catch(() => this.clearSession());
    }
  }

  async login(dto: LoginDto) {
    const res = await this.http.post<{ token: string; user: User }>(
      `${environment.apiUrl}/auth/login`,
      dto
    ).toPromise();

    if (res) {
      this.storeSession(res.token, res.user, !!dto.remember);
    }
  }

  async fetchMe() {
    const me = await this.http.get<User>(`${environment.apiUrl}/auth/me`).toPromise();
    if (me) {
      this.userSig.set(me);
      this.updateStoredUser(me);
    }
  }

  async restoreSession(): Promise<boolean> {
    if (this.userSig()) {
      return true;
    }

    const token = this.getToken();
    if (!token) {
      return false;
    }

    if (!this.restorePromise) {
      this.restorePromise = this.fetchMe()
        .then(() => true)
        .catch(() => {
          this.clearSession();
          return false;
        })
        .finally(() => {
          this.restorePromise = null;
        });
    }

    return this.restorePromise;
  }

  async logout() {
    try {
      await this.http.post(`${environment.apiUrl}/auth/logout`, {}).toPromise();
    } catch {
      // ignore network failures on logout; we'll clear client state anyway
    } finally {
      this.clearSession();
    }
  }

  getToken(): string | null {
    const storage = this.getActiveStorage();
    return storage ? storage.getItem(this.tokenKey) : null;
  }

  private storeSession(token: string, user: User, remember: boolean) {
    const storage = remember ? localStorage : sessionStorage;
    const other = remember ? sessionStorage : localStorage;

    storage.setItem(this.tokenKey, token);
    storage.setItem(this.userKey, JSON.stringify(user));

    other.removeItem(this.tokenKey);
    other.removeItem(this.userKey);

    this.userSig.set(user);
  }

  private hydrateUserFromStorage() {
    const storage = this.getActiveStorage();
    if (!storage) return;

    const data = storage.getItem(this.userKey);
    if (!data) return;

    try {
      const user = JSON.parse(data) as User;
      this.userSig.set(user);
    } catch {
      storage.removeItem(this.userKey);
    }
  }

  private updateStoredUser(user: User) {
    const storage = this.getActiveStorage();
    if (!storage) return;

    try {
      storage.setItem(this.userKey, JSON.stringify(user));
    } catch {
      // ignore quota errors
    }
  }

  private getActiveStorage(): Storage | null {
    if (typeof window === 'undefined') return null;
    if (localStorage.getItem(this.tokenKey)) return localStorage;
    if (sessionStorage.getItem(this.tokenKey)) return sessionStorage;
    return null;
  }

  private clearSession() {
    localStorage.removeItem(this.tokenKey);
    sessionStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    sessionStorage.removeItem(this.userKey);
    this.userSig.set(null);
  }
}
