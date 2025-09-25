import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-test-backend',
  standalone: false,
  templateUrl: './test-backend.html',
  styles: ``
})
export class TestBackend implements OnInit {
  status = 'Consultando backend...';
  error = '';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http
      .get<{ ok: boolean; time: string }>('http://127.0.0.1:8000/api/ping')
      .subscribe({
        next: (res) => {
          this.status = res.ok
            ? `Backend OK ✅ (${res.time})`
            : 'Backend respondió pero no ok ❌';
        },
        error: (err) => {
          console.error(err);
          this.status = 'Error al conectar con backend ❌';
          this.error = err.message || 'Error desconocido';
        }
      });
  }
}
