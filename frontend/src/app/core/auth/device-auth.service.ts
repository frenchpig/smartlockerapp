import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export type Ubicacion = {
  id: number;
  nombre: string;
  latitud: number;
  longitud: number;
};

type DeviceLoginDto = { username: string; password: string };

@Injectable({ providedIn: 'root' })
export class DeviceAuthService {
  private readonly tokenKey = 'device_token';
  private readonly ubicacionKey = 'device_ubicacion';
  private readonly ubicacionSig = signal<Ubicacion | null>(null);
  private restorePromise: Promise<boolean> | null = null;

  ubicacion = computed(() => this.ubicacionSig());
  isAuthenticated = computed(() => !!this.tokenSig());

  // Signal for token to track changes
  private tokenSig = signal<string | null>(null);

  constructor(private http: HttpClient) {
    this.hydrateUbicacionFromStorage();
    const token = this.getToken();
    if (token) {
      this.restoreSession().catch(() => this.clearSession());
    }
  }

  async login(dto: DeviceLoginDto) {
    const res = await this.http.post<{ token: string; ubicacion: Ubicacion }>(
      `${environment.apiUrl}/device/auth/login`,
      dto
    ).toPromise();

    if (!res) {
      throw new Error('No se recibió respuesta del servidor');
    }

    this.storeSession(res.token, res.ubicacion);
  }

  async fetchMe() {
    const me = await this.http.get<{ ubicacion: Ubicacion }>(`${environment.apiUrl}/totem/me`).toPromise();
    if (me) {
      this.ubicacionSig.set(me.ubicacion);
      this.updateStoredUbicacion(me.ubicacion);
    }
  }

  async restoreSession(): Promise<boolean> {
    if (this.ubicacionSig()) {
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
      await this.http.post(`${environment.apiUrl}/totem/logout`, {}).toPromise();
    } catch {
      // ignore network failures on logout; we'll clear client state anyway
    } finally {
      this.clearSession();
    }
  }

  getToken(): string | null {
    if (!this.tokenSig()) {
      const storage = this.getActiveStorage();
      if (storage) {
        const token = storage.getItem(this.tokenKey);
        if (token) {
          this.tokenSig.set(token);
        }
      }
    }
    return this.tokenSig();
  }

  getUbicacion(): Ubicacion | null {
    return this.ubicacionSig();
  }

  private storeSession(token: string, ubicacion: Ubicacion) {
    // Always use localStorage for device sessions
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.ubicacionKey, JSON.stringify(ubicacion));
    this.ubicacionSig.set(ubicacion);
    this.tokenSig.set(token);
  }

  private hydrateUbicacionFromStorage() {
    const storage = localStorage;
    const data = storage.getItem(this.ubicacionKey);
    if (!data) return;

    try {
      const ubicacion = JSON.parse(data) as Ubicacion;
      this.ubicacionSig.set(ubicacion);
    } catch {
      storage.removeItem(this.ubicacionKey);
    }
  }

  private updateStoredUbicacion(ubicacion: Ubicacion) {
    try {
      localStorage.setItem(this.ubicacionKey, JSON.stringify(ubicacion));
    } catch {
      // ignore quota errors
    }
  }

  private getActiveStorage(): Storage | null {
    if (typeof window === 'undefined') return null;
    return localStorage;
  }

  private clearSession() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.ubicacionKey);
    this.ubicacionSig.set(null);
    this.tokenSig.set(null);
  }
}

